import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchVariantSchema = z.object({
  variantName:  z.string().min(2, "Tên gói tối thiểu 2 ký tự").max(100).trim().optional(),
  variantPrice: z.number().int("Giá phải là số nguyên").positive("Giá phải lớn hơn 0").optional(),
  warranty:     z.string().min(1, "Bảo hành không được trống").max(50).trim().optional(),
  isActive:     z.boolean().optional(),
});

async function resolveVariant(productId: string, variantId: string, actorRole: string) {
  if (actorRole !== "STAFF" && actorRole !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN", status: 403, variant: null } as const;
  }
  const product = await prisma.mmoProduct.findUnique({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return { ok: false, code: "NOT_FOUND", status: 404, variant: null } as const;

  const variant = await prisma.mmoProductVariant.findUnique({
    where: { id: variantId, productId, deletedAt: null },
    select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true },
  });
  if (!variant) return { ok: false, code: "VARIANT_NOT_FOUND", status: 404, variant: null } as const;

  return { ok: true, code: null, status: 200, variant } as const;
}

// PATCH /api/products/mmo/[id]/variants/[variantId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const session = await auth();
    const me = requireUser(session);
    const { id, variantId } = await params;

    const { ok, code, status, variant } = await resolveVariant(id, variantId, me.role);
    if (!ok || !variant) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "VARIANT_NOT_FOUND" ? "Biến thể không tồn tại"
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

    const updated = await prisma.mmoProductVariant.update({
      where: { id: variantId },
      data: parsed.data,
      select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true, updatedAt: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_VARIANT_UPDATE",
      targetType: "MmoProductVariant",
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

// DELETE /api/products/mmo/[id]/variants/[variantId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id, variantId } = await params;

    const { ok, code, status, variant } = await resolveVariant(id, variantId, me.role);
    if (!ok || !variant) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "VARIANT_NOT_FOUND" ? "Biến thể không tồn tại"
        : "Không có quyền";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    await prisma.mmoProductVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_VARIANT_DELETE",
      targetType: "MmoProductVariant",
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
