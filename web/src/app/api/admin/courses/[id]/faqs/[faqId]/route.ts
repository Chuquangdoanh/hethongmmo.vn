import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { updateCourseFaqSchema } from "@/lib/validation/course-faq.schema";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; faqId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "courses:update");
    const { id: courseId, faqId } = await params;

    const body: unknown = await req.json();
    const parsed = updateCourseFaqSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.courseFaq.findFirst({ where: { id: faqId, courseId } });
    if (!existing) throw new NotFoundError("FAQ");

    const updated = await prisma.courseFaq.update({
      where: { id: faqId },
      data: {
        ...parsed.data,
        categoryId: parsed.data.categoryId === undefined ? undefined : (parsed.data.categoryId ?? null),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; faqId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "courses:update");
    const { id: courseId, faqId } = await params;

    const existing = await prisma.courseFaq.findFirst({ where: { id: faqId, courseId } });
    if (!existing) throw new NotFoundError("FAQ");

    await prisma.courseFaq.delete({ where: { id: faqId } });

    return apiSuccess("Đã xóa câu hỏi");
  } catch (err) {
    return apiCatch(err);
  }
}
