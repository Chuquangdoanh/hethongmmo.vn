import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Chỉ cho phép các prefix public — không serve cccd/portrait qua đây
const ALLOWED_PREFIXES = [
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

// CMS uploads (admin-only, safe to serve publicly)
// Matches: cms-thumbnail/, cms-page/, cms-hero/, cms-djmedia/, cms-team/, ...
const CMS_KEY_RE = /^cms-[a-z][a-z0-9-]*\//;

// Ngăn path traversal: chỉ chấp nhận ký tự an toàn
const SAFE_KEY = /^[a-zA-Z0-9._/%-]+$/;

function getS3(): { client: S3Client; bucket: string } | null {
  const endpoint        = process.env.R2_ENDPOINT;
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket          = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    client: new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get("key") ?? "";

  if (!SAFE_KEY.test(key) || key.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const allowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p)) || CMS_KEY_RE.test(key);
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const cfg = getS3();
  if (!cfg) return new NextResponse("Storage not configured", { status: 503 });

  try {
    const res = await cfg.client.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );
    if (!res.Body) return new NextResponse("Not found", { status: 404 });

    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return new NextResponse(new Uint8Array(Buffer.concat(chunks)), {
      status: 200,
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
