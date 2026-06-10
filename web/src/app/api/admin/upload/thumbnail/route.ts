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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("Không có file được gửi lên", "NO_FILE", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File quá lớn, tối đa 5 MB", "FILE_TOO_LARGE", 400);
    }
    if (!isAllowedMimeType(file.type)) {
      return apiError("Chỉ chấp nhận JPEG, PNG, WebP, AVIF, GIF", "INVALID_TYPE", 400);
    }

    // Sanitized upload type controls the R2 key prefix (admin-controlled, validated in uploadToR2)
    const rawType = req.nextUrl.searchParams.get("type") ?? "course-thumbnail";
    const purpose = rawType.replace(/[^a-z0-9-]/g, "").slice(0, 50) || "course-thumbnail";
    const buffer  = Buffer.from(await file.arrayBuffer());

    const result = await uploadToR2({ buffer, mimeType: file.type, purpose, userId: actor.id, maxBytes: MAX_SIZE });

    return apiOk({ url: result.url });
  } catch (err) {
    return apiCatch(err);
  }
}
