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

const bulkActionSchema = z.object({
  action: z.enum(["delete", "hide", "show"]),
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
 await requirePermission(session, "courses:update");

    const body: unknown = await req.json();
    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { action, ids } = parsed.data;

    if (action === "delete") {
      await prisma.course.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      });
      await writeAuditLog({
        actorId: actor.id,
        action: "COURSE_BULK_DELETE",
        targetType: "Course",
        targetId: ids.join(","),
        after: { ids, count: ids.length },
      });
      return NextResponse.json({ success: true, message: `Đã xóa ${ids.length} khóa học` });
    }

    if (action === "hide") {
      await prisma.course.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { isActive: false },
      });
      await writeAuditLog({
        actorId: actor.id,
        action: "COURSE_BULK_HIDE",
        targetType: "Course",
        targetId: ids.join(","),
        after: { ids, count: ids.length },
      });
      return NextResponse.json({ success: true, message: `Đã ẩn ${ids.length} khóa học` });
    }

    // action === "show"
    await prisma.course.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: true },
    });
    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_BULK_SHOW",
      targetType: "Course",
      targetId: ids.join(","),
      after: { ids, count: ids.length },
    });
    return NextResponse.json({ success: true, message: `Đã hiện ${ids.length} khóa học` });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
