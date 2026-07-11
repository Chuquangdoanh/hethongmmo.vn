import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import type { FavoriteProductType } from "@prisma/client";

export const MAX_PRODUCT_GALLERY_IMAGES = 10;

export async function listProductImages(productType: FavoriteProductType, productId: string) {
  return prisma.productImage.findMany({
    where: { productType, productId },
    orderBy: { createdAt: "asc" },
    select: { id: true, imageUrl: true, createdAt: true },
  });
}

export async function addProductImage(
  productType: FavoriteProductType,
  productId: string,
  imageUrl: string,
) {
  const currentCount = await prisma.productImage.count({ where: { productType, productId } });
  if (currentCount >= MAX_PRODUCT_GALLERY_IMAGES) {
    throw new ValidationError(`Đã đạt giới hạn tối đa ${MAX_PRODUCT_GALLERY_IMAGES} ảnh`);
  }

  return prisma.productImage.create({
    data: { productType, productId, imageUrl },
    select: { id: true, imageUrl: true, createdAt: true },
  });
}

export async function deleteProductImage(id: string) {
  await prisma.productImage.delete({ where: { id } });
}
