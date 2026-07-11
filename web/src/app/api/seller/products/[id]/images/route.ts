import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";
import { listProductImages, addProductImage } from "@/lib/services/product-image.service";

export const runtime = "nodejs";

const createImageSchema = z.object({
  imageUrl: z.string().min(1, "Thiếu URL ảnh").max(2000, "URL ảnh quá dài"),
});

async function getProductForActor(productId: string, actorId: string, actorRole: string) {
  const product = await prisma.sellerProduct.findUnique({
    where: { id: productId, deletedAt: null },
    select: { id: true, sellerId: true, name: true, isRestricted: true },
  });
  if (!product) return { product: null, code: "NOT_FOUND", status: 404 } as const;

  const isAdminOrStaff = actorRole === "ADMIN" || actorRole === "STAFF";
  const isOwner = product.sellerId === actorId;

  if (!isOwner && !isAdminOrStaff) return { product: null, code: "FORBIDDEN", status: 403 } as const;
  if (product.isRestricted && !isAdminOrStaff) return { product: null, code: "PRODUCT_RESTRICTED", status: 403 } as const;

  return { product, code: null, status: 200 } as const;
}

// GET /api/seller/products/[id]/images
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const { product, code, status } = await getProductForActor(id, me.id, me.role);
    if (!product) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "PRODUCT_RESTRICTED" ? "Sản phẩm đang bị khóa"
        : "Không có quyền xem sản phẩm này";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    const images = await listProductImages("SELLER_PRODUCT", id);

    return NextResponse.json({ success: true, data: images });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// POST /api/seller/products/[id]/images
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    if (me.role === "USER") {
      return NextResponse.json({ success: false, error: "Không có quyền", code: "FORBIDDEN" }, { status: 403 });
    }

    const { product, code, status } = await getProductForActor(id, me.id, me.role);
    if (!product) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "PRODUCT_RESTRICTED" ? "Sản phẩm đang bị khóa bởi admin"
        : "Không có quyền chỉnh sửa sản phẩm này";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    const parsed = createImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const image = await addProductImage("SELLER_PRODUCT", id, parsed.data.imageUrl);

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_PRODUCT_IMAGE_CREATE",
      targetType: "ProductImage",
      targetId: image.id,
      after: { productId: id, imageUrl: image.imageUrl },
    });

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
