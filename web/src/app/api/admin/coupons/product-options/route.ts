import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { COUPON_PRODUCT_TYPES } from "@/lib/validation/coupon.schema";

export const runtime = "nodejs";

const querySchema = z.object({
  productType: z.enum(COUPON_PRODUCT_TYPES),
  q: z.string().trim().max(200).optional(),
  sellerId: z.string().uuid().optional(),
  // Chỉ áp dụng cho MMO_PRODUCT — cùng 1 bảng mmo_products nhưng hiển thị ở 2 storefront khác nhau
  // (Kho tài nguyên / Tài nguyên MMO) tuỳ field `section`.
  section: z.enum(["KHO_TAI_NGUYEN", "TAI_NGUYEN_MMO"]).optional(),
});

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

/** Danh sách sản phẩm để admin chọn gắn vào coupon — tìm nhanh theo tên, tối đa 100 kết quả. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) return apiValidationError(query.error.issues);
    const { productType, q, sellerId, section } = query.data;

    const nameFilter = q ? { contains: q, mode: "insensitive" as const } : undefined;
    let options: ProductOption[] = [];

    if (productType === "SELLER_PRODUCT") {
      const rows = await prisma.sellerProduct.findMany({
        where: {
          deletedAt: null,
          ...(sellerId ? { sellerId } : {}),
          ...(nameFilter ? { name: nameFilter } : {}),
        },
        select: { id: true, name: true, price: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      options = rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
    } else if (productType === "MMO_PRODUCT") {
      const rows = await prisma.mmoProduct.findMany({
        where: {
          deletedAt: null,
          ...(section ? { section } : {}),
          ...(nameFilter ? { name: nameFilter } : {}),
        },
        select: { id: true, name: true, price: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      options = rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
    } else {
      const rows = await prisma.externalProduct.findMany({
        where: { ...(nameFilter ? { name: nameFilter } : {}) },
        select: { id: true, name: true, salePrice: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      options = rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.salePrice) }));
    }

    return apiOk(options);
  } catch (err) {
    return apiCatch(err);
  }
}
