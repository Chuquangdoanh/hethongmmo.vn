import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hethongmmo.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dich-vu", "/tai-nguyen-mmo", "/tut-tricks", "/khoa-hoc"],
        disallow: [
          "/api/",
          "/admin/",
          "/quan-ly/",
          "/ho-so/",
          "/gio-hang",
          "/don-hang",
          "/nap-tien",
          "/rut-tien",
          "/thong-bao",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
