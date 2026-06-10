import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { uploadToR2, isAllowedMimeType } from "@/lib/storage/r2-upload";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
    if (!isAllowedMimeType(contentType)) {
      return apiError(
        "Định dạng ảnh không hợp lệ (chấp nhận JPEG, PNG, WebP, AVIF, GIF)",
        "INVALID_TYPE",
        400,
      );
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_SIZE) {
      return apiError("Ảnh quá lớn, tối đa 5 MB", "FILE_TOO_LARGE", 400);
    }

    const purpose = uploadType.replace(/[^a-z0-9-]/g, "").slice(0, 50) || "mmo-thumbnail";
    const result  = await uploadToR2({
      buffer,
      mimeType: contentType,
      purpose,
      userId:   actor.id,
      maxBytes: MAX_SIZE,
    });

    return apiOk({ url: result.url });
  } catch (err) {
    return apiCatch(err);
  }
}
