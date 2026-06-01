import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function formatVND(amount: number | string | Decimal): string {
  const num = new Decimal(amount).toNumber();
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export function addFee(amount: Decimal, feePercent: number): Decimal {
  return amount.mul(new Decimal(feePercent).div(100)).toDecimalPlaces(2);
}
