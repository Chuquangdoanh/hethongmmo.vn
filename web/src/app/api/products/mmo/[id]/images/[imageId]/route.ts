import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";
import { deleteProductImage } from "@/lib/services/product-image.service";

export const runtime = "nodejs";

async function resolveImage(productId: string, imageId: string, actorRole: string) {
  if (actorRole !== "STAFF" && actorRole !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN", status: 403, image: null } as const;
  }
  const product = await prisma.mmoProduct.findUnique({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return { ok: false, code: "NOT_FOUND", status: 404, image: null } as const;

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, imageUrl: true, productType: true, productId: true },
  });
  if (!image || image.productType !== "MMO_PRODUCT" || image.productId !== productId) {
    return { ok: false, code: "IMAGE_NOT_FOUND", status: 404, image: null } as const;
  }

  return { ok: true, code: null, status: 200, image } as const;
}

// DELETE /api/products/mmo/[id]/images/[imageId] — chỉ STAFF/ADMIN
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id, imageId } = await params;

    const { ok, code, status, image } = await resolveImage(id, imageId, me.role);
    if (!ok || !image) {
      const msg = code === "NOT_FOUND" ? "Sản phẩm không tồn tại"
        : code === "IMAGE_NOT_FOUND" ? "Ảnh không tồn tại"
        : "Không có quyền";
      return NextResponse.json({ success: false, error: msg, code }, { status });
    }

    await deleteProductImage(imageId);

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_IMAGE_DELETE",
      targetType: "ProductImage",
      targetId: imageId,
      before: { productId: id, imageUrl: image.imageUrl },
    });

    return NextResponse.json({ success: true, message: "Đã xóa ảnh" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
