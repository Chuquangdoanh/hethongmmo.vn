import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission, requireAnyPermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createServiceCategorySchema } from "@/lib/validation/service-category.schema";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requireAnyPermission(session, [
      "categories:read",
      "services:read", "services:create", "services:update",
    ]);
    const categories = await prisma.serviceCategory.findMany({
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
    const parsed = createServiceCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, iconUrl } = parsed.data;

    const existing = await prisma.serviceCategory.findUnique({ where: { name } });
    if (existing) return apiError("Danh mục đã tồn tại", "DUPLICATE", 409);

    const maxOrder = await prisma.serviceCategory.aggregate({ _max: { displayOrder: true } });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const category = await prisma.serviceCategory.create({
      data: { name, iconUrl: iconUrl || null, displayOrder: nextOrder },
      select: { id: true, name: true, iconUrl: true, displayOrder: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_SERVICE_CATEGORY",
      targetType: "ServiceCategory",
      targetId: category.id,
      after: { name, iconUrl: iconUrl || null },
    });

    return apiOk(category);
  } catch (err) {
    return apiCatch(err);
  }
}
