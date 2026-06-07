import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── In-memory fallback (sliding window) ─────────────────────────────────────
// Dùng khi Upstash không khả dụng — fail-closed thay vì fail-open
const _fallbackStore = new Map<string, number[]>();
const _FALLBACK_LIMIT = 20;
const _FALLBACK_WINDOW_MS = 60_000;

function _inMemoryCheck(identifier: string): boolean {
  const now = Date.now();
  const times = (_fallbackStore.get(identifier) ?? []).filter(t => now - t < _FALLBACK_WINDOW_MS);
  if (times.length >= _FALLBACK_LIMIT) return false;
  times.push(now);
  _fallbackStore.set(identifier, times);
  if (_fallbackStore.size > 10_000) {
    const firstKey = _fallbackStore.keys().next().value;
    if (firstKey !== undefined) _fallbackStore.delete(firstKey);
  }
  return true;
}

// ── Upstash limiter factory ──────────────────────────────────────────────────
function createRatelimiter(tokens: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window) });
}

// Giới hạn login: 10 lần/phút theo IP
export const loginRatelimit = createRatelimiter(10, "1 m");

// Giới hạn OTP gửi: 3 lần/5 phút theo email
export const otpRatelimit = createRatelimiter(3, "5 m");

// Giới hạn API chung: 100 lần/phút theo IP
export const apiRatelimit = createRatelimiter(100, "1 m");

// Giới hạn SSE ticker: 20 connections/phút theo IP
export const tickerRatelimit = createRatelimiter(20, "1 m");

// Giới hạn resend OTP: 3 lần/10 phút theo email
export const resendOtpEmailRatelimit = createRatelimiter(3, "10 m");

// Giới hạn resend OTP: 10 lần/10 phút theo IP
export const resendOtpIpRatelimit = createRatelimiter(10, "10 m");

// Giới hạn tạo đơn hàng: 5 lần/phút theo userId
export const orderRatelimit = createRatelimiter(5, "1 m");

// Giới hạn đăng ký seller: 3 lần/giờ theo userId
export const sellerRegisterRatelimit = createRatelimiter(3, "1 h");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: 999 };
  try {
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch {
    // Upstash không khả dụng → dùng in-memory fallback (fail-closed, không fail-open)
    const success = _inMemoryCheck(identifier);
    return { success, remaining: success ? _FALLBACK_LIMIT - 1 : 0 };
  }
}
