import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────
// Module queries
// ─────────────────────────────────────────────

export async function listModules() {
  return prisma.module.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listModulesWithPermissions() {
  return prisma.module.findMany({
    where: { isActive: true },
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getModuleByCode(code: string) {
  return prisma.module.findUnique({ where: { code } });
}

export async function getModuleWithPermissions(code: string) {
  return prisma.module.findUnique({
    where: { code },
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Staff permission overview (dùng cho admin UI cấp quyền)
// ─────────────────────────────────────────────

export interface ModulePermissionView {
  module: {
    id: string;
    code: string;
    label: string;
    icon: string | null;
  };
  permissions: {
    id: string;
    code: string;
    action: string | null;
    label: string;
    checked: boolean;
  }[];
}

/**
 * Trả về toàn bộ modules + permissions kèm trạng thái checked
 * của 1 user cụ thể — dùng để render UI cấp quyền.
 */
export async function getStaffPermissionView(userId: string): Promise<ModulePermissionView[]> {
  const [modules, staffPerms] = await Promise.all([
    listModulesWithPermissions(),
    prisma.staffPermission.findMany({
      where: { userId },
      select: { permissionId: true },
    }),
  ]);

  const grantedIds = new Set(staffPerms.map((sp) => sp.permissionId));

  return modules.map((mod) => ({
    module: {
      id: mod.id,
      code: mod.code,
      label: mod.label,
      icon: mod.icon,
    },
    permissions: mod.permissions.map((perm) => ({
      id: perm.id,
      code: perm.code,
      action: perm.action,
      label: perm.label,
      checked: grantedIds.has(perm.id),
    })),
  }));
}
