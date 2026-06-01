import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { getPresignedUploadUrl, isAllowedContentType } from "@/lib/storage/s3";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const presignSchema = z.object({
  purpose: z.enum(["avatar", "cccd", "portrait", "product-image"]),
  contentType: z.string(),
  fileExtension: z.string().regex(/^[a-z0-9]{1,10}$/),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { purpose, contentType, fileExtension } = parsed.data;

    if (!isAllowedContentType(contentType)) {
      return NextResponse.json(
        { error: "Loại file không được phép. Chỉ chấp nhận JPEG, PNG, WebP, GIF.", code: "INVALID_CONTENT_TYPE" },
        { status: 400 },
      );
    }

    // CCCD and portrait require seller or above
    if ((purpose === "cccd" || purpose === "portrait") && me.role === "USER") {
      return NextResponse.json(
        { error: "Chỉ seller mới có thể upload CCCD/ảnh chân dung", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const result = await getPresignedUploadUrl({
      userId: me.id,
      purpose,
      contentType,
      fileExtension,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
