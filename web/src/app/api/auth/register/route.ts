import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { otpRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { generateOtp } from "@/lib/services/otp.service";
import { sendOtpEmail } from "@/lib/services/email.service";
import { validatePasswordStrength, checkPwnedPassword } from "@/lib/auth/password";
import { logger } from "@/lib/utils/logger";

const registerInitSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    fullName: z.string().min(2).max(100).trim(),
    phone: z.string().regex(/^(0|\+84)[3-9]\d{8}$/, "Số điện thoại không hợp lệ"),
    password: z.string(),
    confirmPassword: z.string(),
    captchaToken: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      },
    );
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    const { success: rateLimitOk } = await checkRateLimit(
      otpRatelimit,
      `register:${ip}`,
    );
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Thử lại sau 5 phút.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request không hợp lệ", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    const parsed = registerInitSchema.safeParse(body);
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

    const { email, fullName, phone, password, captchaToken } = parsed.data;

    // Validate mật khẩu NGAY ở bước đăng ký (nơi user còn ô nhập để sửa) — trước khi gửi OTP.
    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return NextResponse.json(
        { error: errors[0] ?? "Mật khẩu không đủ mạnh", code: "WEAK_PASSWORD", errors },
        { status: 400 },
      );
    }

    // Check HaveIBeenPwned (fail open — chỉ chặn nếu chắc chắn rò rỉ).
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

    if (captchaToken) {
      const captchaOk = await verifyCaptcha(captchaToken, ip);
      if (!captchaOk) {
        return NextResponse.json(
          { error: "Xác minh captcha thất bại", code: "CAPTCHA_FAILED" },
          { status: 400 },
        );
      }
    }

    // Silently succeed for existing emails to prevent enumeration
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, expiresInSec: 600 });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.pendingRegistration.upsert({
      where: { email },
      create: { email, fullName, phone, ipAddress: ip, expiresAt },
      update: { fullName, phone, ipAddress: ip, expiresAt, attempts: 0 },
    });

    const otpCode = await generateOtp(email, "REGISTER", undefined, ip);

    // Always print to console in development so devs can test without real email delivery
    if (process.env.NODE_ENV === "development") {
      logger.info({ email, otpCode }, "[DEV] REGISTER OTP code");
    }

    await sendOtpEmail({ to: email, code: otpCode, purpose: "REGISTER" }).catch(
      (e: unknown) => logger.error({ err: e, email }, "Failed to send OTP email"),
    );

    return NextResponse.json({ success: true, expiresInSec: 600 });
  } catch (err: unknown) {
    logger.error({ err, ip }, "Register route unhandled error");
    return NextResponse.json(
      { error: "Lỗi hệ thống. Vui lòng thử lại.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
