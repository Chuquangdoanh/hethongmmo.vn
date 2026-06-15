import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { updateCourseSupportSchema } from "@/lib/validation/course-support.schema";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId, itemId } = await params;

    const body: unknown = await req.json();
    const parsed = updateCourseSupportSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.courseSupportItem.findFirst({ where: { id: itemId, courseId } });
    if (!existing) throw new NotFoundError("Mục hỗ trợ");

    const updated = await prisma.courseSupportItem.update({
      where: { id: itemId },
      data: parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId, itemId } = await params;

    const existing = await prisma.courseSupportItem.findFirst({ where: { id: itemId, courseId } });
    if (!existing) throw new NotFoundError("Mục hỗ trợ");

    await prisma.courseSupportItem.delete({ where: { id: itemId } });

    return apiSuccess("Đã xóa mục hỗ trợ");
  } catch (err) {
    return apiCatch(err);
  }
}
