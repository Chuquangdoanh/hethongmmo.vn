import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { khuongfbGetProducts, khuongfbGetProductDetail, khuongfbBuyProduct, khuongfbGetOrder } from "./client";
import { KHUONGFB_SOURCE } from "./constants";
import type { KhuongfbRawProduct } from "./types";
import type {
  ExternalProductProvider,
  NormalizedProduct,
  BuyResult,
  ExternalOrderStatus,
} from "@/lib/external-providers/types";

function normalizeProduct(raw: KhuongfbRawProduct): NormalizedProduct {
  const rawPrice = raw.price ?? raw["giá"] ?? 0;
  return {
    externalId:       String(raw.id),
    externalCategory: raw.categoryName ?? "Khác",
    name:             raw.name,
    description:      raw.description ?? raw["mô tả"] ?? null,
    thumbnail:        raw.image ?? null,
    originalPrice:    new Decimal(Number(rawPrice) || 0),
    rawData:          raw as unknown as Prisma.InputJsonValue,
  };
}

async function enrichWithDetail(raw: KhuongfbRawProduct): Promise<KhuongfbRawProduct> {
  const detail = await khuongfbGetProductDetail(String(raw.id));
  if (!detail) return raw;
  // Merge: detail overrides list data, giữ inject fields (categoryId/categoryName)
  return { ...raw, ...detail, categoryId: raw.categoryId, categoryName: raw.categoryName };
}

class KhuongfbAdapter implements ExternalProductProvider {
  readonly providerId = KHUONGFB_SOURCE;

  async getProducts(): Promise<NormalizedProduct[]> {
    const rawProducts = await khuongfbGetProducts();
    const results: NormalizedProduct[] = [];
    // Gọi detail tuần tự để tránh rate limit Khuongfb
    for (const raw of rawProducts) {
      const enriched = await enrichWithDetail(raw);
      results.push(normalizeProduct(enriched));
    }
    return results;
  }

  async buyProduct(externalId: string, quantity: number): Promise<BuyResult> {
    const res = await khuongfbBuyProduct(externalId, quantity);
    const externalOrderId = res.trans_id ?? res.order_id;
    const success = res.status === "success" || res.status === "1" || res.status === "ok";
    if (!success || !externalOrderId) {
      throw new Error(res.msg ?? res.message ?? "Khuongfb từ chối đơn hàng");
    }
    return {
      externalOrderId,
      data: res.data != null ? (res.data as Prisma.InputJsonValue) : null,
    };
  }

  async getOrder(externalOrderId: string): Promise<ExternalOrderStatus> {
    const res = await khuongfbGetOrder(externalOrderId);
    return {
      status:      res.data?.status ?? res.status,
      transId:     res.data?.trans_id,
      remains:     res.data?.remains,
      startCount:  res.data?.start_count,
    };
  }
}

export const khuongfbAdapter = new KhuongfbAdapter();
