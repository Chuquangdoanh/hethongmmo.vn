import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  checkPwnedPassword,
} from "@/lib/auth/password";
import { logger } from "@/lib/utils/logger";
import bcrypt from "bcryptjs";

const resetPasswordApiSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    token: z.string().min(64).max(64),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
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

  const { email, token, newPassword } = parsed.data;

  const { valid, errors } = validatePasswordStrength(newPassword);
  if (!valid) {
    return NextResponse.json(
      { error: errors[0] ?? "Mật khẩu không đủ mạnh", code: "WEAK_PASSWORD", errors },
      { status: 400 },
    );
  }

  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      email,
      purpose: "RESET_PASSWORD",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return NextResponse.json(
      { error: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.", code: "INVALID_TOKEN" },
      { status: 400 },
    );
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    return NextResponse.json(
      { error: "Link đặt lại mật khẩu đã bị vô hiệu hóa do quá nhiều lần thử.", code: "MAX_ATTEMPTS" },
      { status: 400 },
    );
  }

  const tokenValid = await bcrypt.compare(token, otpRecord.codeHash);

  if (!tokenValid) {
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json(
      { error: "Link đặt lại mật khẩu không hợp lệ.", code: "INVALID_TOKEN" },
      { status: 400 },
    );
  }

  // Check HaveIBeenPwned
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

    await tx.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all remaining reset tokens for this email
    await tx.otpCode.updateMany({
      where: { email, purpose: "RESET_PASSWORD", usedAt: null },
      data: { usedAt: new Date() },
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
