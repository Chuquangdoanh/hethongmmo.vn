import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createFaqCategorySchema } from "@/lib/validation/course-faq.schema";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "courses:read");
    const { id: courseId } = await params;

    const categories = await prisma.courseFaqCategory.findMany({
      where: { courseId },
      include: { faqs: { orderBy: { displayOrder: "asc" }, where: { isActive: true } } },
      orderBy: { displayOrder: "asc" },
    });

    return apiList(categories, { total: categories.length, page: 1, limit: 100, totalPages: 1 });
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
    requireStaff(session);

    await requirePermission(session, "courses:update");
    const { id: courseId } = await params;

    const body: unknown = await req.json();
    const parsed = createFaqCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const category = await prisma.courseFaqCategory.create({
      data: { courseId, ...parsed.data },
    });

    return apiOk(category);
  } catch (err) {
    return apiCatch(err);
  }
}
