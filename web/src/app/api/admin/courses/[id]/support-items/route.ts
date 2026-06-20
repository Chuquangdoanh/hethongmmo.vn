import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createCourseSupportSchema } from "@/lib/validation/course-support.schema";
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

    const items = await prisma.courseSupportItem.findMany({
      where: { courseId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });

    return apiList(items, { total: items.length, page: 1, limit: 100, totalPages: 1 });
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
    const parsed = createCourseSupportSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const item = await prisma.courseSupportItem.create({
      data: { courseId, ...parsed.data },
    });

    return apiOk(item);
  } catch (err) {
    return apiCatch(err);
  }
}
