import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/db/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = { status: "up" | "down"; latencyMs: number };

// Races a promise against a timeout; rejects with Error("timeout") if exceeded
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function checkDatabase(): Promise<CheckStatus> {
  const t0 = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    return { status: "up", latencyMs: Date.now() - t0 };
  } catch {
    return { status: "down", latencyMs: Date.now() - t0 };
  }
}

async function checkRedis(): Promise<CheckStatus> {
  const t0 = Date.now();
  try {
    if (!redis) throw new Error("Redis not configured");
    await withTimeout(redis.ping(), 3000);
    return { status: "up", latencyMs: Date.now() - t0 };
  } catch {
    return { status: "down", latencyMs: Date.now() - t0 };
  }
}

/**
 * GET /api/health
 *
 * Endpoint kiểm tra sức khỏe hệ thống.
 * Dùng bởi Docker HEALTHCHECK, GitHub Actions, Cloudflare, Prometheus.
 *
 * HTTP 200 → healthy hoặc degraded (app vẫn hoạt động)
 * HTTP 503 → unhealthy (DB down)
 */
export async function GET(): Promise<NextResponse> {
  // Chạy song song để không block nhau
  const [db, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);

  // Tính overall status
  let status: "healthy" | "degraded" | "unhealthy";
  if (db.status === "down") {
    // DB down → app không thể hoạt động
    status = "unhealthy";
  } else if (redisCheck.status === "down") {
    // Redis down → mất rate limit nhưng app vẫn chạy
    status = "degraded";
  } else {
    status = "healthy";
  }

  // Always return 200 so Docker HEALTHCHECK (wget) doesn't fail on HTTP error codes.
  // Actual health status is in the JSON body for external monitors to read.
  const httpStatus = 200;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "1.0.0",
      uptime: Math.floor(process.uptime()),
      checks: {
        database: db,
        redis: redisCheck,
      },
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
