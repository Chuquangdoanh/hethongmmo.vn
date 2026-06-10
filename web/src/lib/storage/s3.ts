/**
 * S3/R2 compatibility layer.
 * New upload code should use uploadToR2() from r2-upload.ts directly.
 *
 * Kept exports for backward compatibility:
 *   getPresignedUploadUrl  — presigned PUT URL for browser-to-R2 direct upload
 *   uploadBuffer           — server-side buffer upload (use uploadToR2 for new code)
 *   isAllowedContentType   — re-export of isAllowedMimeType
 *   PresignPurpose type
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { buildCdnUrl, isAllowedMimeType } from "./r2-upload";

export { isAllowedMimeType as isAllowedContentType };

// cccd/portrait removed — sensitive files must go via saveLocalFile (VPS disk)
export type PresignPurpose = "avatar" | "product-image";

function getS3Client(): S3Client {
  const endpoint        = process.env.R2_ENDPOINT;
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage not configured (missing R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }
  return new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET env not set");
  return bucket;
}

/**
 * Generates a presigned PUT URL for direct browser-to-R2 upload.
 * URL expires in 5 minutes.
 * Key uses UUID — no timestamp enumeration risk.
 */
export async function getPresignedUploadUrl(params: {
  userId:        string;
  purpose:       PresignPurpose;
  contentType:   string;
  fileExtension: string;
}): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const { userId, purpose, contentType, fileExtension } = params;
  const s3     = getS3Client();
  const bucket = getBucket();

  const safeExt = fileExtension.replace(/[^a-z0-9]/g, "").slice(0, 10) || "jpg";
  const fileKey = `${purpose}/${userId}/${randomUUID()}.${safeExt}`;

  const command   = new PutObjectCommand({ Bucket: bucket, Key: fileKey, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return { uploadUrl, fileKey, publicUrl: buildCdnUrl(fileKey) };
}

/**
 * @deprecated Use uploadToR2() from r2-upload.ts for new code.
 */
export async function uploadBuffer(params: {
  key:         string;
  buffer:      Buffer;
  contentType: string;
}): Promise<string> {
  const { key, buffer, contentType } = params;
  const s3     = getS3Client();
  const bucket = getBucket();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
  return buildCdnUrl(key);
}
