import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { syncKhuongfbProducts } from "@/lib/khuongfb/sync.service";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const result = await syncKhuongfbProducts();

    await writeAuditLog({
      actorId:    me.id,
      action:     "KHUONGFB_MANUAL_SYNC",
      targetType: "KhuongfbProduct",
      after:      { created: result.created, updated: result.updated, deactivated: result.deactivated, total: result.total },
    });

    return apiOk(result);
  } catch (err) {
    // Log chi tiết ra terminal để debug
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, `[khuongfb/sync] Lỗi: ${msg}`);

    // Trả lỗi rõ ràng thay vì 500 chung
    return apiError(`Đồng bộ thất bại: ${msg}`, "KHUONGFB_SYNC_ERROR", 502);
  }
}
