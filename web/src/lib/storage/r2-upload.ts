/**
 * Production image upload service — Cloudflare R2 (media bucket only).
 *
 * Separation of concerns:
 *   r2-upload.ts  →  media uploads      (R2_* env vars, hethongmmo-assets bucket)
 *   backup-r2.ts  →  DR reads           (BACKUP_R2_* env vars, hethongmmo-backup bucket)
 *   local.ts      →  sensitive files    (VPS disk — cccd, portrait)
 *
 * Never imports from or shares credentials with backup-r2.ts.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// MIME whitelist
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",       // retained for backward compat — GIF thumbnails already in production DB
  "image/svg+xml",   // SVG icons (service categories, course icons)
  "audio/mpeg",       // notification sound (CMS-uploaded .mp3)
  "audio/ogg",        // notification sound (.ogg)
  "audio/wav",        // notification sound (.wav)
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Extension derived from MIME type — never taken from client filename */
const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg":    "jpg",
  "image/png":     "png",
  "image/webp":    "webp",
  "image/avif":    "avif",
  "image/gif":     "gif",
  "image/svg+xml": "svg",
  "audio/mpeg":    "mp3",
  "audio/ogg":     "ogg",
  "audio/wav":     "wav",
};

const AUDIO_MIME_TYPES = new Set(["audio/mpeg", "audio/ogg", "audio/wav"]);

// ---------------------------------------------------------------------------
// Upload purposes — controls R2 key namespace (first path segment)
// ---------------------------------------------------------------------------

export const UPLOAD_PURPOSES = [
  "avatar",
  "product-image",
  "course-thumbnail",
  "service-thumbnail",
  "mmo-thumbnail",
  "tut-trick-thumbnail",
  "testimonial-avatar",
  "resource-icon",
  "course-icon",
  "service-icon",
  "order-sample",
  "notification-sound",
] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UploadResult {
  /** R2 object key, e.g. "avatar/{userId}/{uuid}.webp" */
  key:      string;
  /** CDN URL via custom domain — never r2.dev or cloudflarestorage.com */
  url:      string;
  mimeType: AllowedMimeType;
  /** File size in bytes */
  size:     number;
}

// ---------------------------------------------------------------------------
// Validation helpers (exported for route handler pre-validation)
// ---------------------------------------------------------------------------

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function isKnownPurpose(p: string): p is UploadPurpose {
  return (UPLOAD_PURPOSES as readonly string[]).includes(p);
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

/**
 * Returns the public URL for an R2 object.
 *
 * Production (R2_PUBLIC_URL set):
 *   → https://cdn.yourdomain.com/{key}   (Cloudflare custom domain)
 *
 * No CDN (AUTH_URL or NEXT_PUBLIC_APP_URL set):
 *   → https://yourdomain.com/api/storage/image?key={key}  (in-app proxy)
 *
 * Always returns an absolute URL so Zod z.string().url() validation passes
 * when saving thumbnails to the database.
 * Never exposes r2.dev or cloudflarestorage.com URLs to clients.
 */
export function buildCdnUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;

  // Fallback: use canonical app URL as proxy base.
  // AUTH_URL is the Auth.js v5 canonical URL — always set in production.
  const appBase = (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL
  )?.replace(/\/$/, "");

  if (!appBase) {
    throw new Error(
      "R2_PUBLIC_URL, AUTH_URL, or NEXT_PUBLIC_APP_URL must be set. " +
      "Copy .env.example to .env and fill in the values.",
    );
  }

  return `${appBase}/api/storage/image?key=${encodeURIComponent(key)}`;
}

// ---------------------------------------------------------------------------
// R2 client — production media bucket only (never uses BACKUP_R2_*)
// ---------------------------------------------------------------------------

function createR2Client(): S3Client {
  const endpoint        = process.env.R2_ENDPOINT;
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 media bucket not configured. Required: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
  }

  return new S3Client({
    region:      "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET env var not set");
  return bucket;
}

// ---------------------------------------------------------------------------
// Core upload function
// ---------------------------------------------------------------------------

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Purpose: lowercase letters, digits, hyphens; must not start/end with hyphen
const SAFE_PURPOSE_RE = /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$|^[a-z0-9]$/;
const UUID_RE         = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uploads a Buffer to the R2 production media bucket.
 *
 * Key format: {purpose}/{userId}/{uuid}.{ext}
 *   - Extension derived from validated MIME type (not filename) — prevents extension spoofing
 *   - UUID filename prevents overwrite attacks and sequential enumeration
 *   - userId validated as UUID format — extra path-traversal guard
 *
 * Returns CDN URL via R2_PUBLIC_URL custom domain (never cloudflarestorage.com).
 *
 * @param purpose  A known UploadPurpose OR a sanitized admin-controlled string.
 *                 Must match SAFE_PURPOSE_RE: lowercase, alphanumeric + hyphens.
 */
export async function uploadToR2(params: {
  buffer:    Buffer;
  mimeType:  string;
  purpose:   UploadPurpose | string;
  userId:    string;
  maxBytes?: number;
}): Promise<UploadResult> {
  const { buffer, mimeType, purpose, userId, maxBytes = DEFAULT_MAX_BYTES } = params;

  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`Loại file không được phép: ${mimeType}`);
  }

  if (buffer.byteLength > maxBytes) {
    const mb    = (buffer.byteLength / 1_048_576).toFixed(1);
    const maxMb = (maxBytes / 1_048_576).toFixed(0);
    throw new Error(`File quá lớn: ${mb} MB (tối đa ${maxMb} MB)`);
  }

  if (!SAFE_PURPOSE_RE.test(purpose)) {
    throw new Error(`Invalid upload purpose: ${purpose}`);
  }

  if (!UUID_RE.test(userId)) {
    throw new Error("Invalid userId format");
  }

  // Convert raster images to WebP (SVG, GIF, and audio files are excluded)
  let finalBuffer = buffer;
  let finalMime   = mimeType as AllowedMimeType;
  if (mimeType !== "image/svg+xml" && mimeType !== "image/gif" && !AUDIO_MIME_TYPES.has(mimeType)) {
    // Lazy import — tránh top-level import fail khi native binary chưa sẵn sàng ở standalone mode
    const sharp = (await import("sharp")).default;
    finalBuffer = await sharp(buffer)
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    finalMime = "image/webp";
  }

  const bucket = getR2Bucket();
  const ext    = MIME_TO_EXT[finalMime];
  const key    = `${purpose}/${userId}/${randomUUID()}.${ext}`;
  const client = createR2Client();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket:       bucket,
        Key:          key,
        Body:         finalBuffer,
        ContentType:  finalMime,
        // Key chứa UUID ngẫu nhiên — không bao giờ bị ghi đè — nên an toàn để
        // browser/CDN cache vĩnh viễn, không cần revalidate mỗi lần reload.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Log without leaking credentials or bucket name
    console.error(`[r2-upload] Upload failed — purpose=${purpose}: ${msg}`);
    throw new Error("Tải file lên thất bại — vui lòng thử lại");
  }

  return {
    key,
    url:      buildCdnUrl(key),
    mimeType: finalMime,
    size:     finalBuffer.byteLength,
  };
}
