import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";

const SELLER_REPLY_DEADLINE_MS = 12 * 60 * 60 * 1000; // 12 giờ
const USER_CONFIRM_DEADLINE_MS = 60 * 60 * 1000;       // 60 phút

export async function checkAutoResolution(roomId: string): Promise<void> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      complaintId: true,
      firstSellerMsgAt: true,
      sellerConfirmed: true,
      sellerConfirmedAt: true,
      userDone: true,
      createdAt: true,
      complaint: {
        select: { id: true, status: true, orderId: true, userId: true },
      },
    },
  });

  if (!room) return;
  const { complaint } = room;

  // Chỉ chạy khi complaint đang active
  if (complaint.status !== "IN_REVIEW" && complaint.status !== "PENDING_ADMIN") return;

  const now = Date.now();

  // ── Case 1: Seller không reply trong 12h → hoàn tiền user (REJECTED) ──
  if (!room.firstSellerMsgAt && now - room.createdAt.getTime() > SELLER_REPLY_DEADLINE_MS) {
    await autoReject(complaint.id, complaint.orderId, complaint.userId, "Nhà bán hàng không phản hồi trong 12 giờ. Hệ thống tự động hoàn tiền.");
    return;
  }

  // ── Case 2: Seller đã confirm, user không bấm trong 60' → seller thắng (RESOLVED) ──
  if (
    room.sellerConfirmed &&
    room.sellerConfirmedAt &&
    room.userDone === null &&
    now - room.sellerConfirmedAt.getTime() > USER_CONFIRM_DEADLINE_MS
  ) {
    await autoResolve(complaint.id, complaint.orderId, "Người mua không xác nhận trong 60 phút. Hệ thống tự động xác nhận đơn hàng.");
    return;
  }
}

async function autoResolve(complaintId: string, orderId: string | null, resolution: string) {
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: complaintId },
      data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
    });
    if (orderId) {
      await tx.order.update({ where: { id: orderId }, data: { status: "DONE" } });
    }
  });

  await writeAuditLog({
    actorId: undefined,
    action: "AUTO_RESOLVE_COMPLAINT",
    targetType: "Complaint",
    targetId: complaintId,
    after: { orderId, resolution },
  });
}

async function autoReject(complaintId: string, orderId: string | null, userId: string, resolution: string) {
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: complaintId },
      data: { status: "REJECTED", resolution, resolvedAt: new Date() },
    });

    if (!orderId) return;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, finalPrice: true },
    });
    if (!order) return;

    await tx.order.update({ where: { id: orderId }, data: { status: "DONE" } });

    // Hoàn tiền về ví user
    const refundAmt = Number(order.finalPrice);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user) return;

    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore + refundAmt;

    await tx.user.update({ where: { id: userId }, data: { balance: balanceAfter } });
    await tx.transaction.create({
      data: {
        userId,
        orderId,
        type: "REFUND",
        amount: refundAmt,
        description: `Hoàn tiền khiếu nại — seller không phản hồi trong 12 giờ`,
        balanceBefore,
        balanceAfter,
      },
    });
  });

  await writeAuditLog({
    actorId: undefined,
    action: "AUTO_REJECT_COMPLAINT",
    targetType: "Complaint",
    targetId: complaintId,
    after: { orderId, resolution },
  });
}
