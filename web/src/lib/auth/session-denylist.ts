import { redis } from "@/lib/db/redis";

const KEY = (jti: string) => `session:denied:${jti}`;

// Add a session JTI to the denylist with an expiry matching the token lifetime.
// Called on logout so stolen cookies are rejected within the next check window.
export async function denySession(jti: string, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(KEY(jti), ttlSeconds, "1");
  } catch {
    // fail-open — if Redis is down logout still clears the cookie
  }
}

export async function isSessionDenied(jti: string): Promise<boolean> {
  if (!redis) return false;
  try {
    return (await redis.get(KEY(jti))) === "1";
  } catch {
    return false; // fail-open
  }
}
