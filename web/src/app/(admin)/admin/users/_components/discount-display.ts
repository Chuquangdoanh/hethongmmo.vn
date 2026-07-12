export interface DiscountDisplay {
  pct: number;
  label: string;
  isOverride: boolean;
}

export function getDiscountDisplay(totalDeposited: number, discountPercent: number): DiscountDisplay {
  if (discountPercent > 0) return { pct: discountPercent, label: "Override", isOverride: true };
  if (totalDeposited >= 200_000_000) return { pct: 10, label: "Gold",   isOverride: false };
  if (totalDeposited >= 100_000_000) return { pct: 7,  label: "Silver", isOverride: false };
  if (totalDeposited >= 50_000_000)  return { pct: 5,  label: "Thẻ",    isOverride: false };
  return { pct: 0, label: "Thường", isOverride: false };
}
