import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { uploadToR2, isAllowedMimeType } from "@/lib/storage/r2-upload";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_PURPOSES = new Set(["avatar", "product-image"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const formData = await req.formData();
    const file    = formData.get("file");
    const purpose = formData.get("purpose");

    if (!(file instanceof File)) {
      return apiError("Thiếu file.", "MISSING_FILE", 400);
    }
    if (typeof purpose !== "string" || !ALLOWED_PURPOSES.has(purpose)) {
      return apiError("Purpose không hợp lệ.", "INVALID_PURPOSE", 400);
    }
    if (!isAllowedMimeType(file.type)) {
      return apiError(
        "Loại file không được phép. Chỉ chấp nhận JPEG, PNG, WebP, AVIF, GIF.",
        "INVALID_CONTENT_TYPE",
        400,
      );
    }
    if (file.size > MAX_SIZE) {
      return apiError("File quá lớn. Tối đa 5 MB.", "FILE_TOO_LARGE", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToR2({ buffer, mimeType: file.type, purpose, userId: me.id, maxBytes: MAX_SIZE });

    return apiOk({ publicUrl: result.url });
  } catch (err) {
    return apiCatch(err);
  }
}
