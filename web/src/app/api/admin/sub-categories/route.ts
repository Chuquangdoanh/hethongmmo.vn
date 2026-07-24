import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/admin/sub-categories?category=xxx
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:read");

    const categoryName = req.nextUrl.searchParams.get("category") ?? undefined;

    const subs = await prisma.sellerSubCategory.findMany({
      where: categoryName ? { categoryName } : undefined,
      orderBy: [{ categoryName: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, categoryName: true, displayOrder: true, isActive: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true, showInToolPhanMem: true },
    });

    return apiOk(subs);
  } catch (err) {
    return apiCatch(err);
  }
}

const createSchema = z.object({
  name:                z.string().min(1).max(100).trim(),
  categoryName:        z.string().min(1).max(250).trim(),
  displayOrder:        z.number().int().min(0).optional().default(0),
  showInKhoTaiNguyen:  z.boolean().optional().default(true),
  showInTaiNguyenMmo:  z.boolean().optional().default(true),
  showInToolPhanMem:   z.boolean().optional().default(false),
});

// POST /api/admin/sub-categories
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "categories:create");

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, categoryName, displayOrder, showInKhoTaiNguyen, showInTaiNguyenMmo, showInToolPhanMem } = parsed.data;

    // Verify parent category exists
    const cat = await prisma.resourceCategory.findUnique({ where: { name: categoryName } });
    if (!cat) return apiError("Danh mục cha không tồn tại", "NOT_FOUND", 404);

    // RULE 3: con phải cùng kho với cha — không được vượt quá phạm vi kho của cha
    if (showInKhoTaiNguyen && !cat.showInKhoTaiNguyen)
      return apiError("Danh mục cha không thuộc Kho Tài Nguyên", "WAREHOUSE_MISMATCH", 400);
    if (showInTaiNguyenMmo && !cat.showInTaiNguyenMmo)
      return apiError("Danh mục cha không thuộc Nguyên Liệu", "WAREHOUSE_MISMATCH", 400);
    if (showInToolPhanMem && !cat.showInToolPhanMem)
      return apiError("Danh mục cha không thuộc Tool - Phần mềm", "WAREHOUSE_MISMATCH", 400);
    if (!showInKhoTaiNguyen && !showInTaiNguyenMmo && !showInToolPhanMem)
      return apiError("Phải chọn ít nhất 1 kho hiển thị", "VALIDATION_ERROR", 400);

    const sub = await prisma.sellerSubCategory.create({
      data: { name, categoryName, displayOrder, showInKhoTaiNguyen, showInTaiNguyenMmo, showInToolPhanMem },
      select: { id: true, name: true, categoryName: true, displayOrder: true, isActive: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true, showInToolPhanMem: true },
    });

    return apiOk(sub);
  } catch (err) {
    return apiCatch(err);
  }
}
