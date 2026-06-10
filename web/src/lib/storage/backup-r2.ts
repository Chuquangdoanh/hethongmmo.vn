import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isValidLocalKey } from "./local";

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  gif:  "image/gif",
  pdf:  "application/pdf",
};

function getBackupClient(): { client: S3Client; bucket: string } | null {
  // Dùng BACKUP_R2_* riêng — không dùng chung credentials với media bucket
  const endpoint        = process.env.BACKUP_R2_ENDPOINT;
  const accessKeyId     = process.env.BACKUP_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_R2_SECRET_ACCESS_KEY;
  const bucket          = process.env.BACKUP_R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
}

/**
 * Fallback: đọc file upload từ R2 backup bucket (uploads-live/{key}).
 * Chỉ gọi khi file local không tìm thấy (ENOENT) — không thay thế local disk.
 */
export async function readFromBackupR2(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!isValidLocalKey(key)) throw new Error("Invalid key");

  const cfg = getBackupClient();
  if (!cfg) throw new Error("Backup R2 not configured");

  const res = await cfg.client.send(
    new GetObjectCommand({ Bucket: cfg.bucket, Key: `uploads-live/${key}` }),
  );

  if (!res.Body) throw new Error("Empty response from backup R2");

  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const ext = (key.split(".").pop() ?? "").toLowerCase();
  const contentType = EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";

  return { buffer, contentType };
}
