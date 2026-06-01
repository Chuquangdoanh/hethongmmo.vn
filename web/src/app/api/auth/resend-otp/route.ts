import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateOtp } from "@/lib/services/otp.service";
import { sendOtpEmail } from "@/lib/services/email.service";
import { checkRateLimit, resendOtpEmailRatelimit, resendOtpIpRatelimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const resendOtpSchema = z.object({
  email: z.string().email("Email không hợp lệ").toLowerCase(),
  purpose: z.enum(["REGISTER", "RESET_PASSWORD", "EMAIL_VERIFY"]),
});

/**
 * POST /api/auth/resend-otp
 *
 * Gửi lại mã OTP qua email. Không phân biệt email tồn tại hay không
 * (tránh user enumeration). Áp dụng 2 lớp rate limit: theo email và theo IP.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    // 1. Validate input
    const parsed = resendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { email, purpose } = parsed.data;
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    // 2. Rate limit theo email: 3 lần / 10 phút
    const emailRl = await checkRateLimit(resendOtpEmailRatelimit, `resend-otp:email:${email}`);
    if (!emailRl.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSec: 600,
        },
        { status: 429 },
      );
    }

    // 3. Rate limit theo IP: 10 lần / 10 phút
    const ipRl = await checkRateLimit(resendOtpIpRatelimit, `resend-otp:ip:${ip}`);
    if (!ipRl.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSec: 600,
        },
        { status: 429 },
      );
    }

    // 4. Chỉ kiểm tra PendingRegistration cho purpose=REGISTER
    if (purpose === "REGISTER") {
      const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
      if (!pending) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy yêu cầu đăng ký", code: "NOT_FOUND" },
          { status: 400 },
        );
      }
      if (pending.expiresAt < new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: "Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.",
            code: "SESSION_EXPIRED",
          },
          { status: 400 },
        );
      }
    }

    // 5. Generate OTP và gửi email — KHÔNG trả code trong response
    try {
      const otpCode = await generateOtp(email, purpose);
      if (process.env.NODE_ENV === "development") {
        logger.info({ email, otpCode, purpose }, "[DEV] RESEND OTP code");
      }
      await sendOtpEmail({ to: email, code: otpCode, purpose });
    } catch (emailErr) {
      logger.error({ err: emailErr, purpose }, "Failed to send OTP email");
      return NextResponse.json(
        { success: false, error: "Không thể gửi email. Thử lại sau.", code: "EMAIL_FAILED" },
        { status: 500 },
      );
    }

    // 6. Log (không log email để tránh PII trong logs)
    logger.info({ purpose, ip }, "OTP resent");

    // 7. Response không tiết lộ OTP hay thông tin pending
    return NextResponse.json({
      success: true,
      message: "Đã gửi lại mã OTP. Kiểm tra email của bạn.",
      expiresInSec: 600,
    });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json(
      { success: false, error: e.error, code: e.code },
      { status: e.statusCode },
    );
  }
}
