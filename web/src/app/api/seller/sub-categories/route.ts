import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET — current seller's sub-categories
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    const rows = await prisma.userSubCategory.findMany({
      where: { userId: me.id },
      select: {
        subCategory: {
          select: { id: true, name: true, categoryName: true },
        },
      },
    });

    return apiOk(rows.map((r) => r.subCategory));
  } catch (err) {
    return apiCatch(err);
  }
}

const updateSchema = z.object({
  subCategoryIds: z.array(z.string().uuid()).max(20),
});

// PUT — replace seller's sub-categories entirely
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { subCategoryIds } = parsed.data;

    if (subCategoryIds.length > 0) {
      // Verify all sub-categories exist and match seller's category
      const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: { sellerCategory: true },
      });

      const subs = await prisma.sellerSubCategory.findMany({
        where: { id: { in: subCategoryIds }, isActive: true },
        select: { id: true, categoryName: true },
      });

      if (subs.length !== subCategoryIds.length) {
        throw new ValidationError("Một số danh mục con không hợp lệ");
      }

      // All sub-categories must belong to seller's category
      const invalidSub = subs.find((s) => s.categoryName !== user?.sellerCategory);
      if (invalidSub) {
        throw new ValidationError("Danh mục con không thuộc danh mục của bạn");
      }
    }

    // Replace all in one transaction
    await prisma.$transaction([
      prisma.userSubCategory.deleteMany({ where: { userId: me.id } }),
      ...(subCategoryIds.length > 0
        ? [prisma.userSubCategory.createMany({
            data: subCategoryIds.map((subCategoryId) => ({ userId: me.id, subCategoryId })),
          })]
        : []),
    ]);

    return apiSuccess("Đã cập nhật danh mục con");
  } catch (err) {
    return apiCatch(err);
  }
}
