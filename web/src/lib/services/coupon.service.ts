import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { AppError, NotFoundError, ValidationError, DuplicateError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/security/audit";
import { DISCOUNT_TIERS } from "@/lib/utils/discount";
import type { CreateCouponInput, UpdateCouponInput, CouponProductType } from "@/lib/validation/coupon.schema";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const TIER_RANK: Record<string, number> = { "Thường": 0, "Thẻ": 1, "Silver": 2, "Gold": 3 };

function getUserTierLabel(totalDeposited: number): string {
  for (const tier of DISCOUNT_TIERS) {
    if (totalDeposited >= tier.minDeposit) return tier.label;
  }
  return "Thường";
}

export interface EligibleCoupon {
  id: string;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxUses: number;
}

export interface CouponEligibilityParams {
  code: string;
  userId: string;
  orderType: CouponProductType;
  productId: string;
  /** Giá trị đơn hàng sau khi đã áp tier/agent discount — coupon giảm thêm trên giá này. */
  orderValue: number;
}

/**
 * Kiểm tra coupon hợp lệ, KHÔNG mutate DB — dùng cho preview lẫn bước đầu của checkout thật.
 * Bước tiêu thụ (trừ lượt + chặn dùng lại) luôn nằm trong transaction ở redeemCouponInTransaction.
 */
export async function checkCouponEligibility(params: CouponEligibilityParams): Promise<EligibleCoupon> {
  const { code, userId, orderType, productId, orderValue } = params;

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || coupon.deletedAt) throw new NotFoundError("Mã giảm giá");
  if (!coupon.isActive) throw new AppError("Mã giảm giá đã bị tắt", "COUPON_INACTIVE", 400);

  const now = new Date();
  if (now < coupon.startAt) throw new AppError("Mã giảm giá chưa đến thời gian sử dụng", "COUPON_NOT_STARTED", 400);
  if (now > coupon.endAt) throw new AppError("Mã giảm giá đã hết hạn", "COUPON_EXPIRED", 400);
  if (coupon.usedCount >= coupon.maxUses) throw new AppError("Mã giảm giá đã hết lượt sử dụng", "COUPON_EXHAUSTED", 409);

  if (coupon.minOrderValue && orderValue < Number(coupon.minOrderValue)) {
    throw new AppError(
      `Đơn hàng phải từ ${Number(coupon.minOrderValue).toLocaleString("vi-VN")}đ để dùng mã này`,
      "COUPON_MIN_ORDER_NOT_MET",
      400,
    );
  }

  const scoped = await prisma.couponProduct.findFirst({
    where: { couponId: coupon.id, productType: orderType, productId },
  });
  if (!scoped) throw new AppError("Mã giảm giá không áp dụng cho sản phẩm này", "COUPON_PRODUCT_NOT_APPLICABLE", 400);

  if (coupon.newUserOnly) {
    const hasOrder = await prisma.order.findFirst({ where: { userId }, select: { id: true } });
    if (hasOrder) throw new AppError("Mã giảm giá chỉ áp dụng cho khách hàng mới", "COUPON_NEW_USER_ONLY", 400);
  }

  if (coupon.minTierLabel) {
    const userRow = await prisma.user.findUnique({ where: { id: userId }, select: { totalDeposited: true } });
    const userTier = getUserTierLabel(Number(userRow?.totalDeposited ?? 0));
    if ((TIER_RANK[userTier] ?? 0) < (TIER_RANK[coupon.minTierLabel] ?? 0)) {
      throw new AppError(`Mã giảm giá chỉ áp dụng cho hạng ${coupon.minTierLabel} trở lên`, "COUPON_TIER_NOT_MET", 400);
    }
  }

  const alreadyUsed = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (alreadyUsed) throw new AppError("Bạn đã sử dụng mã giảm giá này rồi", "COUPON_ALREADY_USED", 409);

  return {
    id: coupon.id,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    maxUses: coupon.maxUses,
  };
}

/** Giá sau khi áp coupon — làm tròn VNĐ, không âm. */
export function applyCouponDiscount(price: number, coupon: EligibleCoupon): number {
  if (coupon.discountType === "PERCENT") {
    return new Decimal(price)
      .mul(1 - coupon.discountValue / 100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
  }
  return Decimal.max(0, new Decimal(price).sub(coupon.discountValue))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Tiêu thụ 1 lượt coupon — PHẢI gọi bên trong transaction đang trừ ví/tạo order.
 * updateMany với điều kiện usedCount < maxUses chặn race condition vượt quá số lượng;
 * unique constraint (couponId, userId) chặn 1 user dùng > 1 lần dù request đồng thời.
 */
export async function redeemCouponInTransaction(
  tx: TxClient,
  params: { couponId: string; maxUses: number; userId: string; orderId: string },
): Promise<void> {
  const { couponId, maxUses, userId, orderId } = params;

  const consumed = await tx.coupon.updateMany({
    where: { id: couponId, usedCount: { lt: maxUses } },
    data: { usedCount: { increment: 1 } },
  });
  if (consumed.count !== 1) {
    throw new AppError("Mã giảm giá đã hết lượt sử dụng", "COUPON_EXHAUSTED", 409);
  }

  try {
    await tx.couponRedemption.create({ data: { couponId, userId, orderId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("Bạn đã sử dụng mã giảm giá này rồi", "COUPON_ALREADY_USED", 409);
    }
    throw err;
  }
}

/** Hoàn lại lượt dùng coupon khi đơn hàng bị hoàn tiền (VD: Khuongfb fulfill lỗi). */
export async function releaseCouponRedemption(tx: TxClient, orderId: string): Promise<void> {
  const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (!redemption) return;

  await tx.couponRedemption.delete({ where: { id: redemption.id } });
  await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
}

// ── Admin CRUD ─────────────────────────────────────────────────────────────

export async function listCoupons(params: { page: number; limit: number }) {
  const { page, limit } = params;
  const where = { deletedAt: null };

  const [data, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, code: true, name: true, discountType: true, discountValue: true,
        maxUses: true, usedCount: true, startAt: true, endAt: true, isActive: true, createdAt: true,
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  return { data, total };
}

export async function getCouponDetail(id: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: { products: true, _count: { select: { redemptions: true } } },
  });
  if (!coupon || coupon.deletedAt) throw new NotFoundError("Mã giảm giá");
  return coupon;
}

export async function createCoupon(input: CreateCouponInput, actorId: string) {
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new DuplicateError("Mã giảm giá", input.code);

  const coupon = await prisma.$transaction(async (tx) => {
    const created = await tx.coupon.create({
      data: {
        code: input.code,
        name: input.name,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUses: input.maxUses,
        minOrderValue: input.minOrderValue ?? null,
        minTierLabel: input.minTierLabel ?? null,
        newUserOnly: input.newUserOnly,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        isActive: input.isActive,
        createdBy: actorId,
      },
    });

    await tx.couponProduct.createMany({
      data: input.products.map((p) => ({ couponId: created.id, productType: p.productType, productId: p.productId })),
    });

    return created;
  });

  await writeAuditLog({
    actorId,
    action: "CREATE_COUPON",
    targetType: "Coupon",
    targetId: coupon.id,
    after: { code: coupon.code, name: coupon.name, maxUses: coupon.maxUses },
  });

  return coupon;
}

export async function updateCoupon(id: string, input: UpdateCouponInput, actorId: string) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError("Mã giảm giá");

  const effectiveStart = input.startAt ? new Date(input.startAt) : existing.startAt;
  const effectiveEnd = input.endAt ? new Date(input.endAt) : existing.endAt;
  if (effectiveEnd <= effectiveStart) {
    throw new ValidationError("Thời gian kết thúc phải sau thời gian bắt đầu");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.coupon.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.discountType !== undefined && { discountType: input.discountType }),
        ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
        ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
        ...(input.minOrderValue !== undefined && { minOrderValue: input.minOrderValue }),
        ...(input.minTierLabel !== undefined && { minTierLabel: input.minTierLabel }),
        ...(input.newUserOnly !== undefined && { newUserOnly: input.newUserOnly }),
        ...(input.startAt !== undefined && { startAt: effectiveStart }),
        ...(input.endAt !== undefined && { endAt: effectiveEnd }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    if (input.products) {
      await tx.couponProduct.deleteMany({ where: { couponId: id } });
      await tx.couponProduct.createMany({
        data: input.products.map((p) => ({ couponId: id, productType: p.productType, productId: p.productId })),
      });
    }

    return result;
  });

  await writeAuditLog({
    actorId,
    action: "UPDATE_COUPON",
    targetType: "Coupon",
    targetId: id,
    before: { isActive: existing.isActive, maxUses: existing.maxUses },
    after: { isActive: updated.isActive, maxUses: updated.maxUses },
  });

  return updated;
}

export async function deleteCoupon(id: string, actorId: string): Promise<void> {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError("Mã giảm giá");

  await prisma.coupon.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await writeAuditLog({
    actorId,
    action: "DELETE_COUPON",
    targetType: "Coupon",
    targetId: id,
    before: { code: existing.code },
  });
}
