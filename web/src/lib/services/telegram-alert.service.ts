// Fire-and-forget: các hàm dưới đây không block luồng nghiệp vụ chính

import { prisma } from "@/lib/db/prisma";

/**
 * Gửi tin nhắn HTML tới Telegram (dùng chung bot/chat đã cấu hình cho rate-alert).
 * Tự bỏ qua nếu thiếu env — không throw, không log để tránh noise.
 */
export function sendTelegramAlert(text: string): void {
  void _send(text);
}

async function _send(text: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (!botToken || !chatId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // silent — không crash luồng nghiệp vụ chính
  }
}

export function escTelegramHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Lấy nhãn user "Họ tên (email)" cho tin nhắn; fallback về id nếu không tìm thấy. */
async function _getUserLabel(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true },
  });
  if (!user) return escTelegramHtml(userId);
  return `${escTelegramHtml(user.fullName)} (${escTelegramHtml(user.email)})`;
}

/** Gửi cảnh báo nạp tiền thành công — fire-and-forget, áp dụng cho mọi user. */
export function notifyDepositSuccess(
  userId: string,
  amount: string,
  description: string,
): void {
  void (async () => {
    const label = await _getUserLabel(userId);
    sendTelegramAlert(
      [
        `💰 <b>Nạp tiền thành công</b>`,
        ``,
        `👤 User: ${label}`,
        `💵 Số tiền: <b>${amount}đ</b>`,
        `📝 ${escTelegramHtml(description)}`,
      ].join("\n"),
    );
  })();
}

/** Gửi cảnh báo seller nâng cấp gói slot sản phẩm — fire-and-forget. */
export function notifySellerSlotUpgrade(
  userId: string,
  previousSlots: number,
  newSlots: number,
  price: string,
): void {
  void (async () => {
    const label = await _getUserLabel(userId);
    sendTelegramAlert(
      [
        `⬆️ <b>Seller nâng cấp gói slot</b>`,
        ``,
        `👤 Seller: ${label}`,
        `📦 Slot: <b>${previousSlots} → ${newSlots}</b> sản phẩm`,
        `💵 Số tiền: <b>${price}đ</b>`,
      ].join("\n"),
    );
  })();
}

/** Gửi cảnh báo mua KhuongFB lỗi + đã hoàn tiền — fire-and-forget, để admin biết provider trục trặc. */
export function notifyKhuongfbRefund(
  userId: string,
  itemName: string,
  amount: string,
  orderCode: string,
  errorMsg: string,
): void {
  void (async () => {
    const label = await _getUserLabel(userId);
    sendTelegramAlert(
      [
        `⚠️ <b>KhuongFB lỗi — đã hoàn tiền</b>`,
        ``,
        `👤 User: ${label}`,
        `📦 Sản phẩm: ${escTelegramHtml(itemName)}`,
        `💵 Đã hoàn: <b>${amount}đ</b>`,
        `🔖 Mã đơn: <code>${escTelegramHtml(orderCode)}</code>`,
        `❌ Lỗi: ${escTelegramHtml(errorMsg)}`,
      ].join("\n"),
    );
  })();
}

/** Gửi cảnh báo mua hàng thành công — fire-and-forget, áp dụng cho mọi user. */
export function notifyPurchaseSuccess(
  userId: string,
  itemName: string,
  amount: string,
  orderCode: string,
): void {
  void (async () => {
    const label = await _getUserLabel(userId);
    sendTelegramAlert(
      [
        `🛒 <b>Mua hàng thành công</b>`,
        ``,
        `👤 User: ${label}`,
        `📦 Sản phẩm: ${escTelegramHtml(itemName)}`,
        `💵 Số tiền: <b>${amount}đ</b>`,
        `🔖 Mã đơn: <code>${escTelegramHtml(orderCode)}</code>`,
      ].join("\n"),
    );
  })();
}
