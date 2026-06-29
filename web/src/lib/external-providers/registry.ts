import type { ExternalProductProvider } from "./types";

const registry = new Map<string, ExternalProductProvider>();

export function registerProvider(provider: ExternalProductProvider): void {
  registry.set(provider.providerId, provider);
}

export function getProvider(providerId: string): ExternalProductProvider {
  const p = registry.get(providerId);
  if (!p) throw new Error(`Provider "${providerId}" chưa được đăng ký`);
  return p;
}

export function getAllProviders(): ExternalProductProvider[] {
  return Array.from(registry.values());
}
