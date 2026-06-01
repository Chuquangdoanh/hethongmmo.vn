import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/validation/user.schema";
import { generateSecureToken } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/services/email.service";
import { otpRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";
import bcrypt from "bcryptjs";

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
    select: { id: true, fullName: true, status: true },
  });

  if (user && user.status === "ACTIVE") {
    const token = generateSecureToken(32);
    const tokenHash = await bcrypt.hash(token, 12);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.otpCode.deleteMany({
      where: { email, purpose: "RESET_PASSWORD", usedAt: null },
    });

    await prisma.otpCode.create({
      data: {
        email,
        userId: user.id,
        purpose: "RESET_PASSWORD",
        codeHash: tokenHash,
        ipAddress: ip,
        expiresAt,
      },
    });

    await sendPasswordResetEmail({ to: email, resetToken: token }).catch(
      (e: unknown) => logger.error({ err: e, email }, "Failed to send reset password email"),
    );
  }

  return NextResponse.json({ success: true });
}
