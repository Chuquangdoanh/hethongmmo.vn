import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/security/audit";
import { listProductImages, addProductImage, deleteProductImage } from "@/lib/services/product-image.service";

export const runtime = "nodejs";

async function requireProduct(id: string) {
  const product = await prisma.externalProduct.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw new NotFoundError("Sản phẩm");
  return product;
}

// GET /api/admin/khuongfb/products/images?id=<productId>
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("Thiếu param id", "MISSING_ID", 400);

    await requireProduct(id);
    const images = await listProductImages("KHUONGFB_PRODUCT", id);

    return apiOk(images);
  } catch (err) {
    return apiCatch(err);
  }
}

const createImageSchema = z.object({
  imageUrl: z.string().min(1, "Thiếu URL ảnh").max(2000, "URL ảnh quá dài"),
});

// POST /api/admin/khuongfb/products/images?id=<productId>
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("Thiếu param id", "MISSING_ID", 400);
    await requireProduct(id);

    const body: unknown = await req.json();
    const parsed = createImageSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const image = await addProductImage("KHUONGFB_PRODUCT", id, parsed.data.imageUrl);

    await writeAuditLog({
      actorId: me.id,
      action: "KHUONGFB_PRODUCT_IMAGE_CREATE",
      targetType: "ProductImage",
      targetId: image.id,
      after: { productId: id, imageUrl: image.imageUrl },
    });

    return apiOk(image, 201);
  } catch (err) {
    return apiCatch(err);
  }
}

// DELETE /api/admin/khuongfb/products/images?id=<productId>&imageId=<imageId>
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const id = req.nextUrl.searchParams.get("id");
    const imageId = req.nextUrl.searchParams.get("imageId");
    if (!id || !imageId) return apiError("Thiếu param id/imageId", "MISSING_ID", 400);
    await requireProduct(id);

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, imageUrl: true, productType: true, productId: true },
    });
    if (!image || image.productType !== "KHUONGFB_PRODUCT" || image.productId !== id) {
      return apiError("Ảnh không tồn tại", "IMAGE_NOT_FOUND", 404);
    }

    await deleteProductImage(imageId);

    await writeAuditLog({
      actorId: me.id,
      action: "KHUONGFB_PRODUCT_IMAGE_DELETE",
      targetType: "ProductImage",
      targetId: imageId,
      before: { productId: id, imageUrl: image.imageUrl },
    });

    return apiOk({ deleted: true });
  } catch (err) {
    return apiCatch(err);
  }
}
