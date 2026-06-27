import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";

const SELLER_REPLY_DEADLINE_MS  = 12 * 60 * 60 * 1000; // 12 giờ
const USER_CONFIRM_DEADLINE_MS  = 60 * 60 * 1000;      // 60 phút
const BUYER_REPLY_DEADLINE_MS   = 2 * 60 * 60 * 1000; // 2 giờ

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
      userTurnCount: true,
      createdAt: true,
      complaint: {
        select: { id: true, status: true, orderId: true, userId: true },
      },
    },
  });

  if (!room) return;
  const { complaint } = room;

  // Bỏ qua khi đã xong
  if (complaint.status === "RESOLVED" || complaint.status === "REJECTED") return;

  // PENDING_ADMIN: chỉ chạy auto-resolve khi admin đã mở vòng 2 (roundTwoOpened=true)
  // Nếu chưa mở vòng 2 → admin đang xem xét, không auto-resolve
  if (complaint.status === "PENDING_ADMIN") {
    const r2rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
      SELECT round_two_opened FROM chat_rooms WHERE id = ${room.id}::uuid
    `;
    const roundTwoOpened = r2rows[0]?.round_two_opened ?? false;
    if (!roundTwoOpened) return;
  } else if (complaint.status !== "IN_REVIEW") {
    return; // OPEN hoặc trạng thái khác — không auto-resolve
  }

  const now = Date.now();

  // ── Case 1: Seller không reply trong 12h → hoàn tiền user (REJECTED) ──
  if (!room.firstSellerMsgAt && now - room.createdAt.getTime() > SELLER_REPLY_DEADLINE_MS) {
    await autoReject(complaint.id, complaint.orderId, complaint.userId, "Nhà bán hàng không phản hồi trong 12 giờ. Hệ thống tự động hoàn tiền.");
    return;
  }

  // ── Case 3: Seller đã reply, user không phản hồi trong 2h → seller thắng (RESOLVED) ──
  // userTurnCount = 0 nghĩa là buyer chưa gửi tin nào kể từ lần seller reply cuối
  if (
    room.firstSellerMsgAt &&
    !room.sellerConfirmed &&
    room.userTurnCount === 0 &&
    room.userDone === null &&
    now - room.firstSellerMsgAt.getTime() > BUYER_REPLY_DEADLINE_MS
  ) {
    await autoResolve(
      complaint.id,
      complaint.orderId,
      "Người mua không phản hồi trong 2 giờ sau khi nhà bán hàng trả lời. Hệ thống tự động xác nhận đơn hàng.",
    );
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
    // Atomic guard — ngăn scheduler trigger 2 lần đồng thời gây double payment seller
    const guard = await tx.complaint.updateMany({
      where: { id: complaintId, status: { notIn: ["RESOLVED", "REJECTED"] } },
      data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
    });
    if (guard.count === 0) return;
    if (orderId) {
      // Trả tiền cho seller khi khiếu nại kết thúc có lợi cho seller
      // Lock order row trước để tránh race condition
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { finalPrice: true, sellerId: true },
      });
      if (order?.sellerId) {
        const payAmt = Number(order.finalPrice);
        // Lock seller row và đọc balance
        const sellerRows = await tx.$queryRaw<Array<{ balance: string }>>`
          SELECT balance::text FROM users WHERE id = ${order.sellerId}::uuid FOR UPDATE
        `;
        const balanceBefore = parseFloat(sellerRows[0]?.balance ?? "0");
        const balanceAfter = balanceBefore + payAmt;
        await tx.user.update({ where: { id: order.sellerId }, data: { balance: balanceAfter } });
        await tx.transaction.create({
          data: {
            userId: order.sellerId,
            orderId,
            type: "SELLER_PAYOUT",
            amount: payAmt,
            description: "Thanh toán đơn hàng — người mua không xác nhận trong 60 phút",
            balanceBefore,
            balanceAfter,
          },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "DONE", withdrawn: true } });
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
    // Atomic guard — ngăn scheduler trigger 2 lần đồng thời gây double refund buyer
    const guard = await tx.complaint.updateMany({
      where: { id: complaintId, status: { notIn: ["RESOLVED", "REJECTED"] } },
      data: { status: "REJECTED", resolution, resolvedAt: new Date() },
    });
    if (guard.count === 0) return;

    if (!orderId) return;

    // Lock order row trước để tránh race condition
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, finalPrice: true },
    });
    if (!order) return;

    // Giữ order ở REFUNDED — seller không thể rút tiền từ đơn này
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });

    // Lock user row và hoàn tiền về ví user
    const refundAmt = Number(order.finalPrice);
    const userRows = await tx.$queryRaw<Array<{ balance: string }>>`
      SELECT balance::text FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    if (!userRows[0]) return;

    const balanceBefore = parseFloat(userRows[0].balance);
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
