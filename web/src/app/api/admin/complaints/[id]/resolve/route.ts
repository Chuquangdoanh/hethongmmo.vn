import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "complaints:close");

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, status: true, orderId: true, subject: true, userId: true },
    });
    if (!complaint) return apiError("Khiếu nại không tồn tại", "NOT_FOUND", 404);
    if (complaint.status === "RESOLVED" || complaint.status === "REJECTED") {
      return apiError("Khiếu nại đã được xử lý", "ALREADY_RESOLVED", 400);
    }

    let refundedAmount = 0;

    await prisma.$transaction(async (tx) => {
      // Atomic guard — ngăn 2 admin bấm đồng thời gây double refund
      const guard = await tx.complaint.updateMany({
        where: { id, status: { notIn: ["RESOLVED", "REJECTED"] } },
        data: {
          status: "REJECTED",
          resolvedByUserId: me.id,
          resolvedAt: new Date(),
          resolution: "Admin phán quyết: người mua thắng khiếu nại. Tiền hoàn về ví người mua.",
        },
      });
      if (guard.count === 0) throw new ValidationError("Khiếu nại đã được xử lý");

      if (!complaint.orderId) return;

      // Lock order row trước khi đọc withdrawn flag — tránh race với withdrawal process
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${complaint.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: complaint.orderId },
        select: { id: true, finalPrice: true, sellerId: true, withdrawn: true },
      });
      if (!order) throw new ValidationError("Đơn hàng không tồn tại — không thể hoàn tiền");

      const refundAmt = Number(order.finalPrice);
      refundedAmount = refundAmt;

      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

      // Lock buyer row và hoàn tiền về ví người mua
      const buyerRows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance::text FROM users WHERE id = ${complaint.userId}::uuid FOR UPDATE
      `;
      const buyerBalanceBefore = parseFloat(buyerRows[0]?.balance ?? "0");
      const buyerBalanceAfter  = buyerBalanceBefore + refundAmt;
      await tx.user.update({ where: { id: complaint.userId }, data: { balance: buyerBalanceAfter } });
      await tx.transaction.create({
        data: {
          userId:        complaint.userId,
          orderId:       complaint.orderId,
          type:          "REFUND",
          amount:        refundAmt,
          description:   "Hoàn tiền khiếu nại — admin phán quyết người mua thắng",
          balanceBefore: buyerBalanceBefore,
          balanceAfter:  buyerBalanceAfter,
        },
      });

      // Nếu seller đã rút tiền trước đó → lock và trừ lại từ ví seller
      if (order.withdrawn && order.sellerId) {
        const sellerRows = await tx.$queryRaw<Array<{ balance: string }>>`
          SELECT balance::text FROM users WHERE id = ${order.sellerId}::uuid FOR UPDATE
        `;
        const sellerBalanceBefore = parseFloat(sellerRows[0]?.balance ?? "0");
        if (sellerBalanceBefore < refundAmt) {
          throw new ValidationError(
            `Ví seller không đủ để hoàn tiền (cần ${refundAmt}, hiện có ${sellerBalanceBefore}). Vui lòng xử lý thủ công.`,
          );
        }
        const sellerBalanceAfter = sellerBalanceBefore - refundAmt;
        await tx.user.update({ where: { id: order.sellerId }, data: { balance: sellerBalanceAfter } });
        await tx.transaction.create({
          data: {
            userId:        order.sellerId,
            orderId:       order.id,
            type:          "COMPLAINT_DEDUCTION",
            amount:        -refundAmt,
            description:   "Trừ tiền do admin phán quyết khiếu nại — người mua thắng",
            balanceBefore: sellerBalanceBefore,
            balanceAfter:  sellerBalanceAfter,
          },
        });
      }
    });

    await writeAuditLog({
      actorId: me.id,
      action: "ADMIN_REJECT_COMPLAINT",
      targetType: "Complaint",
      targetId: id,
      after: { outcome: "user_wins", refundedAmount },
    });

    return apiOk({ resolved: true, outcome: "user_wins", refundedAmount });
  } catch (err) {
    return apiCatch(err);
  }
}
