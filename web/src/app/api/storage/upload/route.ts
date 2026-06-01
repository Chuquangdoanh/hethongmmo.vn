import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { uploadBuffer, isAllowedContentType } from "@/lib/storage/s3";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const PURPOSE_PREFIXES: Record<string, string> = {
  "product-image": "product-image",
  avatar: "avatar",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const formData = await req.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file.", code: "MISSING_FILE" }, { status: 400 });
    }

    if (typeof purpose !== "string" || !PURPOSE_PREFIXES[purpose]) {
      return NextResponse.json({ error: "Purpose không hợp lệ.", code: "INVALID_PURPOSE" }, { status: 400 });
    }

    if (!isAllowedContentType(file.type)) {
      return NextResponse.json(
        { error: "Loại file không được phép. Chỉ chấp nhận JPEG, PNG, WebP, GIF.", code: "INVALID_CONTENT_TYPE" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn. Tối đa 5MB.", code: "FILE_TOO_LARGE" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `${PURPOSE_PREFIXES[purpose]}/${me.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadBuffer({ key, buffer, contentType: file.type });

    return NextResponse.json({ publicUrl });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
