import { NextRequest, NextResponse } from "next/server";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";
import { syncProvider } from "@/lib/external-providers/sync.service";
import type { SyncResult } from "@/lib/external-providers/types";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

// Cron endpoint — gọi định kỳ (vd. mỗi 15 phút) bởi crontab VPS hoặc external scheduler
// Bảo vệ bằng CRON_SECRET header để tránh public trigger
// Đồng bộ TẤT CẢ provider đang bật (không chỉ riêng khuongfb) — dùng chung logic với nút "Đồng bộ ngay" ở admin
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adapters = await loadEnabledAdapters();
    if (adapters.length === 0) {
      return NextResponse.json({ success: true, results: {} });
    }

    const settled = await Promise.allSettled(adapters.map(a => syncProvider(a)));
    const results: Record<string, SyncResult | { error: string }> = {};

    settled.forEach((r, i) => {
      const adapter = adapters[i]!;
      if (r.status === "fulfilled") {
        results[adapter.providerId] = r.value;
        logger.info({ providerId: adapter.providerId, ...r.value }, "Provider auto-sync completed");
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        results[adapter.providerId] = { error: msg };
        logger.error({ providerId: adapter.providerId, err: r.reason }, "Provider auto-sync failed");
      }
    });

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Khuongfb auto-sync failed");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
