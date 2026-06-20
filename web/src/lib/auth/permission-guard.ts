import type { Session } from "next-auth";
import { AppAuthError } from "@/lib/auth/rbac";
import { hasPermission, hasAnyPermissionInModule } from "@/lib/services/permission.service";
import type { PermissionCode } from "@/lib/constants/modules";

/**
 * Kiểm tra session hợp lệ, role >= STAFF, và có permission cụ thể.
 * Throw 401/403 nếu không đủ quyền.
 *
 * Dùng sau requireStaff() trong route handler:
 *   const me = requireStaff(session);
 *   await requirePermission(session, "products:create");
 */
export async function requirePermission(
  session: Session | null,
  code: PermissionCode,
): Promise<void> {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  // ADMIN bypass — admin có toàn quyền, không cần check DB
  const user = session.user as { id: string; role?: string };
  if (user.role === "ADMIN") return;

  const allowed = await hasPermission(user.id, code);
  if (!allowed) {
    throw new AppAuthError(
      `Bạn không có quyền thực hiện hành động này (${code})`,
      "PERMISSION_DENIED",
      403,
    );
  }
}

/**
 * Kiểm tra user có ít nhất 1 quyền trong module — dùng để guard route-level access.
 * Ví dụ: /admin/products cần canAccessModule("products").
 */
export async function requireModuleAccess(
  session: Session | null,
  moduleCode: string,
): Promise<void> {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  // ADMIN bypass
  const user = session.user as { id: string; role?: string };
  if (user.role === "ADMIN") return;

  const allowed = await hasAnyPermissionInModule(user.id, moduleCode);
  if (!allowed) {
    throw new AppAuthError(
      `Bạn không có quyền truy cập module: ${moduleCode}`,
      "MODULE_ACCESS_DENIED",
      403,
    );
  }
}
