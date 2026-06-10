import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { uploadToR2, isAllowedMimeType } from "@/lib/storage/r2-upload";
import { saveLocalFile, type LocalUploadSubdir } from "@/lib/storage/local";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// CCCD/portrait → VPS disk only (never R2 — documents must not be publicly accessible)
const SENSITIVE_TYPES = new Set(["cccd", "portrait"]);
// Non-sensitive uploads allowed for regular users
const USER_R2_PURPOSES = new Set(["avatar", "product-image"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const formData   = await req.formData();
    const file       = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("Không có file được gửi lên", "NO_FILE", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File quá lớn, tối đa 5 MB", "FILE_TOO_LARGE", 400);
    }

    const rawType    = req.nextUrl.searchParams.get("type") ?? "";
    const uploadType = rawType.replace(/[^a-z0-9-]/g, "").slice(0, 50);

    let publicUrl: string;

    if (SENSITIVE_TYPES.has(uploadType)) {
      // CCCD/portrait → VPS disk, supports PDF in addition to images
      const SENSITIVE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
      if (!SENSITIVE_MIME.includes(file.type)) {
        return apiError("Chỉ chấp nhận JPEG, PNG, WebP, GIF hoặc PDF", "INVALID_TYPE", 400);
      }
      const ext    = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
      const buffer = Buffer.from(await file.arrayBuffer());
      publicUrl = await saveLocalFile({
        buffer,
        subDir: uploadType as LocalUploadSubdir,
        userId: me.id,
        ext,
      });
    } else {
      // Regular uploads → R2 (avatar, product-image)
      if (!USER_R2_PURPOSES.has(uploadType)) {
        return apiError("Upload type không hợp lệ", "INVALID_PURPOSE", 400);
      }
      if (!isAllowedMimeType(file.type)) {
        return apiError("Chỉ chấp nhận JPEG, PNG, WebP, AVIF, GIF", "INVALID_TYPE", 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadToR2({
        buffer,
        mimeType: file.type,
        purpose:  uploadType,
        userId:   me.id,
        maxBytes: MAX_SIZE,
      });
      publicUrl = result.url;
    }

    return apiOk({ url: publicUrl });
  } catch (err) {
    return apiCatch(err);
  }
}
