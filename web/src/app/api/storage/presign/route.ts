import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { getPresignedUploadUrl } from "@/lib/storage/s3";
import { isAllowedMimeType } from "@/lib/storage/r2-upload";
import { apiOk, apiError, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const presignSchema = z.object({
  // cccd/portrait removed — those must use /api/user/upload which routes to VPS disk
  purpose:       z.enum(["avatar", "product-image"]),
  contentType:   z.string(),
  fileExtension: z.string().regex(/^[a-z0-9]{1,10}$/),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { purpose, contentType, fileExtension } = parsed.data;

    if (!isAllowedMimeType(contentType)) {
      return apiError(
        "Loại file không được phép. Chỉ chấp nhận JPEG, PNG, WebP, AVIF, GIF.",
        "INVALID_CONTENT_TYPE",
        400,
      );
    }

    const result = await getPresignedUploadUrl({ userId: me.id, purpose, contentType, fileExtension });
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
