import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { createTutTrickCategorySchema } from "@/lib/validation/tut-trick-category.schema";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const categories = await prisma.tutTrickCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, iconUrl: true },
    });
    return apiOk(categories);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createTutTrickCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, iconUrl } = parsed.data;

    const existing = await prisma.tutTrickCategory.findUnique({ where: { name } });
    if (existing) return apiError("Danh mục đã tồn tại", "DUPLICATE", 409);

    const category = await prisma.tutTrickCategory.create({
      data: { name, iconUrl: iconUrl || null },
      select: { id: true, name: true, iconUrl: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_TUT_TRICK_CATEGORY",
      targetType: "TutTrickCategory",
      targetId: category.id,
      after: { name, iconUrl: iconUrl || null },
    });

    return apiOk(category);
  } catch (err) {
    return apiCatch(err);
  }
}
