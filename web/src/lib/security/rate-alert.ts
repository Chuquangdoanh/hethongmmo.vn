// Edge + Node compatible — chỉ dùng fetch, không có Node.js API
// Fire-and-forget: gọi trackRateHit() không block response

const THRESHOLD = 5;    // số lần hit trong 1 phút trước khi alert
const COOLDOWN_S = 300; // 5 phút giữa các alert cho cùng 1 key

/**
 * Tăng counter rate limit hit trên Upstash.
 * Khi đạt THRESHOLD VÀ chưa gửi alert trong COOLDOWN → gửi Telegram.
 * Dùng SET NX để đảm bảo chỉ 1 alert được gửi dù nhiều request đồng thời.
 */
export function trackRateHit(tier: string, key: string, endpoint: string): void {
  void _track(tier, key, endpoint);
}

async function _track(tier: string, key: string, endpoint: string): Promise<void> {
  try {
    const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const botToken   = process.env.TELEGRAM_BOT_TOKEN;
    const chatId     = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (!redisUrl || !redisToken || !botToken || !chatId) return;

    const countKey = `rl_hits:${tier}:${key}`;
    const sentKey  = `rl_sent:${tier}:${key}`;

    // Atomic pipeline:
    //   1. INCR  countKey          — tăng counter (TTL 60s)
    //   2. EXPIRE countKey 60      — reset TTL mỗi lần hit
    //   3. SET sentKey 1 NX EX 300 — set cooldown nếu chưa có ("OK" = vừa set, null = đã có)
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", countKey],
        ["EXPIRE", countKey, 60],
        ["SET", sentKey, "1", "NX", "EX", COOLDOWN_S],
      ]),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) return;

    const data = (await res.json()) as Array<{ result: unknown }>;
    const count    = data[0]?.result as number;
    const justSet  = data[2]?.result === "OK"; // SET NX → "OK" = alert chưa gửi

    if (count >= THRESHOLD && justSet) {
      await _sendTelegram(botToken, chatId, tier, key, endpoint, count);
    }
  } catch {
    // silent — không crash request, không log để tránh noise
  }
}

async function _sendTelegram(
  botToken: string,
  chatId: string,
  tier: string,
  key: string,
  endpoint: string,
  count: number,
): Promise<void> {
  const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  // Dùng HTML parse mode — không cần escape ký tự đặc biệt như MarkdownV2
  const text = [
    `🚨 <b>Rate Limit Spam</b> — hethongmmo.vn`,
    ``,
    `🔒 Tier: <code>${escHtml(tier)}</code>`,
    `🔑 Key: <code>${escHtml(key)}</code>`,
    `📍 Endpoint: <code>${escHtml(endpoint)}</code>`,
    `💥 <b>${count} lần trong 1 phút</b>`,
    `🕐 ${time}`,
    ``,
    `<i>Alert tắt trong 5 phút tiếp theo cho key này.</i>`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    signal: AbortSignal.timeout(3000),
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
