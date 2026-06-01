import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  icon: z.string().max(500).default(""),
  displayOrder: z.number().int().min(0).default(0),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const categories = await prisma.courseCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.courseCategory.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Danh mục "${parsed.data.name}" đã tồn tại`, code: "DUPLICATE_ENTRY" },
        { status: 409 },
      );
    }

    const category = await prisma.courseCategory.create({ data: parsed.data });

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_CATEGORY_CREATE",
      targetType: "CourseCategory",
      targetId: category.id,
      after: { name: category.name, icon: category.icon },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
