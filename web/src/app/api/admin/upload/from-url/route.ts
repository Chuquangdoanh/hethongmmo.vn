import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { uploadBuffer, isAllowedContentType } from "@/lib/storage/s3";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);

    const body = await req.json() as { url?: string; uploadType?: string };
    const { url, uploadType = "mmo-thumbnail" } = body;

    if (!url || typeof url !== "string") {
      return apiError("URL không hợp lệ", "INVALID_URL", 400);
    }

    let imageRes: Response;
    try {
      imageRes = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      return apiError("Không thể tải ảnh từ URL này", "FETCH_FAILED", 400);
    }

    if (!imageRes.ok) {
      return apiError("URL ảnh không truy cập được", "FETCH_FAILED", 400);
    }

    const contentType = imageRes.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!isAllowedContentType(contentType)) {
      return apiError("Định dạng ảnh không hợp lệ (chấp nhận JPEG, PNG, WebP, GIF)", "INVALID_TYPE", 400);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_SIZE) {
      return apiError("Ảnh quá lớn, tối đa 5 MB", "FILE_TOO_LARGE", 400);
    }

    const ext = EXT_MAP[contentType] ?? "jpg";
    const safeType = uploadType.replace(/[^a-z0-9-]/g, "").slice(0, 50) || "mmo-thumbnail";
    const key = `${safeType}/${actor.id}/${Date.now()}.${ext}`;

    const publicUrl = await uploadBuffer({ key, buffer, contentType });

    return apiOk({ url: publicUrl });
  } catch (err) {
    return apiCatch(err);
  }
}
