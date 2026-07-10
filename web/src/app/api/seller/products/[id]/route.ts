import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  name:           z.string().min(2).max(255).optional(),
  price:          z.number().positive().max(100_000_000).optional(),
  warrantyInfo:   z.string().min(1).max(2000).optional(),
  description:    z.string().max(5000).optional(),
  imageUrl:       z.string().url().optional(),
  isHidden:       z.boolean().optional(),
  isActive:       z.boolean().optional(),
  subCategoryId:  z.string().uuid().nullable().optional(),
  sellerCategory: z.string().min(1).max(100).trim().optional(),
  storeType:      z.enum(["KHO_TAI_NGUYEN", "TAI_NGUYEN_MMO"]).optional(),
});

// ── GET — Chi tiết sản phẩm kèm stock count ──────────────────────────────────

/**
 * GET /api/seller/products/[id]
 * Trả về thông tin sản phẩm của seller kèm số lượng stock còn lại / đã bán.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);
    const { id } = await params;

    const product = await prisma.sellerProduct.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, sellerId: true, sellerCategory: true, name: true,
        price: true, warrantyInfo: true, description: true, imageUrl: true,
        publishDate: true, isActive: true, isHidden: true, isRestricted: true,
        approvalStatus: true, approvalRejectReason: true,
        salesCount: true, revenue: true, createdAt: true, updatedAt: true,
      },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // IDOR: chỉ seller sở hữu hoặc admin mới được xem
    if (product.sellerId !== me.id && me.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xem sản phẩm này", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const [stockCount, soldCount] = await Promise.all([
      prisma.sellerProductStock.count({ where: { productId: id, status: "AVAILABLE" } }),
      prisma.sellerProductStock.count({ where: { productId: id, status: "SOLD" } }),
    ]);

    return NextResponse.json({ success: true, data: { ...product, stockCount, soldCount } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── PATCH — Cập nhật sản phẩm ─────────────────────────────────────────────────

/**
 * PATCH /api/seller/products/[id]
 * Seller cập nhật thông tin sản phẩm của mình.
 * Không cho phép cập nhật isRestricted, salesCount, revenue.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // Parse body trước (req.json chỉ gọi được 1 lần)
    const body: unknown = await req.json();

    const session = await auth();
    const me = requireSeller(session);
    const { id } = await params;

    // Fetch trước để IDOR và restricted check trước khi validate input
    const product = await prisma.sellerProduct.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, sellerId: true, name: true, price: true,
        description: true, isHidden: true, isActive: true, isRestricted: true,
        approvalStatus: true,
      },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // IDOR: chỉ chủ sở hữu
    if (product.sellerId !== me.id) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền chỉnh sửa sản phẩm này", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // isRestricted guard: sản phẩm bị khóa → không được sửa
    if (product.isRestricted) {
      return NextResponse.json(
        {
          success: false,
          error: "Sản phẩm đang bị khóa bởi admin. Liên hệ hỗ trợ để biết thêm.",
          code: "PRODUCT_RESTRICTED",
        },
        { status: 403 },
      );
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có trường nào cần cập nhật", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { description, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      ...(description !== undefined ? { description: sanitizeHtml(description) } : {}),
      // Sản phẩm bị từ chối mà seller sửa lại → gửi duyệt lại tự động
      ...(product.approvalStatus === "REJECTED"
        ? { approvalStatus: "PENDING" as const, approvalRejectReason: null }
        : {}),
    };

    const updated = await prisma.sellerProduct.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, price: true, isActive: true, isHidden: true,
        approvalStatus: true, updatedAt: true,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_PRODUCT_UPDATE",
      targetType: "SellerProduct",
      targetId: id,
      before: {
        name: product.name,
        price: Number(product.price),
        isHidden: product.isHidden,
        isActive: product.isActive,
      },
      after: rest as Record<string, string | number | boolean>,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── DELETE — Soft delete sản phẩm ────────────────────────────────────────────

/**
 * DELETE /api/seller/products/[id]
 * Seller xóa sản phẩm của mình (hoặc Admin xóa bất kỳ).
 * Không cho phép xóa khi còn đơn hàng đang reserved.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    // requireSeller cho phép role >= SELLER (bao gồm cả ADMIN)
    const me = requireSeller(session);
    const { id } = await params;

    const product = await prisma.sellerProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, sellerId: true, name: true, isRestricted: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // IDOR: seller chỉ xóa sản phẩm của mình; admin được miễn
    if (product.sellerId !== me.id && me.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa sản phẩm này", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // isRestricted guard chỉ áp dụng cho seller, không áp dụng cho admin
    if (product.isRestricted && me.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Sản phẩm bị khóa, không thể xóa", code: "PRODUCT_RESTRICTED" },
        { status: 403 },
      );
    }

    // Không xóa khi còn stock đang reserved (đơn đang xử lý)
    const reserved = await prisma.sellerProductStock.count({
      where: { productId: id, status: "RESERVED" },
    });
    if (reserved > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Đang có đơn hàng đang xử lý. Không thể xóa sản phẩm lúc này.",
          code: "HAS_RESERVED_STOCK",
        },
        { status: 400 },
      );
    }

    // Soft delete trong transaction; stock giữ nguyên AVAILABLE để tránh nhầm lẫn
    await prisma.$transaction(async (tx) => {
      await tx.sellerProduct.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false, isHidden: true },
      });
    });

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_PRODUCT_DELETE",
      targetType: "SellerProduct",
      targetId: id,
      before: { name: product.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa sản phẩm" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
