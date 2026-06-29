import { prisma } from "@/lib/db/prisma";
import { PUBLIC_PAGES } from "@/lib/page-registry";
import { invalidateVisibilityCache } from "@/lib/utils/public-page-guard";

export interface PublicPageConfigEntry {
  pageKey: string;
  defaultLabel: string;
  isVisible: boolean;
  isFeatured: boolean;
  customLabel: string | null;
  isStatic: boolean;
}

const STATIC_KEYS = new Set(PUBLIC_PAGES.map((p) => p.key));

export async function getPublicPageConfigs(): Promise<PublicPageConfigEntry[]> {
  const records = await prisma.publicPageConfig.findMany({ orderBy: { updatedAt: "asc" } });
  const map = Object.fromEntries(records.map((r) => [r.pageKey, r]));

  const staticEntries: PublicPageConfigEntry[] = PUBLIC_PAGES.map((page) => ({
    pageKey:      page.key,
    defaultLabel: page.label,
    isVisible:    map[page.key]?.isVisible  ?? true,
    isFeatured:   map[page.key]?.isFeatured ?? false,
    customLabel:  map[page.key]?.customLabel ?? null,
    isStatic:     true,
  }));

  const dynamicEntries: PublicPageConfigEntry[] = records
    .filter((r) => !STATIC_KEYS.has(r.pageKey))
    .map((r) => ({
      pageKey:      r.pageKey,
      defaultLabel: r.customLabel ?? r.pageKey,
      isVisible:    r.isVisible,
      isFeatured:   r.isFeatured,
      customLabel:  r.customLabel,
      isStatic:     false,
    }));

  return [...staticEntries, ...dynamicEntries];
}

export async function createPublicPageConfig(pageKey: string, label: string): Promise<void> {
  await prisma.publicPageConfig.create({
    data: { pageKey, isVisible: true, isFeatured: false, customLabel: label },
  });
}

export async function deletePublicPageConfig(pageKey: string): Promise<void> {
  if (STATIC_KEYS.has(pageKey)) throw new Error("Không thể xóa trang tĩnh đã đăng ký trong registry");
  await prisma.publicPageConfig.delete({ where: { pageKey } });
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
  // Xóa cache guardPublicPage để trang hiện ngay khi bật lại — không cần chờ 5 phút
  for (const cfg of configs) {
    invalidateVisibilityCache(cfg.pageKey);
  }
}
