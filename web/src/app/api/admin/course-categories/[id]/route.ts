import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  icon: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
 await requirePermission(session, "categories:update");
    const { id } = await params;

    const existing = await prisma.courseCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Danh mục không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const conflict = await prisma.courseCategory.findUnique({ where: { name: parsed.data.name } });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: `Tên "${parsed.data.name}" đã tồn tại`, code: "DUPLICATE_ENTRY" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.courseCategory.update({ where: { id }, data: parsed.data });

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_CATEGORY_UPDATE",
      targetType: "CourseCategory",
      targetId: id,
      before: { name: existing.name, icon: existing.icon },
      after: { name: updated.name, icon: updated.icon },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
 await requirePermission(session, "categories:delete");
    const { id } = await params;

    const existing = await prisma.courseCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Danh mục không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.courseCategory.delete({ where: { id } });

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_CATEGORY_DELETE",
      targetType: "CourseCategory",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa danh mục" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
