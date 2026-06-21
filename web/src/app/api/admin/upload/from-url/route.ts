import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { uploadToR2, isAllowedMimeType } from "@/lib/storage/r2-upload";
import { apiOk, apiError, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Trả về thông báo lỗi nếu URL trỏ vào địa chỉ nội bộ, null nếu an toàn.
// 2 lớp kiểm tra: (1) pattern hostname/IP, (2) DNS resolution để chặn DNS rebinding.
async function validateExternalUrl(urlStr: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return "URL không hợp lệ";
  }

  if (parsed.protocol !== "https:") {
    return "Chỉ chấp nhận URL HTTPS";
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isPrivateHostname(hostname)) {
    return "URL không được trỏ vào địa chỉ nội bộ";
  }

  // DNS rebinding protection — resolve hostname rồi kiểm tra IP thật
  const v4 = await dns.resolve4(hostname).catch(() => [] as string[]);
  const v6 = await dns.resolve6(hostname).catch(() => [] as string[]);
  for (const ip of [...v4, ...v6]) {
    if (isPrivateHostname(ip)) {
      return "URL không được trỏ vào địa chỉ nội bộ";
    }
  }

  return null;
}

function isPrivateHostname(h: string): boolean {
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  return [
    /^127\./,                          // 127.0.0.0/8 loopback
    /^10\./,                           // 10.0.0.0/8
    /^192\.168\./,                     // 192.168.0.0/16
    /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12
    /^169\.254\./,                     // link-local / AWS metadata
    /^0\./,                            // 0.0.0.0/8
    /^[Ff][Cc0-9a-fA-F]/,             // IPv6 fc00::/7 private
    /^[Ff][Dd0-9a-fA-F]/,
  ].some(re => re.test(h));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
 await requirePermission(session, "content:create");

    const body = await req.json() as { url?: string; uploadType?: string };
    const { url, uploadType = "mmo-thumbnail" } = body;

    if (!url || typeof url !== "string") {
      return apiError("URL không hợp lệ", "INVALID_URL", 400);
    }

    const urlError = await validateExternalUrl(url);
    if (urlError) {
      return apiError(urlError, "INVALID_URL", 400);
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
