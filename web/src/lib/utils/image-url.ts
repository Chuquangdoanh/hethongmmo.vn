/**
 * Converts any R2 storage URL (CDN or r2.dev) to a server-side proxy URL.
 *
 * Problem: cdn.hethongmmo.vn DNS resolves to the VPS, not R2 → returns HTML.
 *          Old uploads used pub-xxx.r2.dev public bucket URLs.
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

  // Static files, external images, etc. — unchanged
  return url;
}
