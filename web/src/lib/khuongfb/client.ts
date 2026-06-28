import { KHUONGFB_BASE_URL, KHUONGFB_ENDPOINTS, KHUONGFB_TIMEOUT_MS } from "./constants";
import type {
  KhuongfbProfile,
  KhuongfbRawProduct,
  KhuongfbBuyResponse,
  KhuongfbOrderResponse,
} from "./types";

// ── Config cache (đọc từ DB, fallback sang env) ──────────────────────────────

interface KfbConfig { baseUrl: string; apiKey: string }

let _cachedConfig: KfbConfig | null = null;
let _cacheExpiry = 0;

export function invalidateKhuongfbConfigCache() {
  _cachedConfig = null;
  _cacheExpiry  = 0;
}

async function getConfig(): Promise<KfbConfig> {
  if (_cachedConfig && Date.now() < _cacheExpiry) return _cachedConfig;

  try {
    // Dynamic import để tránh circular nếu prisma được mock trong tests
    const { prisma } = await import("@/lib/db/prisma");
    const record = await prisma.systemConfig.findUnique({ where: { key: "khuongfb_api_config" } });
    const val = record?.value as { baseUrl?: string; apiKey?: string } | null;
    if (val?.baseUrl && val?.apiKey) {
      _cachedConfig = { baseUrl: val.baseUrl, apiKey: val.apiKey };
      _cacheExpiry  = Date.now() + 60_000;
      return _cachedConfig;
    }
  } catch {
    // Bỏ qua lỗi DB — fallback sang env
  }

  // Fallback: đọc từ .env
  const apiKey = process.env.KHUONGFB_API_KEY;
  if (!apiKey) throw new Error("KHUONGFB_API_KEY chưa được cấu hình trong .env hoặc SystemConfig");
  return { baseUrl: KHUONGFB_BASE_URL, apiKey };
}

async function khuongfbGet<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { baseUrl, apiKey } = await getConfig();
  const url = new URL(baseUrl + endpoint);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KHUONGFB_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Khuongfb HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Khuongfb trả về không phải JSON: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Khuongfb timeout sau ${KHUONGFB_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function khuongfbPost<T>(endpoint: string, body: Record<string, string>): Promise<T> {
  const { baseUrl, apiKey } = await getConfig();
  const form = new URLSearchParams({ ...body, api_key: apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KHUONGFB_TIMEOUT_MS);

  try {
    const res = await fetch(baseUrl + endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Khuongfb HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function khuongfbGetProfile(): Promise<KhuongfbProfile> {
  return khuongfbGet<KhuongfbProfile>(KHUONGFB_ENDPOINTS.profile);
}

export async function khuongfbGetProducts(): Promise<KhuongfbRawProduct[]> {
  const res = await khuongfbGet<Record<string, unknown>>(KHUONGFB_ENDPOINTS.products);

  // Format thực tế: { status, msg, categories: [{id, name, products: [...]}] }
  if (Array.isArray(res["categories"])) {
    const categories = res["categories"] as Array<{ id: string; name: string; products?: KhuongfbRawProduct[] }>;
    return categories.flatMap(cat =>
      (cat.products ?? []).map(p => ({ ...p, categoryId: String(cat.id), categoryName: cat.name }))
    );
  }

  // Fallback cho các format khác
  if (Array.isArray(res)) return res as KhuongfbRawProduct[];
  if (Array.isArray(res["data"])) return res["data"] as KhuongfbRawProduct[];
  if (Array.isArray(res["products"])) return res["products"] as KhuongfbRawProduct[];
  return [];
}

export async function khuongfbBuyProduct(externalId: string, amount: number): Promise<KhuongfbBuyResponse> {
  return khuongfbPost<KhuongfbBuyResponse>(KHUONGFB_ENDPOINTS.buy, {
    action: "buyProduct",
    id: String(externalId),
    amount: String(amount),
  });
}

export async function khuongfbGetOrder(transId: string): Promise<KhuongfbOrderResponse> {
  return khuongfbGet<KhuongfbOrderResponse>(KHUONGFB_ENDPOINTS.order, { order: transId });
}
