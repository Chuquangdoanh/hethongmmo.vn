import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchVariantSchema = z.object({
  variantName:  z.string().min(2, "Tên gói tối thiểu 2 ký tự").max(100, "Tên gói tối đa 100 ký tự").trim().optional(),
  variantPrice: z.number().int("Giá phải là số nguyên").positive("Giá phải lớn hơn 0").optional(),
  warranty:     z.string().min(1, "Bảo hành không được trống").max(50, "Bảo hành tối đa 50 ký tự").trim().optional(),
  isActive:     z.boolean().optional(),
});

async function resolveVariant(
  productId: string,
  variantId: string,
  actorId: string,
  actorRole: string,
) {
  const product = await prisma.sellerProduct.findUnique({
    where: { id: productId, deletedAt: null },
    select: { id: true, sellerId: true, name: true, isRestricted: true },
  });
  if (!product) return { ok: false, code: "NOT_FOUND", status: 404, product: null, variant: null } as const;

  const isAdminOrStaff = actorRole === "ADMIN" || actorRole === "STAFF";
  const isOwner = product.sellerId === actorId;
  if (!isOwner && !isAdminOrStaff) return { ok: false, code: "FORBIDDEN", status: 403, product: null, variant: null } as const;
  if (product.isRestricted && !isAdminOrStaff) return { ok: false, code: "PRODUCT_RESTRICTED", status: 403, product: null, variant: null } as const;

  const variant = await prisma.sellerProductVariant.findUnique({
    where: { id: variantId, productId, deletedAt: null },
    select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true },
  });
  if (!variant) return { ok: false, code: "VARIANT_NOT_FOUND", status: 404, product, variant: null } as const;

  return { ok: true, code: null, status: 200, product, variant } as const;
}

// PATCH /api/seller/products/[id]/variants/[variantId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const session = await auth();
    const me = requireUser(session);
    const { id, variantId } = await params;

    if (me.role === "USER") {
      return NextResponse.json({ success: false, error: "Không có quyền", code: "FORBIDDEN" }, { status: 403 });
    }

    const { ok, code, status, variant } = await resolveVariant(id, variantId, me.id, me.role);
    if (!ok || !variant) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "VARIANT_NOT_FOUND" ? "Biến thể không tồn tại"
        : code === "PRODUCT_RESTRICTED" ? "Sản phẩm đang bị khóa bởi admin"
        : "Không có quyền";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    const parsed = patchVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ success: false, error: "Không có trường nào cần cập nhật", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const updated = await prisma.sellerProductVariant.update({
      where: { id: variantId },
      data: parsed.data,
      select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true, updatedAt: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_PRODUCT_VARIANT_UPDATE",
      targetType: "SellerProductVariant",
      targetId: variantId,
      before: { variantName: variant.variantName, variantPrice: Number(variant.variantPrice), warranty: variant.warranty },
      after: parsed.data as Record<string, string | number | boolean>,
    });

    return NextResponse.json({ success: true, data: { ...updated, variantPrice: Number(updated.variantPrice) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// DELETE /api/seller/products/[id]/variants/[variantId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id, variantId } = await params;

    if (me.role === "USER") {
      return NextResponse.json({ success: false, error: "Không có quyền", code: "FORBIDDEN" }, { status: 403 });
    }

    const { ok, code, status, variant } = await resolveVariant(id, variantId, me.id, me.role);
    if (!ok || !variant) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "VARIANT_NOT_FOUND" ? "Biến thể không tồn tại"
        : code === "PRODUCT_RESTRICTED" ? "Sản phẩm đang bị khóa bởi admin"
        : "Không có quyền";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    await prisma.sellerProductVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_PRODUCT_VARIANT_DELETE",
      targetType: "SellerProductVariant",
      targetId: variantId,
      before: { variantName: variant.variantName, variantPrice: Number(variant.variantPrice) },
    });

    return NextResponse.json({ success: true, message: "Đã xóa biến thể" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
