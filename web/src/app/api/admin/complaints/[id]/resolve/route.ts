import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";

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
      await tx.complaint.update({
        where: { id },
        data: {
          status: "REJECTED",
          resolvedByUserId: me.id,
          resolvedAt: new Date(),
          resolution: "Admin phán quyết: người mua thắng khiếu nại. Tiền hoàn về ví người mua.",
        },
      });

      if (!complaint.orderId) return;

      const order = await tx.order.findUnique({
        where: { id: complaint.orderId },
        select: { id: true, finalPrice: true, sellerId: true, withdrawn: true },
      });
      if (!order) return;

      const refundAmt = Number(order.finalPrice);
      refundedAmount = refundAmt;

      // Đặt order về REFUNDED
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

      // Hoàn tiền về ví người mua
      const buyer = await tx.user.findUnique({ where: { id: complaint.userId }, select: { balance: true } });
      if (buyer) {
        const balanceBefore = Number(buyer.balance);
        const balanceAfter  = balanceBefore + refundAmt;
        await tx.user.update({ where: { id: complaint.userId }, data: { balance: balanceAfter } });
        await tx.transaction.create({
          data: {
            userId:        complaint.userId,
            orderId:       complaint.orderId,
            type:          "REFUND",
            amount:        refundAmt,
            description:   "Hoàn tiền khiếu nại — admin phán quyết người mua thắng",
            balanceBefore,
            balanceAfter,
          },
        });
      }

      // Nếu seller đã rút tiền trước đó → trừ lại từ ví seller
      if (order.withdrawn && order.sellerId) {
        const seller = await tx.user.findUnique({ where: { id: order.sellerId }, select: { balance: true } });
        if (seller) {
          const balanceBefore = Number(seller.balance);
          const balanceAfter  = balanceBefore - refundAmt;
          await tx.user.update({ where: { id: order.sellerId }, data: { balance: balanceAfter } });
          await tx.transaction.create({
            data: {
              userId:      order.sellerId,
              orderId:     order.id,
              type:        "COMPLAINT_DEDUCTION",
              amount:      -refundAmt,
              description: "Trừ tiền do admin phán quyết khiếu nại — người mua thắng",
              balanceBefore,
              balanceAfter,
            },
          });
        }
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
