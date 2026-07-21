import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { KhuongfbCompatibleAdapter } from "./khuongfb-compatible";
import type { ExternalProductProvider } from "./types";

const PROVIDERS_KEY  = "external_provider_configs";
const LEGACY_KFB_KEY = "khuongfb_api_config";

export interface ProviderEntry {
  id:      string;
  name:    string;
  baseUrl: string;
  apiKey:  string;
  enabled: boolean;
  imageUrl?: string;
}

/** Thông tin gian hàng provider an toàn để trả ra client (không có apiKey/baseUrl). */
export interface ProviderPublicInfo {
  id:       string;
  name:     string;
  imageUrl: string | null;
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

export async function loadEnabledAdapters(): Promise<ExternalProductProvider[]> {
  const configs = await getProviderConfigs();
  return configs
    .filter(c => c.enabled)
    .map(c => new KhuongfbCompatibleAdapter({ providerId: c.id, baseUrl: c.baseUrl, apiKey: c.apiKey }));
}

export function maskApiKey(apiKey: string): string {
  return apiKey.slice(0, 8) + "••••••••";
}

/** Danh sách gian hàng provider công khai (chỉ tên + logo) — an toàn cho public page. */
export async function getPublicProviders(): Promise<ProviderPublicInfo[]> {
  const configs = await getProviderConfigs();
  return configs.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl ?? null }));
}

/** Thông tin 1 gian hàng provider theo id (chỉ tên + logo) — null nếu không tồn tại. */
export async function getPublicProviderInfo(id: string): Promise<ProviderPublicInfo | null> {
  const configs = await getProviderConfigs();
  const found = configs.find((c) => c.id === id);
  if (!found) return null;
  return { id: found.id, name: found.name, imageUrl: found.imageUrl ?? null };
}
