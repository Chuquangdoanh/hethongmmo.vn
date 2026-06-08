import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUserFor2FASetup, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encryptTotpSecret, verifyTotp } from "@/lib/auth/two-factor";
import { writeAuditLog } from "@/lib/security/audit";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const enableSchema = z.object({
  secret: z.string().min(16).max(64),
  code: z.string().length(6).regex(/^\d{6}$/),
});

/** POST — verify TOTP code against provided secret, then save and enable 2FA */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUserFor2FASetup(session);

    const body: unknown = await req.json();
    const parsed = enableSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { secret, code } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { twoFactorEnabled: true },
    });
    if (!user) return apiError("Không tìm thấy người dùng", "NOT_FOUND", 404);
    if (user.twoFactorEnabled) {
      return apiError("2FA đã được bật", "ALREADY_ENABLED", 400);
    }

    // Encrypt secret and verify the provided TOTP code against it
    const secretEnc = encryptTotpSecret(secret);
    const valid = verifyTotp(secretEnc, code);
    if (!valid) {
      return apiError("Mã xác thực không đúng", "INVALID_CODE", 400);
    }

    await prisma.user.update({
      where: { id: me.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecretEnc: secretEnc as unknown as Uint8Array<ArrayBuffer>,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "2FA_ENABLED",
      targetType: "User",
      targetId: me.id,
      before: { twoFactorEnabled: false },
      after: { twoFactorEnabled: true },
    });

    return apiSuccess("Xác thực 2 lớp đã được bật thành công");
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
