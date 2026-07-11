import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { apiOk, apiCatch } from "@/lib/api-response";
import { getAdminBadgeCounts } from "@/lib/services/admin-badges.service";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:read");

    const counts = await getAdminBadgeCounts();
    return apiOk(counts);
  } catch (err) {
    return apiCatch(err);
  }
}
