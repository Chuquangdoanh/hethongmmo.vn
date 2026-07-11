import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { uploadToR2 } from "@/lib/storage/r2-upload";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB — âm thanh thông báo ngắn
const ALLOWED_TYPES = new Set(["audio/mpeg", "audio/ogg", "audio/wav"]);

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
      return apiError("File quá lớn, tối đa 1 MB", "FILE_TOO_LARGE", 400);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("Chỉ chấp nhận MP3, OGG, WAV", "INVALID_TYPE", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToR2({
      buffer,
      mimeType: file.type,
      purpose: "notification-sound",
      userId: actor.id,
      maxBytes: MAX_SIZE,
    });

    return apiOk({ url: result.url });
  } catch (err) {
    return apiCatch(err);
  }
}
