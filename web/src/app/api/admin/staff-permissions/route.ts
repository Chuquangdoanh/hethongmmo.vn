import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { listStaffMembers, setStaffPermissions } from "@/lib/services/staff-permission.service";
import { getStaffPermissionView } from "@/lib/services/module.service";
import { listModulesWithPermissions } from "@/lib/services/module.service";
import { ALL_PERMISSION_CODES, type PermissionCode } from "@/lib/constants/modules";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  userId:      z.string().uuid(),
  permissions: z.array(z.string()).transform((arr) =>
    arr.filter((p): p is PermissionCode =>
      (ALL_PERMISSION_CODES as string[]).includes(p),
    ),
  ),
});

const viewSchema = z.object({
  userId: z.string().uuid(),
});

/** GET /api/admin/staff-permissions
 * - Không có query: trả danh sách tất cả staff members kèm permission codes
 * - ?userId=xxx: trả module permission view (checkbox state) cho 1 user
 * - ?modules=1: trả toàn bộ modules + permissions (không filter theo user)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const params = req.nextUrl.searchParams;
    const userId = params.get("userId");
    const modules = params.get("modules");

    if (userId) {
      // Trả module permission view cho 1 user cụ thể
      const parsed = viewSchema.safeParse({ userId });
      if (!parsed.success) return apiValidationError(parsed.error.issues);

      const view = await getStaffPermissionView(parsed.data.userId);
      return apiOk(view);
    }

    if (modules === "1") {
      // Trả toàn bộ modules + permissions (dùng để build form checkbox)
      const list = await listModulesWithPermissions();
      return apiOk(list);
    }

    // Default: danh sách staff members
    const members = await listStaffMembers();
    return apiOk(members);
  } catch (err) {
    return apiCatch(err);
  }
}

/** PATCH /api/admin/staff-permissions
 * Body: { userId: string, permissions: string[] }
 * Cập nhật toàn bộ permissions cho 1 staff user.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await setStaffPermissions(parsed.data.userId, parsed.data.permissions, me.id);
    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
