import { redis } from "@/lib/db/redis";
import { generateSecureToken } from "@/lib/auth/password";

const KEY = (email: string) => `post-register-token:${email}`;
const TTL_SECONDS = 60;

// Token dùng 1 lần, sống 60s, chứng minh email vừa vượt qua OTP đăng ký thành công —
// dùng để bỏ qua bước captcha ở lần đăng nhập tự động ngay sau đó (captcha đã được
// xác minh ở bước /api/auth/register rồi, không cần bắt user xác minh lại).
export async function createPostRegisterToken(email: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const token = generateSecureToken(24);
    await redis.setex(KEY(email), TTL_SECONDS, token);
    return token;
  } catch {
    return null; // fail-open — auto-login sẽ không chạy, user vẫn tự đăng nhập bình thường
  }
}

export async function consumePostRegisterToken(email: string, token: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const stored = await redis.get<string>(KEY(email));
    if (!stored || stored !== token) return false;
    await redis.del(KEY(email));
    return true;
  } catch {
    return false;
  }
}
