import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/admin/sub-categories?category=xxx
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const categoryName = req.nextUrl.searchParams.get("category") ?? undefined;

    const subs = await prisma.sellerSubCategory.findMany({
      where: categoryName ? { categoryName } : undefined,
      orderBy: [{ categoryName: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, categoryName: true, displayOrder: true, isActive: true },
    });

    return apiOk(subs);
  } catch (err) {
    return apiCatch(err);
  }
}

const createSchema = z.object({
  name:         z.string().min(1).max(100).trim(),
  categoryName: z.string().min(1).max(250).trim(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

// POST /api/admin/sub-categories
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { name, categoryName, displayOrder } = parsed.data;

    // Verify parent category exists
    const cat = await prisma.resourceCategory.findUnique({ where: { name: categoryName } });
    if (!cat) return apiOk({ error: "Danh mục cha không tồn tại" });

    const sub = await prisma.sellerSubCategory.create({
      data: { name, categoryName, displayOrder },
      select: { id: true, name: true, categoryName: true, displayOrder: true, isActive: true },
    });

    return apiOk(sub);
  } catch (err) {
    return apiCatch(err);
  }
}
