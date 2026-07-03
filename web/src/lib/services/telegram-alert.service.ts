// Fire-and-forget: các hàm dưới đây không block luồng nghiệp vụ chính

import { prisma } from "@/lib/db/prisma";

/**
 * Gửi tin nhắn HTML tới Telegram (dùng chung bot/chat đã cấu hình cho rate-alert).
 * Tự bỏ qua nếu thiếu env — không throw, không log để tránh noise.
 */
export function sendTelegramAlert(text: string, chatId?: string): void {
  void _send(text, chatId);
}

async function _send(text: string, chatIdOverride?: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // chatIdOverride cho phép gửi tới nhóm riêng (vd: nhóm đơn hàng); rỗng → dùng chat mặc định
    const chatId   = chatIdOverride || process.env.TELEGRAM_ALERT_CHAT_ID;
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

/** Nguồn của đơn hàng — nơi user mua. */
export type OrderSource =
  | { kind: "SYSTEM" }                       // Hệ Thống MMO (service/course/tuttrick/mmo)
  | { kind: "SELLER"; sellerId?: string }    // Nhà bán hàng — kèm tên/email seller
  | { kind: "KHUONGFB" };                    // KhuongFB

/** Trả về dòng "Nguồn" cho tin đơn hàng theo nơi mua. */
async function _getSourceLine(source: OrderSource): Promise<string> {
  if (source.kind === "KHUONGFB") return `🌐 Nguồn: KhuongFB`;
  if (source.kind === "SYSTEM")   return `🏢 Nguồn: Hệ Thống MMO`;

  // SELLER — hiển thị tên + email nhà bán hàng
  const sellerLabel = source.sellerId ? await _getUserLabel(source.sellerId) : "Không rõ";
  return `🏪 Nhà bán hàng: ${sellerLabel}`;
}

/** Gửi cảnh báo mua hàng thành công — fire-and-forget, áp dụng cho mọi user. */
export function notifyPurchaseSuccess(
  userId: string,
  itemName: string,
  amount: string,
  orderCode: string,
  source: OrderSource,
): void {
  void (async () => {
    const [label, sourceLine] = await Promise.all([
      _getUserLabel(userId),
      _getSourceLine(source),
    ]);
    sendTelegramAlert(
      [
        `🛒 <b>Đơn hàng mới</b>`,
        ``,
        `👤 User: ${label}`,
        sourceLine,
        `📦 Sản phẩm: ${escTelegramHtml(itemName)}`,
        `💵 Số tiền: <b>${amount}đ</b>`,
        `🔖 Mã đơn: <code>${escTelegramHtml(orderCode)}</code>`,
      ].join("\n"),
      // Đơn hàng mới → gửi vào nhóm riêng nếu có cấu hình; nếu không, về chat mặc định
      process.env.TELEGRAM_ORDER_CHAT_ID,
    );
  })();
}

// ── Thông báo đơn hàng mới cho SELLER (bot riêng, gửi tới chat_id của từng seller) ──

/**
 * Gửi tin HTML tới 1 chat_id cụ thể qua BOT SELLER (token riêng).
 * Tự bỏ qua nếu thiếu env hoặc chưa có chat_id — không throw để không block luồng bán hàng.
 */
export async function sendSellerTelegram(chatId: string, text: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_SELLER_BOT_TOKEN;
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

/**
 * Báo cho seller khi có đơn SELLER_PRODUCT mới — fire-and-forget.
 * Chỉ gửi nếu seller đã kết nối Telegram (có sellerTelegramChatId).
 */
export function notifySellerNewOrder(
  sellerId: string,
  itemName: string,
  amount: string,
  orderCode: string,
): void {
  void (async () => {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { sellerTelegramChatId: true },
    });
    const chatId = seller?.sellerTelegramChatId;
    if (!chatId) return;

    await sendSellerTelegram(
      chatId,
      [
        `🎉 <b>Bạn có đơn hàng mới!</b>`,
        ``,
        `📦 Sản phẩm: ${escTelegramHtml(itemName)}`,
        `💵 Số tiền: <b>${amount}đ</b>`,
        `🔖 Mã đơn: <code>${escTelegramHtml(orderCode)}</code>`,
        ``,
        `Đăng nhập gian hàng để xử lý đơn nhé.`,
      ].join("\n"),
    );
  })();
}
