import { prisma } from "@/lib/db/prisma";
import type { OtpPurpose } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { logger } from "@/lib/utils/logger";

const OTP_EXPIRES_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generates and stores a new OTP code for the given email and purpose.
 * Invalidates any existing unexpired OTPs for the same email+purpose first.
 * Returns the plain OTP code (caller is responsible for sending it).
 */
export async function generateOtp(
  email: string,
  purpose: OtpPurpose,
  userId?: string,
  ip?: string,
): Promise<string> {
  const code = randomInt(100000, 1000000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  // Invalidate existing OTPs for same email+purpose (prevent reuse confusion)
  await prisma.otpCode.deleteMany({
    where: { email, purpose, usedAt: null },
  });

  await prisma.otpCode.create({
    data: {
      email,
      userId: userId ?? null,
      purpose,
      codeHash,
      ipAddress: ip ?? null,
      expiresAt,
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  return code;
}

interface VerifyResult {
  success: boolean;
  attemptsRemaining?: number;
  error?: string;
}

/**
 * Verifies an OTP code for the given email and purpose.
 * Increments attempt counter on failure. Marks as used on success.
 */
export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  inputCode: string,
): Promise<VerifyResult> {
  const record = await prisma.otpCode.findFirst({
    where: {
      email,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, error: "OTP đã hết hạn hoặc không tồn tại" };
  }

  if (record.attempts >= record.maxAttempts) {
    await prisma.otpCode.delete({ where: { id: record.id } }).catch(() => null);
    return { success: false, error: "OTP đã bị vô hiệu hóa do quá nhiều lần thử" };
  }

  const valid = await bcrypt.compare(inputCode, record.codeHash);

  if (!valid) {
    const newAttempts = record.attempts + 1;
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: newAttempts },
    });
    return {
      success: false,
      attemptsRemaining: record.maxAttempts - newAttempts,
      error: `Mã OTP không đúng. Còn ${record.maxAttempts - newAttempts} lần thử.`,
    };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { success: true };
}

/** Deletes expired OTP records — call from a cron job or cleanup route. */
export async function cleanExpiredOtps(): Promise<number> {
  const result = await prisma.otpCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  logger.info({ deleted: result.count }, "Cleaned expired OTPs");
  return result.count;
}
