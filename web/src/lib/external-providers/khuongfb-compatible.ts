import { setDefaultResultOrder } from "dns";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import type { ExternalProductProvider, NormalizedProduct, BuyResult, ExternalOrderStatus } from "./types";

// Ép IPv4 trước để tránh bị chặn bởi whitelist IP của provider khi ISP cấp IPv6 mặc định
setDefaultResultOrder("ipv4first");

const TIMEOUT_MS = 15_000;

interface RawProduct {
  id:            string | number;
  name:          string;
  price?:        string | number;
  "giá"?:        string | number;
  description?:  string;
  "mô tả"?:      string;
  image?:        string;
  amount?:       number;
  "số tiền"?:    number;
  categoryId?:   string;
  categoryName?: string;
  [key: string]: unknown;
}

interface BuyApiResponse {
  status:    string;
  msg?:      string;
  message?:  string;
  trans_id?: string;
  order_id?: string;
  data?:     unknown;
}

interface OrderApiResponse {
  status: string;
  data?: {
    trans_id?:   string;
    status?:     string;
    remains?:    number;
    start_count?: number;
  };
}

async function httpGet<T>(baseUrl: string, apiKey: string, endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(baseUrl + endpoint);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method:  "GET",
      signal:  controller.signal,
      headers: { Accept: "application/json" },
      cache:   "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const text = await res.text();
    if (text.includes("IP bị chặn") || text.includes("IP b&#7883;") || text.includes("b&#7883; ch&#7863;n")) {
      throw new Error("IP server bị chặn. Vào tài khoản → Cài đặt → Whitelist IP, sau đó thử lại.");
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error(`Timeout sau ${TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function httpPost<T>(baseUrl: string, apiKey: string, endpoint: string, body: Record<string, string>): Promise<T> {
  const form = new URLSearchParams({ ...body, api_key: apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(baseUrl + endpoint, {
      method:  "POST",
      signal:  controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    form.toString(),
      cache:   "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      try {
        const json = JSON.parse(text) as { msg?: string; message?: string };
        const msg = json.msg ?? json.message;
        if (msg) throw new Error(msg);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== text) throw parseErr;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeRaw(raw: RawProduct): NormalizedProduct {
  const rawPrice = raw.price ?? raw["giá"] ?? 0;
  return {
    externalId:       String(raw.id),
    externalCategory: raw.categoryName ?? "Khác",
    name:             raw.name,
    description:      (raw.description ?? raw["mô tả"] ?? null) as string | null,
    thumbnail:        (raw.image ?? null) as string | null,
    originalPrice:    new Decimal(Number(rawPrice) || 0),
    rawData:          raw as unknown as Prisma.InputJsonValue,
  };
}

const DETAIL_FETCH_CONCURRENCY = 5;

// Gọi detail với giới hạn số request đồng thời — tránh vừa bị rate-limit (chạy song song vô hạn)
// vừa tránh timeout Nginx (chạy tuần tự 100% quá chậm khi catalog lớn)
async function mapWithConcurrency<T, R>(
  items:       T[],
  concurrency: number,
  fn:          (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export interface KfbCompatibleConfig {
  providerId: string;
  baseUrl:    string;
  apiKey:     string;
}

export class KhuongfbCompatibleAdapter implements ExternalProductProvider {
  constructor(private readonly cfg: KfbCompatibleConfig) {}

  get providerId() { return this.cfg.providerId; }

  async getProducts(): Promise<NormalizedProduct[]> {
    const res = await httpGet<Record<string, unknown>>(this.cfg.baseUrl, this.cfg.apiKey, "/products.php");

    let rawProducts: RawProduct[] = [];
    if (Array.isArray(res["categories"])) {
      const cats = res["categories"] as Array<{ id: string; name: string; products?: RawProduct[] }>;
      rawProducts = cats.flatMap(c => (c.products ?? []).map(p => ({ ...p, categoryId: String(c.id), categoryName: c.name })));
    } else if (Array.isArray(res)) {
      rawProducts = res as RawProduct[];
    } else if (Array.isArray(res["data"])) {
      rawProducts = res["data"] as RawProduct[];
    } else if (Array.isArray(res["products"])) {
      rawProducts = res["products"] as RawProduct[];
    }

    // Giới hạn số request detail chạy đồng thời — vừa tránh rate limit, vừa tránh timeout
    // khi catalog lớn (gọi tuần tự 100% dễ vượt quá proxy_read_timeout của Nginx)
    return mapWithConcurrency(rawProducts, DETAIL_FETCH_CONCURRENCY, async (raw) => {
      try {
        const detail = await httpGet<Record<string, unknown>>(this.cfg.baseUrl, this.cfg.apiKey, "/product.php", { product: String(raw.id) });
        const dp = (detail["data"] && typeof detail["data"] === "object" ? detail["data"] : detail["id"] !== undefined ? detail : null) as RawProduct | null;
        const enriched: RawProduct = dp
          ? { ...raw, ...dp, categoryId: raw.categoryId, categoryName: raw.categoryName }
          : raw;
        return normalizeRaw(enriched);
      } catch {
        return normalizeRaw(raw);
      }
    });
  }

  async buyProduct(externalId: string, quantity: number): Promise<BuyResult> {
    const res = await httpPost<BuyApiResponse>(this.cfg.baseUrl, this.cfg.apiKey, "/buy_product", {
      action: "buyProduct",
      id:     externalId,
      amount: String(quantity),
    });
    const externalOrderId = res.trans_id ?? res.order_id;
    const success = res.status === "success" || res.status === "1" || res.status === "ok";
    if (!success || !externalOrderId) {
      throw new Error(res.msg ?? res.message ?? "API từ chối đơn hàng");
    }
    return {
      externalOrderId,
      data: res.data != null ? (res.data as Prisma.InputJsonValue) : null,
    };
  }

  async getOrder(externalOrderId: string): Promise<ExternalOrderStatus> {
    const res = await httpGet<OrderApiResponse>(this.cfg.baseUrl, this.cfg.apiKey, "/order.php", { order: externalOrderId });
    return {
      status:     res.data?.status ?? res.status,
      transId:    res.data?.trans_id,
      remains:    res.data?.remains,
      startCount: res.data?.start_count,
    };
  }
}
