import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { createResourceCategorySchema } from "@/lib/validation/resource-category.schema";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const categories = await prisma.resourceCategory.findMany({
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
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createResourceCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, iconUrl } = parsed.data;

    const existing = await prisma.resourceCategory.findUnique({ where: { name } });
    if (existing) return apiError("Danh mục đã tồn tại", "DUPLICATE", 409);

    const maxOrder = await prisma.resourceCategory.aggregate({ _max: { displayOrder: true } });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const category = await prisma.resourceCategory.create({
      data: { name, iconUrl: iconUrl || null, displayOrder: nextOrder },
      select: { id: true, name: true, iconUrl: true, displayOrder: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_RESOURCE_CATEGORY",
      targetType: "ResourceCategory",
      targetId: category.id,
      after: { name, iconUrl: iconUrl || null },
    });

    return apiOk(category);
  } catch (err) {
    return apiCatch(err);
  }
}
