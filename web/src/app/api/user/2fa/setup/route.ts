import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUserFor2FASetup, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { generateTotpSecret } from "@/lib/auth/two-factor";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

/** GET — generate TOTP secret and QR code URL (does NOT save yet) */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUserFor2FASetup(session);

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) return apiError("Không tìm thấy người dùng", "NOT_FOUND", 404);
    if (user.twoFactorEnabled) {
      return apiError("2FA đã được bật", "ALREADY_ENABLED", 400);
    }

    const { secret, uri } = generateTotpSecret(user.email);

    // qrUrl intentionally omitted — client generates QR from uri locally
    return apiOk({ secret, uri });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    return apiCatch(err);
  }
}
