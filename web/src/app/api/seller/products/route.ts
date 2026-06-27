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
  name: z.string().min(3, "Tên sản phẩm tối thiểu 3 ký tự").max(200, "Tên sản phẩm tối đa 200 ký tự").trim(),
  price: z.number().min(1000, "Giá tối thiểu 1.000đ").max(100_000_000, "Giá tối đa 100.000.000đ"),
  warrantyInfo: z.string().min(1, "Thông tin bảo hành không được để trống").max(2000, "Thông tin bảo hành tối đa 2000 ký tự").trim(),
  description: z.string().max(5000, "Mô tả tối đa 5000 ký tự").nullish(),
  imageUrl: z.string().url("URL ảnh không hợp lệ").nullish(),
  sellerCategory: z.string().min(1).max(100).trim(),
  subCategoryId: z.string().uuid().nullable().optional(),
  storeType: z.enum(["KHO_TAI_NGUYEN", "TAI_NGUYEN_MMO"]).optional(),
  stockItems: z
    .array(z.string().min(1, "Item không được rỗng").max(2000, "Mỗi item tối đa 2000 ký tự"))
    .min(1, "Cần ít nhất 1 item kho")
    .max(5000, "Tối đa 5.000 items mỗi lần tạo sản phẩm"),
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

    const { description, imageUrl, ...rest } = parsed.data;
    const productId = await addSellerProduct({
      sellerId: me.id,
      ...rest,
      description: description ?? undefined,
      imageUrl: imageUrl ?? undefined,
      warrantyInfo: rest.warrantyInfo,
    });
    return NextResponse.json({ data: { productId } }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
