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
import bcrypt from "bcryptjs";

const verifyOtpSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    otpCode: z.string().length(6).regex(/^\d+$/, "OTP phải là 6 chữ số"),
    purpose: z.enum(["REGISTER", "RESET_PASSWORD"]).default("REGISTER"),
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

  const { email, otpCode, purpose, password } = parsed.data;

  // ── RESET_PASSWORD: chỉ xác minh OTP, không mark used — reset-password route sẽ mark ──
  if (purpose === "RESET_PASSWORD") {
    const otpRecord = await prisma.otpCode.findFirst({
      where: { email, purpose: "RESET_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      return NextResponse.json(
        { error: "Mã OTP đã hết hạn hoặc không tồn tại.", code: "OTP_EXPIRED" },
        { status: 400 },
      );
    }
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return NextResponse.json(
        { error: "OTP đã bị vô hiệu hóa do quá nhiều lần thử.", code: "OTP_EXPIRED" },
        { status: 400 },
      );
    }
    const valid = await bcrypt.compare(otpCode, otpRecord.codeHash);
    if (!valid) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      return NextResponse.json(
        { error: `Mã OTP không đúng. Còn ${remaining} lần thử.`, code: "INVALID_OTP", attemptsRemaining: remaining },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true });
  }

  // ── REGISTER: validate password + tạo user ──
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
          uidPrefix: "",  // placeholder — sẽ update ngay dưới sau khi có UUID
        },
      });

      // Derive uidPrefix từ UUID đã gen (8 hex chars đầu, bỏ dấu -)
      await tx.user.update({
        where: { id: newUser.id },
        data: { uidPrefix: newUser.id.replace(/-/g, "").slice(0, 8) },
      });

      await tx.pendingRegistration.delete({ where: { email } });

      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: "Đăng ký thành công !",
          body: "",
          type: "SYSTEM",
        },
      });

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
