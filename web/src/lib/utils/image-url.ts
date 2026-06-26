/**
 * Converts any R2 storage URL or bare key to a CDN URL.
 *
 * cdn.hethongmmo.vn is now connected to R2 as a Cloudflare custom domain —
 * images are served directly from the edge, not proxied through the app server.
 *
 * Safe to use in both Server Components and Client Components (no env vars).
 */

const CDN_BASE = "https://cdn.hethongmmo.vn";

// Old public bucket URLs: https://pub-xxx.r2.dev/{key}
const R2_DEV_RE = /^https?:\/\/[a-z0-9-]+\.r2\.dev\/(.+)$/;

// Absolute proxy URLs (legacy dev fallback): https://domain.com/api/storage/image?key=...
const ABS_PROXY_RE = /^https?:\/\/[^/]+\/api\/storage\/image\?key=(.+)$/;

// Relative proxy URLs: /api/storage/image?key=...
const REL_PROXY_RE = /^\/api\/storage\/image\?key=(.+)$/;

// Known storage key prefixes (mirrors ALLOWED_PREFIXES in /api/storage/image/route.ts)
const KNOWN_KEY_PREFIXES = [
  "avatar/",
  "product-image/",
  "course-thumbnail/",
  "service-thumbnail/",
  "mmo-thumbnail/",
  "tut-trick-thumbnail/",
  "testimonial-avatar/",
  "resource-icon/",
  "course-icon/",
  "service-icon/",
];

const CMS_RAW_KEY_RE = /^cms-[a-z][a-z0-9-]*\//;

export function r2Url(url: string | null | undefined): string {
  if (!url) return "";

  // Already a CDN URL — return as-is (fast path for new uploads)
  if (url.startsWith(`${CDN_BASE}/`)) return url;

  // Old r2.dev URL → convert to CDN
  const r2DevMatch = R2_DEV_RE.exec(url);
  if (r2DevMatch?.[1]) return `${CDN_BASE}/${r2DevMatch[1]}`;

  // Absolute proxy URL (dev fallback) → extract key → CDN
  const absMatch = ABS_PROXY_RE.exec(url);
  if (absMatch?.[1]) return `${CDN_BASE}/${decodeURIComponent(absMatch[1])}`;

  // Relative proxy URL (/api/storage/image?key=...) → extract key → CDN
  const relMatch = REL_PROXY_RE.exec(url);
  if (relMatch?.[1]) return `${CDN_BASE}/${decodeURIComponent(relMatch[1])}`;

  // Raw storage key stored in DB without domain
  if (
    !url.startsWith("http") &&
    !url.startsWith("/") &&
    (KNOWN_KEY_PREFIXES.some((p) => url.startsWith(p)) || CMS_RAW_KEY_RE.test(url))
  ) {
    return `${CDN_BASE}/${url}`;
  }

  // Static files, external images, etc. — unchanged
  return url;
}
