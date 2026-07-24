import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { KhuongfbCompatibleAdapter } from "./khuongfb-compatible";
import { VnCloudAdapter } from "./vncloud-adapter";
import type { ExternalProductProvider } from "./types";

const PROVIDERS_KEY  = "external_provider_configs";
const LEGACY_KFB_KEY = "khuongfb_api_config";

export type ProviderType = "khuongfb" | "vncloud";

export interface ProviderEntry {
  id:          string;
  name:        string;
  providerType?: ProviderType; // mặc định "khuongfb" nếu thiếu (config cũ trước khi có VNCloud)
  // khuongfb-compatible
  baseUrl?:    string;
  apiKey?:     string;
  // vncloud
  apiUsername?: string;
  apiApp?:      string;
  apiSecret?:   string;
  enabled:     boolean;
  imageUrl?:   string;
  /** Hạng gian hàng — key tham chiếu SellerTierDefinition (gán trong admin, hiện badge). */
  tierKey?:    string;
}

/** Thông tin gian hàng provider an toàn để trả ra client (không có apiKey/baseUrl). */
export interface ProviderPublicInfo {
  id:         string;
  name:       string;
  imageUrl:   string | null;
  /** Slug công khai (opaque, cố định/provider) — dùng trong URL, ẩn id/nguồn thật. */
  publicSlug: string;
  /** Hạng gian hàng (key SellerTierDefinition) — null nếu chưa gán. */
  tierKey:    string | null;
}

/**
 * Slug công khai của provider dùng trong URL — chuỗi hex 12 ký tự, ổn định theo id,
 * trông ngẫu nhiên nên KHÔNG lộ hostname/email nguồn. Không cần lưu thêm vào config.
 */
export function providerPublicSlug(id: string): string {
  return createHash("sha256").update(`hethongmmo:provider:${id}`).digest("hex").slice(0, 12);
}

interface ProvidersConfig {
  providers: ProviderEntry[];
}

export async function getProviderConfigs(): Promise<ProviderEntry[]> {
  const record = await prisma.systemConfig.findUnique({ where: { key: PROVIDERS_KEY } });
  if (record) {
    return ((record.value as unknown as ProvidersConfig).providers) ?? [];
  }

  // Migrate config đơn cũ nếu có
  const legacy = await prisma.systemConfig.findUnique({ where: { key: LEGACY_KFB_KEY } });
  const legacyVal = legacy?.value as { baseUrl?: string; apiKey?: string } | null;
  if (legacyVal?.baseUrl && legacyVal?.apiKey) {
    return [{ id: "khuongfb", name: "KhuongFB", baseUrl: legacyVal.baseUrl, apiKey: legacyVal.apiKey, enabled: true }];
  }

  // Fallback sang .env
  const apiKey = process.env.KHUONGFB_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.KHUONGFB_BASE_URL ?? "https://khuongfb.com/api";
    return [{ id: "khuongfb", name: "KhuongFB", baseUrl, apiKey, enabled: true }];
  }

  return [];
}

export async function saveProviderConfigs(providers: ProviderEntry[], actorId?: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where:  { key: PROVIDERS_KEY },
    create: { key: PROVIDERS_KEY, value: { providers } as unknown as Prisma.InputJsonObject, description: "Cấu hình đa nhà cung cấp API (KhuongFB-compatible)", updatedByUserId: actorId ?? null },
    update: { value: { providers } as unknown as Prisma.InputJsonObject, updatedByUserId: actorId ?? null },
  });
}

export async function loadEnabledAdapters(excludeProviderTypes: ProviderType[] = []): Promise<ExternalProductProvider[]> {
  const configs = await getProviderConfigs();
  return configs
    .filter(c => c.enabled)
    .filter(c => !excludeProviderTypes.includes(c.providerType ?? "khuongfb"))
    .map(c => buildAdapter(c));
}

function buildAdapter(c: ProviderEntry): ExternalProductProvider {
  if ((c.providerType ?? "khuongfb") === "vncloud") {
    if (!c.apiUsername || !c.apiApp || !c.apiSecret) {
      throw new Error(`Provider VNCloud "${c.name}" thiếu apiUsername/apiApp/apiSecret`);
    }
    return new VnCloudAdapter({ providerId: c.id, apiUsername: c.apiUsername, apiApp: c.apiApp, apiSecret: c.apiSecret });
  }
  if (!c.baseUrl || !c.apiKey) {
    throw new Error(`Provider "${c.name}" thiếu baseUrl/apiKey`);
  }
  return new KhuongfbCompatibleAdapter({ providerId: c.id, baseUrl: c.baseUrl, apiKey: c.apiKey });
}

export function maskApiKey(apiKey: string): string {
  return apiKey.slice(0, 8) + "••••••••";
}

function toPublicInfo(c: ProviderEntry): ProviderPublicInfo {
  return {
    id: c.id, name: c.name, imageUrl: c.imageUrl ?? null,
    publicSlug: providerPublicSlug(c.id), tierKey: c.tierKey ?? null,
  };
}

/** Danh sách gian hàng provider công khai (chỉ tên + logo + slug) — an toàn cho public page. */
export async function getPublicProviders(): Promise<ProviderPublicInfo[]> {
  const configs = await getProviderConfigs();
  return configs.map(toPublicInfo);
}

/** Thông tin 1 gian hàng provider theo id — null nếu không tồn tại. */
export async function getPublicProviderInfo(id: string): Promise<ProviderPublicInfo | null> {
  const configs = await getProviderConfigs();
  const found = configs.find((c) => c.id === id);
  return found ? toPublicInfo(found) : null;
}

/** Thông tin 1 gian hàng provider theo slug công khai — null nếu không tồn tại. */
export async function getProviderInfoBySlug(slug: string): Promise<ProviderPublicInfo | null> {
  const configs = await getProviderConfigs();
  const found = configs.find((c) => providerPublicSlug(c.id) === slug);
  return found ? toPublicInfo(found) : null;
}

/** Loại provider (khuongfb-compatible hay vncloud) theo id — null nếu không tồn tại. */
export async function getProviderType(id: string): Promise<ProviderType | null> {
  const configs = await getProviderConfigs();
  const found = configs.find((c) => c.id === id);
  return found ? (found.providerType ?? "khuongfb") : null;
}
