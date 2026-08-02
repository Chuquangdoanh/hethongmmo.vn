import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  checkPwnedPassword,
} from "@/lib/auth/password";
import { logger } from "@/lib/utils/logger";
import { verifyOtp } from "@/lib/services/otp.service";

const resetPasswordApiSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    code: z.string().length(6).regex(/^\d+$/),
    newPassword: z.string(),
  });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request không hợp lệ", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = resetPasswordApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { email, code, newPassword } = parsed.data;

  const { valid, errors } = validatePasswordStrength(newPassword);
  if (!valid) {
    return NextResponse.json(
      { error: errors[0] ?? "Mật khẩu không đủ mạnh", code: "WEAK_PASSWORD", errors },
      { status: 400 },
    );
  }

  // Check HaveIBeenPwned BEFORE consuming the OTP (fail open — only block if explicitly pwned).
  // Phải chạy trước verifyOtp: nếu mật khẩu rò rỉ mà đốt mã OTP thì user kẹt, phải xin mã mới
  // dù mã cũ vẫn còn hợp lệ (trang đặt lại mật khẩu không có cách xin lại OTP tại chỗ).
  try {
    await checkPwnedPassword(newPassword);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "PASSWORD_PWNED") {
      return NextResponse.json(
        {
          error:
            "Mật khẩu này đã xuất hiện trong các vụ rò rỉ dữ liệu. Vui lòng chọn mật khẩu khác.",
          code: "PASSWORD_PWNED",
        },
        { status: 400 },
      );
    }
  }

  // Verify OTP và mark as used
  const otpResult = await verifyOtp(email, "RESET_PASSWORD", code);
  if (!otpResult.success) {
    return NextResponse.json(
      {
        error: otpResult.error ?? "Mã OTP không đúng hoặc đã hết hạn.",
        code: otpResult.attemptsRemaining !== undefined ? "INVALID_OTP" : "OTP_EXPIRED",
        ...(otpResult.attemptsRemaining !== undefined && { attemptsRemaining: otpResult.attemptsRemaining }),
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Tài khoản không tồn tại.", code: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "PASSWORD_RESET",
        targetType: "User",
        targetId: user.id,
        metadata: { email, via: "forgot_password_flow" },
      },
    });
  });

  logger.info({ userId: user.id, email }, "Password reset successfully");
  return NextResponse.json({ success: true });
}
