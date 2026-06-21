import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Decimal from "decimal.js";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

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

    const deductAmount = new Decimal(amount);
    const referenceCode = `DEDUCT-${me.id.replace(/-/g, "").slice(0, 6).toUpperCase()}-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance FROM users WHERE id = ${user.id}::uuid FOR UPDATE
      `;
      const row = rows[0];
      if (!row) throw new NotFoundError("User");

      const balanceBefore = new Decimal(row.balance);
      if (balanceBefore.lt(deductAmount)) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const balanceAfter = balanceBefore.sub(deductAmount);

      await tx.$executeRaw`
        UPDATE users
        SET balance    = ${balanceAfter.toFixed(2)}::numeric,
            updated_at = now()
        WHERE id = ${user.id}::uuid
      `;

      const transaction = await tx.transaction.create({
        data: {
          userId:        user.id,
          type:          "ADMIN_ADJUSTMENT",
          amount:        deductAmount.neg().toFixed(2), // lưu âm để phân biệt với nạp
          description:   `Admin trừ tiền: ${note}`,
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter:  balanceAfter.toFixed(2),
          referenceCode,
          metadata:      { adminId: me.id, note },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId:    me.id,
          action:     "ADMIN_DEDUCT_BALANCE",
          targetType: "User",
          targetId:   user.id,
          before:     { balance: balanceBefore.toFixed(2) },
          after:      { balance: balanceAfter.toFixed(2) },
          metadata:   { adminId: me.id, note, amount },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title:  "Số dư bị điều chỉnh",
          body:   `Số dư bị trừ ${deductAmount.toFixed(0)}đ. Lý do: ${note}. Số dư còn lại: ${balanceAfter.toFixed(0)}đ`,
          type:   "SYSTEM",
          meta:   { amount: deductAmount.toFixed(2), referenceCode },
        },
      });

      return { newBalance: balanceAfter.toFixed(2) };
    });

    return apiOk({
      email:      user.email,
      fullName:   user.fullName,
      amount,
      newBalance: Number(result.newBalance),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return apiError("Số dư người dùng không đủ để trừ", "INSUFFICIENT_BALANCE", 400);
    }
    return apiCatch(err);
  }
}
