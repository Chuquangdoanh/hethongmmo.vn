import { z } from "zod";

// Sản phẩm áp dụng coupon chỉ giới hạn (Kho tài nguyên / Tài nguyên MMO / Khương FB / VPS),
// dùng lại OrderType nhưng ràng buộc riêng ở đây để tránh coupon gắn nhầm SERVICE/COURSE/TUTTRICK.
export const COUPON_PRODUCT_TYPES = ["SELLER_PRODUCT", "MMO_PRODUCT", "KHUONGFB_PRODUCT", "VPS_PRODUCT"] as const;
export type CouponProductType = (typeof COUPON_PRODUCT_TYPES)[number];

export const couponProductRefSchema = z.object({
  productType: z.enum(COUPON_PRODUCT_TYPES),
  productId: z.string().uuid(),
});

const couponBaseSchema = z.object({
  code: z.string().min(3).max(50).trim().toUpperCase(),
  name: z.string().min(1).max(200).trim(),
  discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive(),
  minOrderValue: z.number().nonnegative().optional(),
  minTierLabel: z.enum(["Thẻ", "Silver", "Gold"]).optional(),
  newUserOnly: z.boolean().default(false),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isActive: z.boolean().default(true),
  products: z.array(couponProductRefSchema).min(1, "Chọn ít nhất 1 sản phẩm áp dụng"),
});

export const createCouponSchema = couponBaseSchema.refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "Thời gian kết thúc phải sau thời gian bắt đầu", path: ["endAt"] },
).refine(
  (data) => data.discountType !== "PERCENT" || data.discountValue <= 100,
  { message: "Giảm theo % không được vượt quá 100", path: ["discountValue"] },
);

export const updateCouponSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]).optional(),
  discountValue: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  minOrderValue: z.number().nonnegative().nullable().optional(),
  minTierLabel: z.enum(["Thẻ", "Silver", "Gold"]).nullable().optional(),
  newUserOnly: z.boolean().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  products: z.array(couponProductRefSchema).min(1).optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(3).max(50).trim().toUpperCase(),
  orderType: z.enum(COUPON_PRODUCT_TYPES),
  productId: z.string().uuid(),
  // Giá trị đơn hàng sau khi đã áp tier/agent discount (client tự tính để preview — server sẽ tính lại chính xác khi checkout thật).
  orderValue: z.number().nonnegative(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
