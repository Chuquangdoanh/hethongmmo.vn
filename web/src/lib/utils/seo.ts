import type { Metadata } from "next";

const SITE_NAME = "hethongmmo.vn";
export const DEFAULT_OG_IMAGE = "/images/hethong.png";

export function buildMeta(opts: {
  title: string;
  description: string;
  url?: string;
  image?: string | null;
}): Metadata {
  const image = opts.image ?? DEFAULT_OG_IMAGE;
  return {
    title: opts.title,
    description: opts.description,
    openGraph: {
      title: opts.title,
      description: opts.description,
      ...(opts.url ? { url: opts.url } : {}),
      siteName: SITE_NAME,
      locale: "vi_VN",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}
