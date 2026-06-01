import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import {
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  checkPwnedPassword,
} from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation/user.schema";
import { toApiError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch current password hash
    const user = await prisma.user.findUnique({
      where: { id: me.id, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Verify current password
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng", code: "INVALID_PASSWORD" },
        { status: 401 },
      );
    }

    // Validate new password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.errors.join(". "), code: "WEAK_PASSWORD" },
        { status: 400 },
      );
    }

    // HIBP breach check (fail open)
    try {
      await checkPwnedPassword(newPassword);
    } catch (err) {
      if (err instanceof Error && err.message === "PASSWORD_PWNED") {
        return NextResponse.json(
          {
            error: "Mật khẩu này đã bị lộ trong các vụ rò rỉ dữ liệu. Vui lòng chọn mật khẩu khác.",
            code: "PASSWORD_PWNED",
          },
          { status: 400 },
        );
      }
    }

    const newHash = await hashPassword(newPassword);

    // Update password and invalidate DB sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: me.id },
        data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
      }),
      prisma.session.deleteMany({ where: { userId: me.id } }),
    ]);

    logger.info({ userId: me.id }, "Password changed successfully");
    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
