/** Formats a number as Vietnamese Dong: 500,000 → "500.000 ₫" */
export function formatVnd(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 ₫";
  // Avoid Intl currency style: symbol placement (before/after) and spacing
  // differ between Node.js ICU builds and browsers, causing hydration mismatch.
  const rounded = Math.round(num);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted + " ₫";
}

/** Formats a Date as Vietnamese locale: "28/05/2026, 14:30" */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Masks a phone number: "0393118789" → "0393***789" */
export function formatPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 4) + "***" + phone.slice(-3);
}
