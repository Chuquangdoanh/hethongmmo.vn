import Decimal from "decimal.js";

/**
 * Tier tự động theo totalDeposited (VND):
 *   < 15.000.000   → 0%
 *   15M – 49M      → 5%   (Thẻ)
 *   50M – 99M      → 10%  (Silver)
 *   ≥ 100M         → 15%  (Gold)
 *
 * Admin override: nếu discountPercent > 0 thì dùng giá trị đó thay vì tier.
 */
export const DISCOUNT_TIERS = [
  { minDeposit: 100_000_000, pct: 15, label: "Gold" },
  { minDeposit:  50_000_000, pct: 10, label: "Silver" },
  { minDeposit:  15_000_000, pct: 5,  label: "Thẻ" },
] as const;

export interface DiscountInfo {
  pct: number;        // % giảm giá thực áp dụng
  label: string;      // tên tier hoặc "Admin"
  isOverride: boolean; // true = admin đặt tay
}

export function getDiscountInfo(
  totalDeposited: number,
  discountPercent: number, // từ User.discountPercent
): DiscountInfo {
  if (discountPercent > 0) {
    return { pct: discountPercent, label: "Admin", isOverride: true };
  }
  for (const tier of DISCOUNT_TIERS) {
    if (totalDeposited >= tier.minDeposit) {
      return { pct: tier.pct, label: tier.label, isOverride: false };
    }
  }
  return { pct: 0, label: "Thường", isOverride: false };
}

/**
 * Discount riêng cho Tài nguyên MMO / Kho nguyên liệu / Khương FB.
 * agentDiscountPercent (Đại lý) > 0 → luôn ưu tiên, không phụ thuộc totalDeposited.
 * Ngược lại fallback về đúng logic tier/override của getDiscountInfo (Service/Course/TutTrick).
 */
export function getResourceDiscountInfo(
  totalDeposited: number,
  discountPercent: number,   // từ User.discountPercent
  agentDiscountPercent: number, // từ User.agentDiscountPercent
): DiscountInfo {
  if (agentDiscountPercent > 0) {
    return { pct: agentDiscountPercent, label: "Đại lý", isOverride: true };
  }
  return getDiscountInfo(totalDeposited, discountPercent);
}

/**
 * Discount riêng cho sản phẩm Seller — sellerDiscountPercent > 0 → % cố định, admin gán tay.
 * Không có tier tự động (khác Service/Course/TutTrick và Tài nguyên MMO/Khương FB).
 */
export function getSellerDiscountInfo(sellerDiscountPercent: number): DiscountInfo {
  if (sellerDiscountPercent > 0) {
    return { pct: sellerDiscountPercent, label: "Seller Discount", isOverride: true };
  }
  return { pct: 0, label: "Thường", isOverride: false };
}

/** Tính giá sau giảm — làm tròn đến VND (không có số lẻ). */
export function applyDiscount(catalogPrice: number, pct: number): number {
  if (pct <= 0) return catalogPrice;
  const discounted = new Decimal(catalogPrice).mul(1 - pct / 100);
  return discounted.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}
