import { prisma } from "@/lib/db/prisma";
import { NotFoundError, AppError, InsufficientBalanceError } from "@/lib/errors";
import { KHUONGFB_SOURCE } from "./constants";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";
import { logger } from "@/lib/utils/logger";
import Decimal from "decimal.js";
import { randomBytes } from "crypto";

interface KhuongfbPurchaseParams {
  userId:            string;
  externalProductId: string;
  quantity:          number;
  idempotencyKey:    string;
  customerNote?:     string;
}

interface KhuongfbPurchaseResult {
  orderId:        string;
  orderCode:      string;
  externalOrderId: string;
  finalPrice:     number;
}

function generateOrderCode(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(2).toString("hex").toUpperCase();
  return `KFB-${ts}-${rnd}`;
}

export async function purchaseKhuongfbProduct(params: KhuongfbPurchaseParams): Promise<KhuongfbPurchaseResult> {
  const { userId, externalProductId, quantity, idempotencyKey, customerNote } = params;

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
    where: { id: externalProductId },
    select: { id: true, provider: true, name: true, salePrice: true, isEnabled: true, externalId: true },
  });
  if (!product)          throw new NotFoundError("Sản phẩm Khuongfb");
  if (!product.isEnabled) throw new AppError("Sản phẩm này hiện không khả dụng.", "PRODUCT_DISABLED", 400);

  const totalPrice = new Decimal(product.salePrice).mul(quantity);
  const orderCode  = generateOrderCode();

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
      data: {
        balance:    balanceAfter,
        totalSpent: newTotalSpent,
      },
    });

    const created = await tx.order.create({
      data: {
        orderCode,
        userId,
        orderType:         "KHUONGFB_PRODUCT",
        externalProductId: product.id,
        itemName:          product.name,
        originalPrice:     totalPrice,
        finalPrice:        totalPrice,
        customerNote:      customerNote ?? null,
        status:            "PROCESSING",
        externalSource:    KHUONGFB_SOURCE,
        idempotencyKey,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        orderId:       created.id,
        type:          "BUY_KHUONGFB_PRODUCT",
        amount:        totalPrice.neg(),
        description:   `Mua ${product.name} (x${quantity}) qua Khuongfb`,
        balanceBefore,
        balanceAfter,
      },
    });

    return created;
  });

  // ── BƯỚC 2: Gọi provider API để fulfill ──────────────────────────────────
  try {
    const adapters  = await loadEnabledAdapters();
    const adapter   = adapters.find(a => a.providerId === product.provider);
    if (!adapter) throw new AppError(`Provider "${product.provider}" không khả dụng`, "PROVIDER_NOT_FOUND", 502);

    const buyRes = await adapter.buyProduct(product.externalId, quantity);

    // Lưu trans_id + data từ provider + chuyển trạng thái DONE
    await prisma.order.update({
      where: { id: order.id },
      data:  {
        externalOrderId: buyRes.externalOrderId,
        status:          "DONE",
        completedAt:     new Date(),
        kfbData:         buyRes.data ?? undefined,
      },
    });

    return {
      orderId:         order.id,
      orderCode:       order.orderCode,
      externalOrderId: buyRes.externalOrderId,
      finalPrice:      totalPrice.toNumber(),
    };
  } catch (err) {
    // ── AUTO-REFUND: hoàn ví nếu Khuongfb lỗi ────────────────────────────
    logger.error({ err, orderId: order.id }, "Khuongfb fulfill thất bại — đang hoàn tiền");

    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance FROM users WHERE id = ${userId}::uuid FOR UPDATE
      `;
      const currentBalance = new Decimal(rows[0]?.balance ?? 0);
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
          description:   `Hoàn tiền đơn ${order.orderCode} — Khuongfb lỗi`,
          balanceBefore: currentBalance,
          balanceAfter:  refundedBalance,
        },
      });
    });

    const msg = err instanceof Error ? err.message : "Khuongfb không phản hồi";
    throw new AppError(`Đặt hàng thất bại, tiền đã được hoàn vào ví: ${msg}`, "KHUONGFB_FULFILL_ERROR", 502);
  }
}
