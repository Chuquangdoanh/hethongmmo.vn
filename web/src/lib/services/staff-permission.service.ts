/**
 * Thin compatibility layer over permission.service.ts and module.service.ts.
 * Used by /admin/phan-quyen UI. Do not add new logic here — add to permission.service.ts.
 */
import { prisma } from "@/lib/db/prisma";
import { getUserPermissions, setUserPermissions } from "@/lib/services/permission.service";
import { getStaffPermissionView } from "@/lib/services/module.service";
import type { PermissionCode } from "@/lib/constants/modules";
import { ALL_PERMISSION_CODES } from "@/lib/constants/modules";

// Re-export type cho backward compat
export type { PermissionCode as StaffPermissionKey };

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  permissions: PermissionCode[];
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  const rows = await prisma.user.findMany({
    where: { role: "STAFF", deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      staffPermissions: {
        select: {
          permission: { select: { code: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    status: r.status,
    permissions: r.staffPermissions.map((sp) => sp.permission.code as PermissionCode),
  }));
}

export async function getStaffPermissions(userId: string): Promise<PermissionCode[]> {
  return getUserPermissions(userId);
}

export { setUserPermissions as setStaffPermissions };
export { getStaffPermissionView };
export { ALL_PERMISSION_CODES as ALL_STAFF_PERMISSIONS };

/** Kiểm tra nhanh 1 permission cụ thể (không cache, query DB trực tiếp) */
export async function hasStaffPermission(userId: string, permission: string): Promise<boolean> {
  const perm = await prisma.permission.findUnique({
    where: { code: permission, isActive: true },
    select: { id: true },
  });
  if (!perm) return false;

  const sp = await prisma.staffPermission.findUnique({
    where: { userId_permissionId: { userId, permissionId: perm.id } },
    select: { userId: true },
  });
  return sp !== null;
}
