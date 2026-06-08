import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://hethongmmo.vn";
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                       lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/dich-vu`,          lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/tai-nguyen-mmo`,   lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/tut-tricks`,       lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/khoa-hoc`,         lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/lien-he`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/chinh-sach`,       lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/dieu-khoan`,       lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Dynamic: tut-tricks articles
  const tutTricks = await prisma.tutTrick.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const tutRoutes: MetadataRoute.Sitemap = tutTricks.map((t) => ({
    url: `${base}/tut-tricks/${t.id}`,
    lastModified: t.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...tutRoutes];
}
