import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { updateCategoryStaffSchema } from "@/lib/validation/category-staff.schema";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "categories:update");
    const { id } = await params;

    const staff = await prisma.categoryStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundError("Nhân sự");

    const body: unknown = await req.json();
    const parsed = updateCategoryStaffSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { category, name, role, description, avatarUrl, isActive } = parsed.data;

    const updated = await prisma.categoryStaff.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(description !== undefined && { description: description || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true, category: true, name: true, role: true,
        description: true, avatarUrl: true, displayOrder: true, isActive: true,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "UPDATE_CATEGORY_STAFF",
      targetType: "CategoryStaff",
      targetId: id,
      before: { category: staff.category, name: staff.name, role: staff.role },
      after: { category: updated.category, name: updated.name, role: updated.role },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "categories:delete");
    const { id } = await params;

    const staff = await prisma.categoryStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundError("Nhân sự");

    await prisma.categoryStaff.delete({ where: { id } });

    await writeAuditLog({
      actorId: me.id,
      action: "DELETE_CATEGORY_STAFF",
      targetType: "CategoryStaff",
      targetId: id,
      before: { category: staff.category, name: staff.name },
    });

    return apiSuccess("Đã xóa nhân sự");
  } catch (err) {
    return apiCatch(err);
  }
}
