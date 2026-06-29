import { prisma } from "@/lib/db/prisma";
import { khuongfbGetProducts, khuongfbGetProductDetail } from "./client";
import type { KhuongfbRawProduct } from "./types";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export interface SyncResult {
  created:     number;
  updated:     number;
  deactivated: number;
  total:       number;
  syncedAt:    Date;
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

  const incomingIds = rawProducts.map((r) => String(r.id));

  // Gọi detail từng sản phẩm tuần tự (tránh rate limit Khuongfb)
  // rawData = merge(list data, detail data) để bắt được field trạng thái nếu có
  async function enrichWithDetail(raw: KhuongfbRawProduct): Promise<KhuongfbRawProduct> {
    const detail = await khuongfbGetProductDetail(String(raw.id));
    if (!detail) return raw;
    // Merge: detail overrides list data cho cùng field, giữ inject fields (categoryId/categoryName)
    return { ...raw, ...detail, categoryId: raw.categoryId, categoryName: raw.categoryName };
  }

  for (const raw of rawProducts) {
    const enriched = await enrichWithDetail(raw);
    const data = normalizeProduct(enriched);

    const existing = await prisma.khuongfbProduct.findUnique({
      where: { externalId: data.externalId },
      select: { id: true },
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
          salePrice: data.originalPrice,
          isEnabled: false,
        },
      });
      created++;
    }
  }

  // Tắt sản phẩm không còn tồn tại trong API (đổi API hoặc nhà cung cấp xóa)
  // Không hard-delete để giữ lịch sử đơn hàng
  const { count: deactivated } = incomingIds.length > 0
    ? await prisma.khuongfbProduct.updateMany({
        where: {
          externalId: { notIn: incomingIds },
          isEnabled:  true,
        },
        data: { isEnabled: false },
      })
    : { count: 0 };

  return { created, updated, deactivated, total: rawProducts.length, syncedAt: new Date() };
}
