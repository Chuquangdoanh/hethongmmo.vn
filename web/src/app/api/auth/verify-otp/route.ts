import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  checkPwnedPassword,
} from "@/lib/auth/password";
import { verifyOtp } from "@/lib/services/otp.service";
import { logger } from "@/lib/utils/logger";

const verifyOtpSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    otpCode: z.string().length(6).regex(/^\d+$/, "OTP phải là 6 chữ số"),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request không hợp lệ", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = verifyOtpSchema.safeParse(body);
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

  const { email, otpCode, password } = parsed.data;

  // Validate password strength before any DB work
  const { valid, errors } = validatePasswordStrength(password);
  if (!valid) {
    return NextResponse.json(
      { error: errors[0] ?? "Mật khẩu không đủ mạnh", code: "WEAK_PASSWORD", errors },
      { status: 400 },
    );
  }

  // Get pending registration (contains fullName + phone for user creation)
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json(
      { error: "Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại từ đầu.", code: "NOT_FOUND" },
      { status: 400 },
    );
  }

  // Verify OTP via service (handles expiry, attempts, bcrypt — reads from otp_codes table)
  const otpResult = await verifyOtp(email, "REGISTER", otpCode);
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

  // Check HaveIBeenPwned (fail open — only block if explicitly pwned)
  try {
    await checkPwnedPassword(password);
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

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      // Guard against race condition
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) throw new Error("EMAIL_TAKEN");

      const newUser = await tx.user.create({
        data: {
          email,
          fullName: pending.fullName,
          phone: pending.phone,
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          uidPrefix: "",
        },
      });

      await tx.pendingRegistration.delete({ where: { email } });

      await tx.auditLog.create({
        data: {
          actorId: newUser.id,
          action: "USER_REGISTERED",
          targetType: "User",
          targetId: newUser.id,
          metadata: { email, ip },
        },
      });
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Email này đã được đăng ký.", code: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }
    logger.error({ err: e, email }, "Failed to create user");
    return NextResponse.json(
      { error: "Lỗi hệ thống. Vui lòng thử lại.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  logger.info({ email }, "New user registered successfully");
  return NextResponse.json({ success: true });
}
