import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { savePermissionsSchema } from "@/lib/validation/page-permission.schema";
import { getPermissionsForRole, savePermissions } from "@/lib/services/page-permission.service";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import type { Role } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/admin/page-permissions?role=STAFF|USER|SELLER
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const roleParam = req.nextUrl.searchParams.get("role") as Role | null;
    if (!roleParam || !["USER", "SELLER", "STAFF"].includes(roleParam)) {
      return NextResponse.json({ error: "role không hợp lệ", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const permissions = await getPermissionsForRole(roleParam);
    return apiOk(permissions);
  } catch (err) {
    return apiCatch(err);
  }
}

// PATCH /api/admin/page-permissions — body: { role, permissions: { [pageKey]: boolean } }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = savePermissionsSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { role, permissions } = parsed.data;

    await savePermissions(role as Role, permissions, me.id);

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_PAGE_PERMISSIONS",
      targetType: "PagePermission",
      targetId:   role,
      after:      { permissions },
    });

    return apiOk({ role, updated: Object.keys(permissions).length });
  } catch (err) {
    return apiCatch(err);
  }
}
