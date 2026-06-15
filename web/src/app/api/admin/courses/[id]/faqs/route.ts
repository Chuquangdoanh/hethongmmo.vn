import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { createCourseFaqSchema } from "@/lib/validation/course-faq.schema";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId } = await params;

    const faqs = await prisma.courseFaq.findMany({
      where: { courseId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });

    return apiList(faqs, { total: faqs.length, page: 1, limit: 500, totalPages: 1 });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: courseId } = await params;

    const body: unknown = await req.json();
    const parsed = createCourseFaqSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const faq = await prisma.courseFaq.create({
      data: {
        courseId,
        categoryId: parsed.data.categoryId ?? null,
        question:     parsed.data.question,
        answer:       parsed.data.answer,
        displayOrder: parsed.data.displayOrder,
        isActive:     parsed.data.isActive,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return apiOk(faq);
  } catch (err) {
    return apiCatch(err);
  }
}
