import { prisma } from "@/lib/db/prisma";
import { extractKhuongfbStockAmount } from "@/lib/khuongfb/types";
import type { ExternalProductProvider, SyncResult } from "./types";

export async function syncProvider(provider: ExternalProductProvider): Promise<SyncResult> {
  const startedAt = Date.now();
  const products = await provider.getProducts();
  const incomingIds = products.map(p => p.externalId);
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const existing = await prisma.externalProduct.findFirst({
      where: { provider: provider.providerId, externalId: product.externalId },
      select: { id: true, resourceCategoryId: true },
    });

    if (existing) {
      // Tự động ẩn/hiện theo tồn kho — chỉ áp dụng cho sản phẩm admin đã duyệt (có resourceCategoryId),
      // tránh sản phẩm mới chưa được admin xét duyệt bị tự động hiện lên marketplace.
      const stock = extractKhuongfbStockAmount(product.rawData);
      const stockToggle = existing.resourceCategoryId && stock !== null ? { isEnabled: stock > 0 } : {};

      await prisma.externalProduct.update({
        where: { id: existing.id },
        data: {
          name:             product.name,
          externalCategory: product.externalCategory,
          description:      product.description,
          originalPrice:    product.originalPrice,
          rawData:          product.rawData,
          syncedAt:         new Date(),
          ...stockToggle,
          // thumbnail, salePrice không bị ghi đè — admin tự quản lý
        },
      });
      updated++;
    } else {
      await prisma.externalProduct.create({
        data: {
          provider:         provider.providerId,
          externalId:       product.externalId,
          externalCategory: product.externalCategory,
          name:             product.name,
          description:      product.description,
          thumbnail:        product.thumbnail,
          originalPrice:    product.originalPrice,
          salePrice:        product.originalPrice,
          rawData:          product.rawData,
          syncedAt:         new Date(),
          isEnabled:        false,
        },
      });
      created++;
    }
  }

  // Deactivate scoped theo provider — không ảnh hưởng provider khác
  const { count: deactivated } = incomingIds.length > 0
    ? await prisma.externalProduct.updateMany({
        where: {
          provider:   provider.providerId,
          externalId: { notIn: incomingIds },
          isEnabled:  true,
        },
        data: { isEnabled: false },
      })
    : { count: 0 };

  return {
    created,
    updated,
    deactivated,
    total:      products.length,
    syncedAt:   new Date(),
    durationMs: Date.now() - startedAt,
  };
}
