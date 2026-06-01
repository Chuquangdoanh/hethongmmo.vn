import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { verifyTotp } from "@/lib/auth/two-factor";
import { writeAuditLog } from "@/lib/security/audit";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const disableSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

/** POST — verify current TOTP code, then disable 2FA */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = disableSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { code } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { twoFactorEnabled: true, twoFactorSecretEnc: true },
    });
    if (!user) return apiError("Không tìm thấy người dùng", "NOT_FOUND", 404);
    if (!user.twoFactorEnabled || !user.twoFactorSecretEnc) {
      return apiError("2FA chưa được bật", "NOT_ENABLED", 400);
    }

    const valid = verifyTotp(user.twoFactorSecretEnc as unknown as Buffer, code);
    if (!valid) {
      return apiError("Mã xác thực không đúng", "INVALID_CODE", 400);
    }

    await prisma.user.update({
      where: { id: me.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecretEnc: null,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "2FA_DISABLED",
      targetType: "User",
      targetId: me.id,
      before: { twoFactorEnabled: true },
      after: { twoFactorEnabled: false },
    });

    return apiSuccess("Xác thực 2 lớp đã được tắt");
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
