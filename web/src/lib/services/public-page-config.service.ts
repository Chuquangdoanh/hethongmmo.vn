import { prisma } from "@/lib/db/prisma";
import { PUBLIC_PAGES } from "@/lib/page-registry";

export interface PublicPageConfigEntry {
  pageKey: string;
  defaultLabel: string;
  isVisible: boolean;
  isFeatured: boolean;
  customLabel: string | null;
}

export async function getPublicPageConfigs(): Promise<PublicPageConfigEntry[]> {
  const records = await prisma.publicPageConfig.findMany();
  const map = Object.fromEntries(records.map((r) => [r.pageKey, r]));

  return PUBLIC_PAGES.map((page) => ({
    pageKey: page.key,
    defaultLabel: page.label,
    isVisible: map[page.key]?.isVisible ?? true,
    isFeatured: map[page.key]?.isFeatured ?? false,
    customLabel: map[page.key]?.customLabel ?? null,
  }));
}

// Luôn đọc DB tươi — nhất quán với guardPublicPage, tránh stale cache
export function getCachedPageVisibility() {
  return prisma.publicPageConfig.findMany({
    select: { pageKey: true, isVisible: true, isFeatured: true },
  });
}

export async function savePublicPageConfigs(
  configs: Array<{ pageKey: string; isVisible: boolean; isFeatured: boolean; customLabel: string | null }>,
): Promise<void> {
  await prisma.$transaction(
    configs.map((cfg) =>
      prisma.publicPageConfig.upsert({
        where: { pageKey: cfg.pageKey },
        create: { pageKey: cfg.pageKey, isVisible: cfg.isVisible, isFeatured: cfg.isFeatured, customLabel: cfg.customLabel },
        update: { isVisible: cfg.isVisible, isFeatured: cfg.isFeatured, customLabel: cfg.customLabel },
      }),
    ),
  );
}
