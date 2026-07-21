import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import type { ExternalProductProvider, NormalizedProduct, BuyResult, ExternalOrderStatus } from "./types";

const BASE_URL = "https://portal.vncloud.net";
const TIMEOUT_MS = 15_000;

export interface VnCloudConfig {
  providerId:  string;
  apiUsername: string;
  apiApp:      string;
  apiSecret:   string;
}

interface VnCloudPricingEntry {
  billing_cycle: string;
  amount:        number;
}

interface VnCloudOsOption {
  "os-id":   number;
  "os-name": string;
}

interface VnCloudRawProduct {
  product_id: number;
  name:       string;
  special:    number;
  cpu:        number;
  ram:        number;
  disk:       number;
  ip?:        string;
  os?:        string;
  bandwidth?: string;
  pricing:    Record<string, VnCloudPricingEntry>;
}

interface VnCloudGroup {
  group_product_name: string;
  // "product" trộn lẫn key số (từng sản phẩm) và key "limit-os" (danh sách OS của cả nhóm)
  product: Record<string, VnCloudRawProduct | VnCloudOsOption[]>;
}

interface VnCloudGetProductResponse {
  error:    number;
  message?: string;
  products?: { vps?: VnCloudGroup[] };
}

interface VnCloudGetTokenResponse {
  error:    number;
  message?: string;
  "auth-token"?: string;
}

interface VnCloudCreateOrderResponse {
  error:    number;
  message?: string;
  credit?:  number;
  total?:   number;
  data?:    Array<Record<string, unknown>>;
}

interface VnCloudGetInfoVpsResponse {
  error:    number;
  message?: string;
  data?:    Array<Record<string, unknown>>;
}

async function vncloudFetch<T>(
  path:      string,
  method:    "GET" | "POST",
  cfg:       VnCloudConfig,
  authToken: string | null,
  body?:     Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-username": cfg.apiUsername,
      "api-app":      cfg.apiApp,
      "api-secret":   cfg.apiSecret,
    };
    if (authToken) headers["auth-token"] = authToken;

    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body:   body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache:  "no-store",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error(`Timeout sau ${TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeVnCloudProduct(raw: VnCloudRawProduct, groupName: string, limitOs: VnCloudOsOption[]): NormalizedProduct {
  const pricingValues = Object.values(raw.pricing ?? {});
  const monthlyPrice = raw.pricing?.monthly?.amount ?? pricingValues[0]?.amount ?? 0;
  const description = `CPU: ${raw.cpu} core · RAM: ${raw.ram}GB · Ổ đĩa: ${raw.disk}GB · Băng thông: ${raw.bandwidth ?? "N/A"}`;

  return {
    externalId:       String(raw.product_id),
    externalCategory: groupName,
    name:             raw.name,
    description,
    thumbnail:        null,
    originalPrice:    new Decimal(monthlyPrice),
    rawData:          { ...raw, limitOs, groupName } as unknown as Prisma.InputJsonValue,
  };
}

export class VnCloudAdapter implements ExternalProductProvider {
  constructor(private readonly cfg: VnCloudConfig) {}

  get providerId() { return this.cfg.providerId; }

  private async getAuthToken(): Promise<string> {
    const res = await vncloudFetch<VnCloudGetTokenResponse>("/api/agency/get-token", "POST", this.cfg, null, {
      "api-username": this.cfg.apiUsername,
      "api-app":      this.cfg.apiApp,
      "api-secret":   this.cfg.apiSecret,
    });
    if (res.error !== 0 || !res["auth-token"]) throw new Error(res.message ?? "Không lấy được auth-token VNCloud");
    return res["auth-token"];
  }

  async getProducts(): Promise<NormalizedProduct[]> {
    const authToken = await this.getAuthToken();
    const res = await vncloudFetch<VnCloudGetProductResponse>("/api/agency/get-product", "GET", this.cfg, authToken);
    if (res.error !== 0) throw new Error(res.message ?? "Không lấy được danh sách sản phẩm VNCloud");

    const results: NormalizedProduct[] = [];
    for (const group of res.products?.vps ?? []) {
      const entries = Object.entries(group.product ?? {});
      const limitOs = (entries.find(([key]) => key === "limit-os")?.[1] as VnCloudOsOption[] | undefined) ?? [];
      for (const [key, value] of entries) {
        if (key === "limit-os") continue;
        results.push(normalizeVnCloudProduct(value as VnCloudRawProduct, group.group_product_name, limitOs));
      }
    }
    return results;
  }

  async buyProduct(externalId: string, quantity: number, options?: Record<string, unknown>): Promise<BuyResult> {
    const billingCycle = options?.["billingCycle"];
    const os = options?.["os"];
    if (typeof billingCycle !== "string" || !billingCycle) throw new Error("Thiếu chu kỳ thuê (billingCycle)");
    if (typeof os !== "number") throw new Error("Thiếu hệ điều hành (os)");
    if (quantity < 1 || quantity > 50) throw new Error("Số lượng phải từ 1 đến 50");

    const authToken = await this.getAuthToken();
    const res = await vncloudFetch<VnCloudCreateOrderResponse>("/api/agency/order/create-order", "POST", this.cfg, authToken, {
      "product-id":  externalId,
      "billing-cycle": billingCycle,
      "os":          os,
      "quantity":    quantity,
      "addon-cpu":   0,
      "addon-ram":   0,
      "addon-disk":  0,
    });
    if (res.error !== 0) throw new Error(res.message ?? "Tạo đơn VNCloud thất bại");

    const first = res.data?.[0];
    const vpsId = first?.["vps-id"];
    if (vpsId === undefined) throw new Error("VNCloud không trả về thông tin VPS");

    return {
      externalOrderId: String(vpsId),
      data:            (res.data ?? null) as unknown as Prisma.InputJsonValue | null,
    };
  }

  async getOrder(externalOrderId: string): Promise<ExternalOrderStatus> {
    const authToken = await this.getAuthToken();
    const res = await vncloudFetch<VnCloudGetInfoVpsResponse>("/api/agency/vps/get-info-vps", "GET", this.cfg, authToken, {
      "vps-id": Number(externalOrderId),
    });
    if (res.error !== 0) throw new Error(res.message ?? "Không lấy được trạng thái VPS");

    const info = res.data?.[0] ?? {};
    return {
      status:  String(info["vps-status"] ?? "unknown"),
      transId: externalOrderId,
    };
  }
}
