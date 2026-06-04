import Decimal from "decimal.js";

/**
 * Tier tự động theo totalDeposited (VND):
 *   < 50.000.000   → 0%
 *   50M – 99M      → 5%   (Thẻ)
 *   100M – 199M    → 7%   (Silver)
 *   ≥ 200M         → 10%  (Gold)
 *
 * Admin override: nếu discountPercent > 0 thì dùng giá trị đó thay vì tier.
 */
export const DISCOUNT_TIERS = [
  { minDeposit: 200_000_000, pct: 10, label: "Gold" },
  { minDeposit: 100_000_000, pct: 7,  label: "Silver" },
  { minDeposit:  50_000_000, pct: 5,  label: "Thẻ" },
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

/** Tính giá sau giảm — làm tròn đến VND (không có số lẻ). */
export function applyDiscount(catalogPrice: number, pct: number): number {
  if (pct <= 0) return catalogPrice;
  const discounted = new Decimal(catalogPrice).mul(1 - pct / 100);
  return discounted.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}
