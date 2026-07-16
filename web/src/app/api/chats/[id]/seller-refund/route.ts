import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/security/audit";
import { voidAffiliateCommission } from "@/lib/services/affiliate-commission.service";

export const runtime = "nodejs";

// Nhà bán hàng chủ động hoàn tiền ngay cho người mua trong lúc đàm phán khiếu nại —
// không cần chờ admin phán quyết hoặc hết hạn timer auto-resolve. Tái sử dụng đúng
// logic tiền tệ đã có ở /api/admin/complaints/[id]/resolve (buyer thắng khiếu nại).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: roomId } = await params;

    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: me.id } },
      select: { label: true },
    });
    if (!participant || participant.label !== "Nhà bán hàng") {
      return apiError("Chỉ nhà bán hàng mới có thể hoàn tiền.", "FORBIDDEN", 403);
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        complaint: { select: { id: true, status: true, orderId: true, userId: true } },
      },
    });
    if (!room) return apiError("Không tìm thấy phòng chat", "NOT_FOUND", 404);

    const { complaint } = room;
    if (complaint.status === "RESOLVED" || complaint.status === "REJECTED") {
      return apiError("Khiếu nại đã được xử lý.", "ALREADY_RESOLVED", 400);
    }
    if (!complaint.orderId) return apiError("Khiếu nại không có đơn hàng liên kết", "NO_ORDER", 400);

    let refundedAmount = 0;

    await prisma.$transaction(async (tx) => {
      // Atomic guard — ngăn seller bấm 2 lần đồng thời gây double refund
      const guard = await tx.complaint.updateMany({
        where: { id: complaint.id, status: { notIn: ["RESOLVED", "REJECTED"] } },
        data: {
          status: "REJECTED",
          resolvedByUserId: me.id,
          resolvedAt: new Date(),
          resolution: "Nhà bán hàng chủ động hoàn tiền ngay cho người mua, không chờ hệ thống xử lý.",
        },
      });
      if (guard.count === 0) throw new ValidationError("Khiếu nại đã được xử lý");

      // Lock order row trước khi đọc withdrawn flag — tránh race với withdrawal process
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${complaint.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: complaint.orderId! },
        select: { id: true, finalPrice: true, sellerId: true, withdrawn: true },
      });
      if (!order) throw new ValidationError("Đơn hàng không tồn tại — không thể hoàn tiền");
      if (order.sellerId !== me.id) throw new ValidationError("Bạn không có quyền hoàn tiền đơn hàng này");

      const refundAmt = Number(order.finalPrice);
      refundedAmount = refundAmt;

      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      await voidAffiliateCommission(tx, order.id, "Nhà bán hàng chủ động hoàn tiền khiếu nại");

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
          description:   "Hoàn tiền khiếu nại — nhà bán hàng chủ động hoàn tiền ngay",
          balanceBefore: buyerBalanceBefore,
          balanceAfter:  buyerBalanceAfter,
        },
      });

      // Nếu seller đã rút tiền đơn này trước đó → lock và trừ lại từ ví seller
      if (order.withdrawn) {
        const sellerRows = await tx.$queryRaw<Array<{ balance: string }>>`
          SELECT balance::text FROM users WHERE id = ${me.id}::uuid FOR UPDATE
        `;
        const sellerBalanceBefore = parseFloat(sellerRows[0]?.balance ?? "0");
        if (sellerBalanceBefore < refundAmt) {
          throw new ValidationError(
            `Số dư của bạn không đủ để hoàn tiền (cần ${refundAmt}, hiện có ${sellerBalanceBefore}). Vui lòng liên hệ admin.`,
          );
        }
        const sellerBalanceAfter = sellerBalanceBefore - refundAmt;
        await tx.user.update({ where: { id: me.id }, data: { balance: sellerBalanceAfter } });
        await tx.transaction.create({
          data: {
            userId:        me.id,
            orderId:       order.id,
            type:          "COMPLAINT_DEDUCTION",
            amount:        -refundAmt,
            description:   "Trừ tiền do chủ động hoàn tiền khiếu nại cho người mua",
            balanceBefore: sellerBalanceBefore,
            balanceAfter:  sellerBalanceAfter,
          },
        });
      }
    });

    await writeAuditLog({
      actorId: me.id,
      action: "SELLER_SELF_REFUND_COMPLAINT",
      targetType: "Complaint",
      targetId: complaint.id,
      after: { outcome: "user_wins_seller_initiated", refundedAmount },
    });

    return apiOk({ outcome: "REJECTED", refundedAmount });
  } catch (err) {
    return apiCatch(err);
  }
}
