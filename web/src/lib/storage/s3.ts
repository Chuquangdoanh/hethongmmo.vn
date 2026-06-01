import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export type PresignPurpose = "avatar" | "cccd" | "portrait" | "product-image" | "course-thumbnail";

function getS3Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const region = process.env.R2_REGION ?? "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage not configured (missing R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET env not set");
  return bucket;
}

export function isAllowedContentType(ct: string): ct is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(ct);
}

/**
 * Generates a presigned PUT URL for uploading a file to R2/S3.
 * URL expires in 5 minutes.
 */
export async function getPresignedUploadUrl(params: {
  userId: string;
  purpose: PresignPurpose;
  contentType: AllowedContentType;
  fileExtension: string;
}): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const { userId, purpose, contentType, fileExtension } = params;
  const s3 = getS3Client();
  const bucket = getBucket();

  const timestamp = Date.now();
  const fileKey = `${purpose}/${userId}/${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  const publicBase = process.env.R2_PUBLIC_URL ?? `https://${bucket}.r2.cloudflarestorage.com`;
  const publicUrl = `${publicBase}/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

/**
 * Uploads a Buffer directly to R2/S3. Use from server-side only.
 */
export async function uploadBuffer(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const { key, buffer, contentType } = params;
  const s3 = getS3Client();
  const bucket = getBucket();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const publicBase = process.env.R2_PUBLIC_URL ?? `https://${bucket}.r2.cloudflarestorage.com`;
  return `${publicBase}/${key}`;
}
