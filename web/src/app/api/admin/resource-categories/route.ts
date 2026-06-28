import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { createResourceCategorySchema } from "@/lib/validation/resource-category.schema";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:read");
    const withSubs = req.nextUrl.searchParams.get("withSubs") === "true";
    const categories = await prisma.resourceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, iconUrl: true, displayOrder: true,
        showInKhoTaiNguyen: true, showInTaiNguyenMmo: true,
        ...(withSubs ? {
          subCategories: {
            where: { isActive: true },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true },
          },
        } : {}),
      },
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
    const parsed = createResourceCategorySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, iconUrl, showInKhoTaiNguyen, showInTaiNguyenMmo } = parsed.data;

    const existing = await prisma.resourceCategory.findUnique({ where: { name } });
    if (existing) {
      // Đã tồn tại trong đúng kho đang thêm → block
      const alreadyInThisStore =
        (showInKhoTaiNguyen && existing.showInKhoTaiNguyen) ||
        (showInTaiNguyenMmo && existing.showInTaiNguyenMmo);
      if (alreadyInThisStore) {
        return apiError("Danh mục đã tồn tại trong kho này", "DUPLICATE", 409);
      }

      // Tồn tại ở kho khác → thêm flag kho mới vào record cũ (không tạo mới)
      const updated = await prisma.resourceCategory.update({
        where: { id: existing.id },
        data: {
          showInKhoTaiNguyen: existing.showInKhoTaiNguyen || showInKhoTaiNguyen,
          showInTaiNguyenMmo: existing.showInTaiNguyenMmo || showInTaiNguyenMmo,
        },
        select: { id: true, name: true, iconUrl: true, displayOrder: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true },
      });
      await writeAuditLog({
        actorId: me.id,
        action: "UPDATE_RESOURCE_CATEGORY",
        targetType: "ResourceCategory",
        targetId: updated.id,
        before: { showInKhoTaiNguyen: existing.showInKhoTaiNguyen, showInTaiNguyenMmo: existing.showInTaiNguyenMmo },
        after: { showInKhoTaiNguyen: updated.showInKhoTaiNguyen, showInTaiNguyenMmo: updated.showInTaiNguyenMmo },
      });
      return apiOk(updated);
    }

    const maxOrder = await prisma.resourceCategory.aggregate({ _max: { displayOrder: true } });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const category = await prisma.resourceCategory.create({
      data: { name, iconUrl: iconUrl || null, displayOrder: nextOrder, showInKhoTaiNguyen, showInTaiNguyenMmo },
      select: { id: true, name: true, iconUrl: true, displayOrder: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_RESOURCE_CATEGORY",
      targetType: "ResourceCategory",
      targetId: category.id,
      after: { name, iconUrl: iconUrl || null, showInKhoTaiNguyen, showInTaiNguyenMmo },
    });

    return apiOk(category);
  } catch (err) {
    return apiCatch(err);
  }
}
