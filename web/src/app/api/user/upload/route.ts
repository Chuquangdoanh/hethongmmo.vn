import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { uploadBuffer, isAllowedContentType } from "@/lib/storage/s3";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("Không có file được gửi lên", "NO_FILE", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File quá lớn, tối đa 5 MB", "FILE_TOO_LARGE", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type) && !isAllowedContentType(file.type)) {
      return apiError("Chỉ chấp nhận JPEG, PNG, WebP, GIF hoặc PDF", "INVALID_TYPE", 400);
    }

    const rawType = req.nextUrl.searchParams.get("type") ?? "user-upload";
    const uploadType = rawType.replace(/[^a-z0-9-]/g, "").slice(0, 50) || "user-upload";
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${uploadType}/${me.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const publicUrl = await uploadBuffer({ key, buffer, contentType: file.type });

    return apiOk({ url: publicUrl });
  } catch (err) {
    return apiCatch(err);
  }
}
