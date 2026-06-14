import { prisma } from "@/lib/db/prisma";
import { ALL_STAFF_PERMISSIONS, type StaffPermissionKey } from "@/lib/constants/staff-permissions";

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  permissions: StaffPermissionKey[];
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  const rows = await prisma.user.findMany({
    where: { role: "STAFF", deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      staffPermissions: { select: { permission: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    permissions: r.staffPermissions.map((p) => p.permission as StaffPermissionKey),
  }));
}

export async function getStaffPermissions(userId: string): Promise<StaffPermissionKey[]> {
  const rows = await prisma.staffPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return rows.map((r) => r.permission as StaffPermissionKey);
}

export async function setStaffPermissions(
  userId: string,
  permissions: StaffPermissionKey[],
  actorId: string,
): Promise<void> {
  const valid = permissions.filter((p) => (ALL_STAFF_PERMISSIONS as string[]).includes(p));

  await prisma.$transaction(async (tx) => {
    const before = await tx.staffPermission.findMany({
      where: { userId },
      select: { permission: true },
    });

    await tx.staffPermission.deleteMany({ where: { userId } });

    if (valid.length > 0) {
      await tx.staffPermission.createMany({
        data: valid.map((permission) => ({ userId, permission })),
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "UPDATE_STAFF_PERMISSIONS",
        targetType: "User",
        targetId: userId,
        before: { permissions: before.map((b) => b.permission) },
        after:  { permissions: valid },
      },
    });
  });
}

/** Dùng trong route handler để kiểm tra quyền cụ thể của staff */
export async function hasStaffPermission(userId: string, permission: string): Promise<boolean> {
  const row = await prisma.staffPermission.findUnique({
    where: { userId_permission: { userId, permission } },
    select: { id: true },
  });
  return !!row;
}
