import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";
import { syncProvider } from "@/lib/external-providers/sync.service";
import type { SyncResult } from "@/lib/external-providers/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    // providerId (optional) — đồng bộ riêng 1 provider thay vì tất cả
    const body = (await req.json().catch(() => null)) as { providerId?: string } | null;
    const providerId = body?.providerId;

    const allAdapters = await loadEnabledAdapters();
    const adapters = providerId ? allAdapters.filter(a => a.providerId === providerId) : allAdapters;
    if (adapters.length === 0) {
      return apiError(
        providerId ? "Provider không tồn tại hoặc chưa bật" : "Chưa có provider nào được cấu hình",
        "NO_PROVIDERS",
        400,
      );
    }

    // Sync song song tất cả providers
    const settled = await Promise.allSettled(adapters.map(a => syncProvider(a)));

    const results: Record<string, SyncResult | { error: string }> = {};
    let anySuccess = false;

    settled.forEach((r, i) => {
      const adapter = adapters[i]!;
      if (r.status === "fulfilled") {
        results[adapter.providerId] = r.value;
        anySuccess = true;
        logger.info({ providerId: adapter.providerId, ...r.value }, "Provider sync completed");
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        results[adapter.providerId] = { error: msg };
        logger.error({ providerId: adapter.providerId, err: r.reason }, "Provider sync failed");
      }
    });

    if (!anySuccess) {
      const firstErr = Object.values(results).find((r): r is { error: string } => "error" in r);
      return apiError(`Đồng bộ thất bại: ${firstErr?.error ?? "lỗi không xác định"}`, "KHUONGFB_SYNC_ERROR", 502);
    }

    await writeAuditLog({
      actorId:    me.id,
      action:     "KHUONGFB_MANUAL_SYNC",
      targetType: "ExternalProduct",
      after:      results as unknown as import("@prisma/client").Prisma.InputJsonObject,
    });

    return apiOk({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, `[khuongfb/sync] Lỗi: ${msg}`);
    return apiError(`Đồng bộ thất bại: ${msg}`, "KHUONGFB_SYNC_ERROR", 502);
  }
}
