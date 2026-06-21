import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { apiOk, apiSuccess, apiError, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const updateSchema = z.object({
  name:                z.string().min(1).max(100).trim().optional(),
  displayOrder:        z.number().int().min(0).optional(),
  isActive:            z.boolean().optional(),
  showInKhoTaiNguyen:  z.boolean().optional(),
  showInTaiNguyenMmo:  z.boolean().optional(),
});

// PATCH /api/admin/sub-categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const sub = await prisma.sellerSubCategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundError("SubCategory");

    // RULE 3: nếu update kho thì phải validate với cha
    const isUpdatingWarehouse = parsed.data.showInKhoTaiNguyen !== undefined || parsed.data.showInTaiNguyenMmo !== undefined;
    if (isUpdatingWarehouse) {
      const parent = await prisma.resourceCategory.findUnique({ where: { name: sub.categoryName } });
      if (parent) {
        const willShowKho = parsed.data.showInKhoTaiNguyen ?? sub.showInKhoTaiNguyen;
        const willShowMmo = parsed.data.showInTaiNguyenMmo ?? sub.showInTaiNguyenMmo;
        if (willShowKho && !parent.showInKhoTaiNguyen)
          return apiError("Danh mục cha không thuộc Kho Tài Nguyên", "WAREHOUSE_MISMATCH", 400);
        if (willShowMmo && !parent.showInTaiNguyenMmo)
          return apiError("Danh mục cha không thuộc Nguyên Liệu", "WAREHOUSE_MISMATCH", 400);
        if (!willShowKho && !willShowMmo)
          return apiError("Phải giữ ít nhất 1 kho hiển thị", "VALIDATION_ERROR", 400);
      }
    }

    const updated = await prisma.sellerSubCategory.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, categoryName: true, displayOrder: true, isActive: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

// DELETE /api/admin/sub-categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:delete");
    const { id } = await params;

    const sub = await prisma.sellerSubCategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundError("SubCategory");

    await prisma.sellerSubCategory.delete({ where: { id } });

    return apiSuccess("Đã xoá danh mục con");
  } catch (err) {
    return apiCatch(err);
  }
}
