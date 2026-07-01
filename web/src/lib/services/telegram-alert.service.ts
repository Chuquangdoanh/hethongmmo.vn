// Fire-and-forget: gọi sendTelegramAlert() không block response

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
