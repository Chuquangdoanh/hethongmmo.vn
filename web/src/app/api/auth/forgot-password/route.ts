import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/validation/user.schema";
import { generateOtp } from "@/lib/services/otp.service";
import { sendOtpEmail } from "@/lib/services/email.service";
import { otpRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { success: rateLimitOk } = await checkRateLimit(
    otpRatelimit,
    `forgot:${ip}`,
  );
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Thử lại sau.", code: "RATE_LIMITED" },
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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email không hợp lệ", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // Always return success — never reveal whether email exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (user && user.status === "ACTIVE") {
    try {
      const code = await generateOtp(email, "RESET_PASSWORD", user.id, ip);
      await sendOtpEmail({ to: email, code, purpose: "RESET_PASSWORD" });
    } catch (e: unknown) {
      logger.error({ err: e, email }, "Failed to send reset password OTP");
    }
  }

  return NextResponse.json({ success: true });
}
