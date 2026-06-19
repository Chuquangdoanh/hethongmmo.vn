import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

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
    requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const sub = await prisma.sellerSubCategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundError("SubCategory");

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
    requireAdmin(session);
    const { id } = await params;

    const sub = await prisma.sellerSubCategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundError("SubCategory");

    await prisma.sellerSubCategory.delete({ where: { id } });

    return apiSuccess("Đã xoá danh mục con");
  } catch (err) {
    return apiCatch(err);
  }
}
