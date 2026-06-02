import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiError, apiCatch } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    const category = await prisma.tutTrickCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Danh mục");

    const body = (await req.json()) as { name?: string; iconUrl?: string };
    if (body.name !== undefined && !body.name.trim()) {
      return apiError("Tên không được để trống", "VALIDATION_ERROR", 400);
    }

    if (body.name !== undefined && body.name.trim() !== category.name) {
      const dup = await prisma.tutTrickCategory.findUnique({ where: { name: body.name.trim() } });
      if (dup) return apiError("Tên danh mục đã tồn tại", "DUPLICATE", 409);
    }

    const updated = await prisma.tutTrickCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.iconUrl !== undefined && { iconUrl: body.iconUrl || null }),
      },
      select: { id: true, name: true, iconUrl: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "UPDATE_TUT_TRICK_CATEGORY",
      targetType: "TutTrickCategory",
      targetId: id,
      before: { name: category.name, iconUrl: category.iconUrl },
      after: { name: updated.name, iconUrl: updated.iconUrl },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    const category = await prisma.tutTrickCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Danh mục");

    await prisma.tutTrickCategory.delete({ where: { id } });

    await writeAuditLog({
      actorId: me.id,
      action: "DELETE_TUT_TRICK_CATEGORY",
      targetType: "TutTrickCategory",
      targetId: id,
      before: { name: category.name },
    });

    return apiSuccess("Đã xóa danh mục");
  } catch (err) {
    return apiCatch(err);
  }
}
