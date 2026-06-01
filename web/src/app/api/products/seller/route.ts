import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiList, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  sellerId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) {
      return apiError("Tham số không hợp lệ", "VALIDATION_ERROR", 400);
    }

    const { page, limit, category, sellerId, id } = query.data;

    if (id) {
      const item = await prisma.sellerProduct.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          sellerId: true,
          sellerCategory: true,
          name: true,
          price: true,
          description: true,
          imageUrl: true,
          isActive: true,
          isHidden: true,
          isRestricted: true,
          salesCount: true,
          publishDate: true,
          _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
        },
      });

      if (!item || !item.isActive || item.isHidden || item.isRestricted) {
        return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);
      }

      const { _count, ...rest } = item;
      return apiOk({ ...rest, stockCount: _count.stockItems });
    }

    const where = {
      isActive: true,
      isHidden: false,
      isRestricted: false,
      deletedAt: null,
      ...(category ? { sellerCategory: category } : {}),
      ...(sellerId ? { sellerId } : {}),
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.sellerProduct.findMany({
        where,
        select: {
          id: true,
          sellerId: true,
          sellerCategory: true,
          name: true,
          price: true,
          imageUrl: true,
          salesCount: true,
          publishDate: true,
          _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
        },
        orderBy: { salesCount: "desc" },
        skip,
        take: limit,
      }),
      prisma.sellerProduct.count({ where }),
    ]);

    const data = items.map(({ _count, ...rest }) => ({ ...rest, stockCount: _count.stockItems }));
    return apiList(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}
