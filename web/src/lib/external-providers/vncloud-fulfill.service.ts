import { prisma } from "@/lib/db/prisma";
import { NotFoundError, AppError, InsufficientBalanceError } from "@/lib/errors";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";
import { logger } from "@/lib/utils/logger";
import { notifyPurchaseSuccess, notifyVpsRefund } from "@/lib/services/telegram-alert.service";
import { applyDiscount } from "@/lib/utils/discount";
import { getUserResourceDiscountPercent } from "@/lib/services/discount.service";
import { checkCouponEligibility, applyCouponDiscount, redeemCouponInTransaction, releaseCouponRedemption } from "@/lib/services/coupon.service";
import Decimal from "decimal.js";
import { randomBytes } from "crypto";

interface VpsRawProductData {
  pricing?: Record<string, { billing_cycle: string; amount: number }>;
}

interface VpsPurchaseParams {
  userId:            string;
  externalProductId: string;
  billingCycle:      string;
  os:                number;
  quantity:          number;
  idempotencyKey:    string;
  customerNote?:     string;
  couponCode?:       string;
}

interface VpsPurchaseResult {
  orderId:         string;
  orderCode:       string;
  externalOrderId: string;
  finalPrice:      number;
}

function generateOrderCode(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(2).toString("hex").toUpperCase();
  return `VPS-${ts}-${rnd}`;
}

export async function purchaseVpsProduct(params: VpsPurchaseParams): Promise<VpsPurchaseResult> {
  const { userId, externalProductId, billingCycle, os, quantity, idempotencyKey, customerNote, couponCode } = params;

  // Idempotency: trả đơn cũ nếu đã xử lý
  const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existingOrder) {
    return {
      orderId:         existingOrder.id,
      orderCode:       existingOrder.orderCode,
      externalOrderId: existingOrder.externalOrderId ?? "",
      finalPrice:      Number(existingOrder.finalPrice),
    };
  }

  const product = await prisma.externalProduct.findUnique({
    where:  { id: externalProductId },
    select: { id: true, provider: true, name: true, salePrice: true, originalPrice: true, isEnabled: true, externalId: true, rawData: true },
  });
  if (!product)          throw new NotFoundError("Sản phẩm VPS");
  if (!product.isEnabled) throw new AppError("Sản phẩm này hiện không khả dụng.", "PRODUCT_DISABLED", 400);

  const rawData      = product.rawData as unknown as VpsRawProductData | null;
  const cyclePricing = rawData?.pricing?.[billingCycle];
  if (!cyclePricing) throw new AppError("Chu kỳ thuê không hợp lệ cho sản phẩm này", "INVALID_BILLING_CYCLE", 400);

  // Giá bán = giá gốc VNCloud theo chu kỳ × tỉ lệ markup admin đã đặt (salePrice/originalPrice)
  const originalPriceNum = Number(product.originalPrice);
  const salePriceNum     = Number(product.salePrice);
  const markupRatio      = originalPriceNum > 0 ? salePriceNum / originalPriceNum : 1;
  const catalogUnitPrice = Math.round(cyclePricing.amount * markupRatio);

  const discountPct    = await getUserResourceDiscountPercent(userId);
  const finalUnitPrice = applyDiscount(catalogUnitPrice, discountPct);

  const catalogTotal = new Decimal(catalogUnitPrice).mul(quantity);
  const tierDiscountedTotal = new Decimal(finalUnitPrice).mul(quantity);

  // Mã giảm giá áp trên tổng đơn — giảm thêm trên giá đã có tier/agent discount.
  let totalPrice = tierDiscountedTotal;
  let coupon: { id: string; maxUses: number } | undefined;
  if (couponCode) {
    const eligible = await checkCouponEligibility({
      code: couponCode,
      userId,
      orderType: "VPS_PRODUCT",
      productId: externalProductId,
      orderValue: tierDiscountedTotal.toNumber(),
    });
    coupon = { id: eligible.id, maxUses: eligible.maxUses };
    totalPrice = new Decimal(applyCouponDiscount(tierDiscountedTotal.toNumber(), eligible));
  }

  const orderCode = generateOrderCode();

  // ── BƯỚC 1: Trừ ví + tạo order trong transaction ─────────────────────────
  const order = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new NotFoundError("User");

    const balanceBefore = new Decimal(row.balance);
    if (balanceBefore.lt(totalPrice)) {
      throw new InsufficientBalanceError(balanceBefore.toNumber(), totalPrice.toNumber());
    }

    const balanceAfter  = balanceBefore.sub(totalPrice);
    const newTotalSpent = new Decimal(row.total_spent).add(totalPrice);

    await tx.user.update({
      where: { id: userId },
      data:  { balance: balanceAfter, totalSpent: newTotalSpent },
    });

    const created = await tx.order.create({
      data: {
        orderCode,
        userId,
        orderType:         "VPS_PRODUCT",
        externalProductId: product.id,
        itemName:          `${product.name} (${cyclePricing.billing_cycle})`,
        originalPrice:     catalogTotal,
        finalPrice:        totalPrice,
        customerNote:      customerNote ?? null,
        status:            "PROCESSING",
        externalSource:    product.provider,
        idempotencyKey,
        ...(coupon ? { couponId: coupon.id } : {}),
      },
    });

    if (coupon) {
      await redeemCouponInTransaction(tx, { couponId: coupon.id, maxUses: coupon.maxUses, userId, orderId: created.id });
    }

    await tx.transaction.create({
      data: {
        userId,
        orderId:       created.id,
        type:          "BUY_VPS_PRODUCT",
        amount:        totalPrice.neg(),
        description:   discountPct > 0
          ? `Mua VPS ${product.name} (x${quantity}, giảm ${discountPct}%)`
          : `Mua VPS ${product.name} (x${quantity})`,
        balanceBefore,
        balanceAfter,
      },
    });

    return created;
  });

  // ── BƯỚC 2: Gọi VNCloud API để tạo VPS ────────────────────────────────────
  try {
    const adapters = await loadEnabledAdapters();
    const adapter  = adapters.find(a => a.providerId === product.provider);
    if (!adapter) throw new AppError(`Provider "${product.provider}" không khả dụng`, "PROVIDER_NOT_FOUND", 502);

    const buyRes = await adapter.buyProduct(product.externalId, quantity, { billingCycle, os });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        externalOrderId: buyRes.externalOrderId,
        status:          "DONE",
        completedAt:     new Date(),
        kfbData:         buyRes.data ?? undefined,
      },
    });

    notifyPurchaseSuccess(userId, `${product.name} (x${quantity})`, totalPrice.toFixed(0), order.orderCode, { kind: "VPS" });

    return {
      orderId:         order.id,
      orderCode:       order.orderCode,
      externalOrderId: buyRes.externalOrderId,
      finalPrice:      totalPrice.toNumber(),
    };
  } catch (err) {
    // ── AUTO-REFUND: hoàn ví nếu VNCloud lỗi ─────────────────────────────
    logger.error({ err, orderId: order.id }, "VNCloud fulfill thất bại — đang hoàn tiền");

    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance FROM users WHERE id = ${userId}::uuid FOR UPDATE
      `;
      const currentBalance  = new Decimal(rows[0]?.balance ?? 0);
      const refundedBalance = currentBalance.add(totalPrice);

      await tx.user.update({
        where: { id: userId },
        data:  { balance: refundedBalance, totalSpent: { decrement: totalPrice } },
      });

      await tx.order.update({
        where: { id: order.id },
        data:  { status: "REFUNDED" },
      });

      await tx.transaction.create({
        data: {
          userId,
          orderId:       order.id,
          type:          "REFUND",
          amount:        totalPrice,
          description:   `Hoàn tiền đơn ${order.orderCode} — VNCloud lỗi`,
          balanceBefore: currentBalance,
          balanceAfter:  refundedBalance,
        },
      });

      // Đơn bị hoàn tiền → không tính là đã dùng coupon, trả lại lượt cho user
      if (coupon) {
        await releaseCouponRedemption(tx, order.id);
      }
    });

    const msg = err instanceof Error ? err.message : "VNCloud không phản hồi";
    notifyVpsRefund(userId, `${product.name} (x${quantity})`, totalPrice.toFixed(0), order.orderCode, msg);

    throw new AppError(`Đặt hàng thất bại, tiền đã được hoàn vào ví: ${msg}`, "VPS_FULFILL_ERROR", 502);
  }
}
