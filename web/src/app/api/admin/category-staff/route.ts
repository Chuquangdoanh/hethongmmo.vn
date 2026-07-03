import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission, requireAnyPermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createCategoryStaffSchema } from "@/lib/validation/category-staff.schema";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);
    await requireAnyPermission(session, [
      "categories:read",
      "services:read", "services:create", "services:update",
    ]);

    const category = req.nextUrl.searchParams.get("category")?.trim() || undefined;

    const staff = await prisma.categoryStaff.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, category: true, name: true, role: true,
        description: true, avatarUrl: true, displayOrder: true, isActive: true,
      },
    });

    return apiOk(staff);
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
    const parsed = createCategoryStaffSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { category, name, role, description, avatarUrl } = parsed.data;

    const maxOrder = await prisma.categoryStaff.aggregate({
      where: { category },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const staff = await prisma.categoryStaff.create({
      data: {
        category,
        name,
        role,
        description: description || null,
        avatarUrl: avatarUrl || null,
        displayOrder: nextOrder,
      },
      select: {
        id: true, category: true, name: true, role: true,
        description: true, avatarUrl: true, displayOrder: true, isActive: true,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_CATEGORY_STAFF",
      targetType: "CategoryStaff",
      targetId: staff.id,
      after: { category, name, role },
    });

    return apiOk(staff);
  } catch (err) {
    return apiCatch(err);
  }
}
