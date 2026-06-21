import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createTutTrickCategorySchema } from "@/lib/validation/tut-trick-category.schema";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:read");
    const categories = await prisma.tutTrickCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, iconUrl: true, displayOrder: true },
    });
    return apiOk(categories);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "categories:create");

    const body: unknown = await req.json();
    const parsed = createTutTrickCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, iconUrl } = parsed.data;

    const existing = await prisma.tutTrickCategory.findUnique({ where: { name } });
    if (existing) return apiError("Danh mục đã tồn tại", "DUPLICATE", 409);

    const maxOrder = await prisma.tutTrickCategory.aggregate({ _max: { displayOrder: true } });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const category = await prisma.tutTrickCategory.create({
      data: { name, iconUrl: iconUrl || null, displayOrder: nextOrder },
      select: { id: true, name: true, iconUrl: true, displayOrder: true },
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
