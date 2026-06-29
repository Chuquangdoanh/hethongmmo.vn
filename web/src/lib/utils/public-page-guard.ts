import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

// Cache visibility 5 phút per pageKey — config này gần như không đổi
const _visibilityCache = new Map<string, { visible: boolean; exp: number }>();

export function invalidateVisibilityCache(pageKey: string): void {
  _visibilityCache.delete(pageKey);
}

export async function guardPublicPage(pageKey: string): Promise<void> {
  const now = Date.now();
  const hit = _visibilityCache.get(pageKey);
  if (hit && hit.exp > now) {
    if (!hit.visible) notFound();
    return;
  }

  const config = await prisma.publicPageConfig.findUnique({
    where: { pageKey },
    select: { isVisible: true },
  });
  const visible = config?.isVisible !== false;
  _visibilityCache.set(pageKey, { visible, exp: now + 5 * 60_000 });
  if (!visible) notFound();
}
