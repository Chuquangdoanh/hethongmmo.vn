/**
 * Converts any R2 storage URL (CDN, r2.dev, raw key, or absolute proxy) to a
 * server-side proxy URL: /api/storage/image?key=<encoded-key>
 *
 * Problem: cdn.hethongmmo.vn DNS resolves to the VPS, not R2 → returns HTML.
 *          Old uploads used pub-xxx.r2.dev public bucket URLs.
 *          Some DB records store bare storage keys without a domain.
 *
 * Fix: route all R2 image URLs through /api/storage/image?key=... proxy.
 *      When cdn.hethongmmo.vn is properly connected to R2 as a Cloudflare
 *      custom domain, this function can be removed (or return url directly).
 *
 * Safe to use in both Server Components and Client Components (no env vars).
 */

// Matches: https://cdn.hethongmmo.vn/{key}
//      or: https://pub-xxx.r2.dev/{key}  (old public bucket URLs)
const R2_URL_RE =
  /^https?:\/\/(?:cdn\.hethongmmo\.vn|[a-z0-9-]+\.r2\.dev)\/(.+)$/;

// Matches absolute proxy URLs generated when AUTH_URL was used as base
// e.g. http://localhost:3000/api/storage/image?key=...
const ABS_PROXY_RE = /^https?:\/\/[^/]+\/api\/storage\/image\?key=(.+)$/;

// Mirrors ALLOWED_PREFIXES + CMS_KEY_RE in /api/storage/image/route.ts — keep in sync
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

// CMS admin uploads: cms-thumbnail/, cms-page/, cms-hero/, cms-djmedia/, cms-team/, ...
const CMS_RAW_KEY_RE = /^cms-[a-z][a-z0-9-]*\//;

export function r2Url(url: string | null | undefined): string {
  if (!url) return "";

  // Already a relative proxy URL — return as-is
  if (url.startsWith("/api/storage/image")) return url;

  // CDN or r2.dev URL → route through server proxy
  const r2Match = R2_URL_RE.exec(url);
  if (r2Match?.[1]) {
    return `/api/storage/image?key=${encodeURIComponent(r2Match[1])}`;
  }

  // Absolute proxy URL (from dev fallback) → strip host, keep relative
  const absMatch = ABS_PROXY_RE.exec(url);
  if (absMatch?.[1]) {
    return `/api/storage/image?key=${absMatch[1]}`;
  }

  // Raw storage key stored in DB without domain
  // e.g. "course-thumbnail/uuid/file.jpg" or "cms-page/uuid/file.jpg"
  if (
    !url.startsWith("http") &&
    !url.startsWith("/") &&
    (KNOWN_KEY_PREFIXES.some((p) => url.startsWith(p)) || CMS_RAW_KEY_RE.test(url))
  ) {
    return `/api/storage/image?key=${encodeURIComponent(url)}`;
  }

  // Static files, external images, etc. — unchanged
  return url;
}
