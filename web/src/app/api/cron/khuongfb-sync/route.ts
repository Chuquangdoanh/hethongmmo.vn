import { NextRequest, NextResponse } from "next/server";
import { syncKhuongfbProducts } from "@/lib/khuongfb/sync.service";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

// Cron endpoint — gọi mỗi 15 phút bởi Vercel Cron hoặc external scheduler
// Bảo vệ bằng CRON_SECRET header để tránh public trigger
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncKhuongfbProducts();
    logger.info(result, "Khuongfb auto-sync completed");
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Khuongfb auto-sync failed");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
