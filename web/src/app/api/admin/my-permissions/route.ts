import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { apiOk, apiCatch } from "@/lib/api-response";
import { getUserPermissions, getUserAccessibleModules } from "@/lib/services/permission.service";

export const runtime = "nodejs";

/**
 * GET /api/admin/my-permissions
 * Trả về danh sách permissions và modules của current staff user.
 * Dùng cho frontend để render menu và kiểm soát hiển thị button/action.
 *
 * ADMIN nhận về { permissions: [], modules: [], isAdmin: true }
 * STAFF nhận về { permissions: [...], modules: [...], isAdmin: false }
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);

    // Admin có toàn quyền — không cần query DB
    if (me.role === "ADMIN") {
      return apiOk({
        isAdmin: true,
        permissions: [] as string[],
        modules:     [] as string[],
      });
    }

    const [permissions, modules] = await Promise.all([
      getUserPermissions(me.id),
      getUserAccessibleModules(me.id),
    ]);

    return apiOk({
      isAdmin:     false,
      permissions,
      modules,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
