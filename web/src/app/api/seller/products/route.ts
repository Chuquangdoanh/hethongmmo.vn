import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { addSellerProduct } from "@/lib/services/seller.service";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const addProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  price: z.number().min(1000, "Giá tối thiểu 1,000đ"),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  sellerCategory: z.string().min(1).max(100).trim(),
  stockItems: z.array(z.string().min(1).max(10000)).min(1, "Cần ít nhất 1 item").max(100, "Tối đa 100 items mỗi lần. Dùng trang Kho hàng để thêm tiếp."),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.sellerProduct.findMany({
        where: { sellerId: me.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          price: true,
          sellerCategory: true,
          isActive: true,
          isHidden: true,
          salesCount: true,
          revenue: true,
          createdAt: true,
          _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sellerProduct.count({ where: { sellerId: me.id, deletedAt: null } }),
    ]);

    const data = products.map(({ _count, ...rest }) => ({ ...rest, stockCount: _count.stockItems }));
    return NextResponse.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }

    const body: unknown = await req.json();
    const parsed = addProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const productId = await addSellerProduct({ sellerId: me.id, ...parsed.data });
    return NextResponse.json({ data: { productId } }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
