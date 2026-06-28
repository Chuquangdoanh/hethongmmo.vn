import { prisma } from "@/lib/db/prisma";
import { khuongfbGetProducts } from "./client";
import type { KhuongfbRawProduct } from "./types";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export interface SyncResult {
  created: number;
  updated: number;
  total: number;
  syncedAt: Date;
}

function normalizeProduct(raw: KhuongfbRawProduct) {
  // API có thể trả "price" hoặc "giá" (tiếng Việt)
  const rawPrice = raw.price ?? raw["giá"] ?? 0;
  // Category từ field inject khi flatten
  const category = raw.categoryName ?? "Khác";

  return {
    externalId:       String(raw.id),
    externalCategory: category,
    name:             raw.name,
    description:      raw.description ?? raw["mô tả"] ?? null,
    thumbnail:        raw.image ?? null,
    originalPrice:    new Decimal(Number(rawPrice) || 0),
    rawData:          raw as unknown as Prisma.InputJsonValue,
    syncedAt:         new Date(),
  };
}

export async function syncKhuongfbProducts(): Promise<SyncResult> {
  const rawProducts = await khuongfbGetProducts();

  let created = 0;
  let updated = 0;

  for (const raw of rawProducts) {
    const data = normalizeProduct(raw);

    const existing = await prisma.khuongfbProduct.findUnique({
      where: { externalId: data.externalId },
      select: { id: true, salePrice: true },
    });

    if (existing) {
      await prisma.khuongfbProduct.update({
        where: { externalId: data.externalId },
        data: {
          name:             data.name,
          externalCategory: data.externalCategory,
          description:      data.description,
          thumbnail:        data.thumbnail,
          originalPrice:    data.originalPrice,
          rawData:          data.rawData,
          syncedAt:         data.syncedAt,
          // salePrice và isEnabled không bị ghi đè — admin tự quản lý
        },
      });
      updated++;
    } else {
      await prisma.khuongfbProduct.create({
        data: {
          ...data,
          // Mặc định salePrice = originalPrice; admin có thể đổi sau
          salePrice:  data.originalPrice,
          isEnabled:  false,
        },
      });
      created++;
    }
  }

  return { created, updated, total: rawProducts.length, syncedAt: new Date() };
}
