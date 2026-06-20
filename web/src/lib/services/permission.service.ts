import { prisma } from "@/lib/db/prisma";
import type { PermissionCode } from "@/lib/constants/modules";
import { resolveDependencies } from "@/lib/constants/modules";
import { writeAuditLog } from "@/lib/security/audit";

// ─────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────

/** Trả về danh sách permission codes mà 1 user đang có */
export async function getUserPermissions(userId: string): Promise<PermissionCode[]> {
  const rows = await prisma.staffPermission.findMany({
    where: { userId, permission: { isActive: true } },
    select: { permission: { select: { code: true } } },
  });
  return rows.map((r) => r.permission.code as PermissionCode);
}

/** Kiểm tra user có 1 permission cụ thể không (query DB trực tiếp) */
export async function hasPermission(userId: string, code: string): Promise<boolean> {
  const perm = await prisma.permission.findUnique({
    where: { code, isActive: true },
    select: { id: true },
  });
  if (!perm) return false;

  const sp = await prisma.staffPermission.findUnique({
    where: { userId_permissionId: { userId, permissionId: perm.id } },
    select: { userId: true },
  });
  return sp !== null;
}

/** Kiểm tra user có ít nhất 1 permission trong 1 module không */
export async function hasAnyPermissionInModule(userId: string, moduleCode: string): Promise<boolean> {
  const perms = await prisma.permission.findMany({
    where: { module: { code: moduleCode }, isActive: true },
    select: { id: true },
  });
  if (perms.length === 0) return false;

  const sp = await prisma.staffPermission.findFirst({
    where: { userId, permissionId: { in: perms.map((p) => p.id) } },
    select: { userId: true },
  });
  return sp !== null;
}

/** Trả về danh sách module codes mà user có thể truy cập */
export async function getUserAccessibleModules(userId: string): Promise<string[]> {
  // Lấy tất cả modules của permissions user đang có
  const rows = await prisma.staffPermission.findMany({
    where: { userId, permission: { isActive: true } },
    select: { permission: { select: { module: { select: { code: true } } } } },
  });

  const moduleCodes = new Set<string>(rows.map((r) => r.permission.module.code));
  return [...moduleCodes];
}

// ─────────────────────────────────────────────
// Write helpers
// ─────────────────────────────────────────────

/**
 * Gán/đồng bộ toàn bộ permissions cho 1 staff user.
 * Xóa hết permissions cũ, tạo mới theo danh sách mới.
 * Tự giải quyết phụ thuộc (create → read).
 */
export async function setUserPermissions(
  userId: string,
  permissionCodes: PermissionCode[],
  actorId: string,
): Promise<void> {
  // Giải quyết phụ thuộc
  const resolved = resolveDependencies(permissionCodes);

  // Validate: chỉ nhận code tồn tại và đang active
  const validPerms = await prisma.permission.findMany({
    where: { code: { in: resolved }, isActive: true },
    select: { id: true, code: true },
  });

  const validIds = validPerms.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    // Lưu before cho audit log
    const before = await tx.staffPermission.findMany({
      where: { userId },
      select: { permission: { select: { code: true } } },
    });

    // Xóa toàn bộ permission cũ
    await tx.staffPermission.deleteMany({ where: { userId } });

    // Tạo permissions mới
    if (validIds.length > 0) {
      await tx.staffPermission.createMany({
        data: validIds.map((permissionId) => ({ userId, permissionId })),
        skipDuplicates: true,
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId,
        action: "UPDATE_STAFF_PERMISSIONS",
        targetType: "User",
        targetId: userId,
        before: { permissions: before.map((b) => b.permission.code) },
        after:  { permissions: validPerms.map((p) => p.code) },
      },
    });
  });
}

// ─────────────────────────────────────────────
// List helpers (dùng cho admin UI)
// ─────────────────────────────────────────────

export async function listPermissions() {
  return prisma.permission.findMany({
    where: { isActive: true },
    include: { module: { select: { code: true, label: true } } },
    orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

export async function listPermissionsByModule(moduleCode: string) {
  return prisma.permission.findMany({
    where: { module: { code: moduleCode }, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}
