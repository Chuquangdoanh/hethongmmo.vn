import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { processDeposit } from "@/lib/services/deposit.service";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  userEmail: z.string().email("Email không hợp lệ"),
  amount:    z.number().int().min(1_000, "Tối thiểu 1.000đ").max(500_000_000, "Tối đa 500 triệu"),
  note:      z.string().min(3, "Ghi chú tối thiểu 3 ký tự").max(200),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "finance:approve");

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { userEmail, amount, note } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email: userEmail, deletedAt: null },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) return apiError("Không tìm thấy người dùng với email này", "USER_NOT_FOUND", 404);

    const referenceCode = `MANUAL-${me.id.replace(/-/g, "").slice(0, 6).toUpperCase()}-${Date.now()}`;

    await processDeposit({
      userId: user.id,
      amount,
      referenceCode,
      description: `Admin nạp thủ công: ${note}`,
      type: "DEPOSIT_MANUAL",
      metadata: { adminId: me.id, note },
    });

    return apiOk({ email: user.email, fullName: user.fullName, amount });
  } catch (err) {
    return apiCatch(err);
  }
}
