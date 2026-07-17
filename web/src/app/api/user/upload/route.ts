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
const USER_R2_PURPOSES = new Set(["avatar", "product-image", "order-sample"]);

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
      // Ext lấy theo MIME type đã xác thực (không lấy theo file.name) — tên file client gửi lên
      // không đáng tin (VD ảnh forward qua Zalo/Messenger có thể không có phần mở rộng chuẩn),
      // trước đây gây ra tình trạng lưu file thành công nhưng /api/admin/secure-image trả 404
      // vì ext không khớp KEY_PATTERN trong lib/storage/local.ts
      const SENSITIVE_MIME_EXT: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png":  "png",
        "image/webp": "webp",
        "image/gif":  "gif",
        "application/pdf": "pdf",
      };
      const ext = SENSITIVE_MIME_EXT[file.type];
      if (!ext) {
        return apiError("Chỉ chấp nhận JPEG, PNG, WebP, GIF hoặc PDF", "INVALID_TYPE", 400);
      }
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
