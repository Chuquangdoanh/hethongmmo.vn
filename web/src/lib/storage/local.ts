import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

const ALLOWED_SUBDIRS = ["cccd", "portrait"] as const;
export type LocalUploadSubdir = (typeof ALLOWED_SUBDIRS)[number];

// Strict key pattern: subdir/uuid/timestamp.ext — prevents path traversal
const KEY_PATTERN =
  /^(cccd|portrait)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9]+\.(jpg|jpeg|png|webp|gif|pdf)$/i;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  gif:  "image/gif",
  pdf:  "application/pdf",
};

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
}

export function isValidLocalKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/** Lưu file nhạy cảm (CCCD/portrait) xuống disk VPS, trả về URL API nội bộ. */
export async function saveLocalFile(params: {
  buffer: Buffer;
  subDir: LocalUploadSubdir;
  userId: string;
  ext: string;
}): Promise<string> {
  const { buffer, subDir, userId, ext } = params;

  if (!UUID_PATTERN.test(userId)) throw new Error("Invalid userId format");
  if (!ALLOWED_SUBDIRS.includes(subDir)) throw new Error("Invalid subDir");

  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "jpg";

  const baseDir  = getUploadDir();
  const dirPath  = join(baseDir, subDir, userId);
  await mkdir(dirPath, { recursive: true });

  const filename = `${Date.now()}.${safeExt}`;
  const filePath = join(dirPath, filename);
  await writeFile(filePath, buffer);

  const key = `${subDir}/${userId}/${filename}`;
  return `/api/admin/secure-image?key=${encodeURIComponent(key)}`;
}

/** Đọc file từ disk — chỉ dùng sau khi đã validate key bằng isValidLocalKey(). */
export async function readLocalFile(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!isValidLocalKey(key)) throw new Error("Invalid key");

  const filePath   = join(getUploadDir(), key);
  const buffer     = await readFile(filePath);
  const ext        = (key.split(".").pop() ?? "").toLowerCase();
  const contentType = EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";

  return { buffer, contentType };
}
