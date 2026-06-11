import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { verifyPassword } from "@/lib/auth/password";
import { generateOtp } from "@/lib/services/otp.service";
import { sendOtpEmail } from "@/lib/services/email.service";
import { sendChangePasswordOtpSchema } from "@/lib/validation/user.schema";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = sendChangePasswordOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: me.id, deletedAt: null },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản", code: "NOT_FOUND" }, { status: 404 });
    }

    // Verify current password trước khi gửi OTP — tránh spam email
    const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng", code: "INVALID_PASSWORD" },
        { status: 401 },
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    const code = await generateOtp(user.email, "SENSITIVE_ACTION", user.id, ip);
    await sendOtpEmail({ to: user.email, code, purpose: "SENSITIVE_ACTION" });

    return NextResponse.json({
      success: true,
      message: "Mã xác nhận đã được gửi đến email của bạn. Có hiệu lực trong 10 phút.",
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
