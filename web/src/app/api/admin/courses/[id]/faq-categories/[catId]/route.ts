import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { updateFaqCategorySchema } from "@/lib/validation/course-faq.schema";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId, catId } = await params;

    const body: unknown = await req.json();
    const parsed = updateFaqCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.courseFaqCategory.findFirst({ where: { id: catId, courseId } });
    if (!existing) throw new NotFoundError("Danh mục FAQ");

    const updated = await prisma.courseFaqCategory.update({
      where: { id: catId },
      data: parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId, catId } = await params;

    const existing = await prisma.courseFaqCategory.findFirst({ where: { id: catId, courseId } });
    if (!existing) throw new NotFoundError("Danh mục FAQ");

    await prisma.courseFaqCategory.delete({ where: { id: catId } });

    return apiSuccess("Đã xóa danh mục FAQ");
  } catch (err) {
    return apiCatch(err);
  }
}
