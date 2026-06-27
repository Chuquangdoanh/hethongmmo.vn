import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const resolveSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("seller") }),
  z.object({ role: z.literal("user"), done: z.boolean() }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: roomId } = await params;

    const body: unknown = await req.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    // Kiểm tra quyền truy cập phòng chat
    let participantLabel: string | null = null;
    if (me.role !== "ADMIN" && me.role !== "STAFF") {
      const participant = await prisma.chatParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: me.id } },
        select: { label: true },
      });
      if (!participant) return apiError("Không có quyền truy cập", "FORBIDDEN", 403);
      participantLabel = participant.label;
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        totalMsgCount: true,
        firstSellerMsgAt: true,
        sellerConfirmed: true,
        sellerConfirmedAt: true,
        userDone: true,
        complaint: {
          select: { id: true, status: true, orderId: true, userId: true },
        },
      },
    });

    if (!room) return apiError("Không tìm thấy phòng chat", "NOT_FOUND", 404);

    // $queryRaw bypass Prisma client validation — đọc đúng kể cả khi client cũ chưa biết field
    const r2rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
      SELECT round_two_opened FROM chat_rooms WHERE id = ${roomId}::uuid
    `;
    const roundTwoOpened = r2rows[0]?.round_two_opened ?? false;

    const { complaint } = room;
    if (complaint.status === "RESOLVED" || complaint.status === "REJECTED") {
      return apiError("Khiếu nại đã được xử lý.", "ALREADY_RESOLVED", 400);
    }

    // ── Seller xác nhận hoàn thành ──
    if (parsed.data.role === "seller") {
      // Kiểm tra người gửi là seller
      if (participantLabel !== "Nhà bán hàng" && me.role !== "ADMIN" && me.role !== "STAFF") {
        return apiError("Chỉ nhà bán hàng mới có thể xác nhận.", "FORBIDDEN", 403);
      }

      // Seller phải đã phản hồi ít nhất 1 tin trước khi xác nhận
      if (!room.firstSellerMsgAt) {
        return apiError("Bạn cần phản hồi người mua ít nhất 1 tin trước khi xác nhận.", "NOT_READY", 400);
      }

      if (room.sellerConfirmed) {
        return apiError("Nhà bán hàng đã xác nhận rồi.", "ALREADY_CONFIRMED", 400);
      }

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { sellerConfirmed: true, sellerConfirmedAt: new Date() },
      });

      // Nếu user đã đồng ý → RESOLVED ngay
      if (room.userDone === true) {
        await resolveComplaint(complaint.id, complaint.orderId);
        await writeAuditLog({ actorId: me.id, action: "RESOLVE_COMPLAINT_SELLER", targetType: "Complaint", targetId: complaint.id, after: { outcome: "seller_wins" } });
        return apiOk({ outcome: "RESOLVED" });
      }

      await writeAuditLog({ actorId: me.id, action: "SELLER_CONFIRMED", targetType: "ChatRoom", targetId: roomId, after: { sellerConfirmed: true } });
      return apiOk({ outcome: "WAITING_USER", message: "Đang chờ người mua xác nhận (60 phút)." });
    }

    // ── User xác nhận ──
    if (parsed.data.role === "user") {
      if (participantLabel !== "Người mua") {
        return apiError("Chỉ người mua mới có thể xác nhận.", "FORBIDDEN", 403);
      }

      if (!room.sellerConfirmed) {
        return apiError("Nhà bán hàng chưa xác nhận hoàn thành.", "SELLER_NOT_CONFIRMED", 400);
      }

      if (room.userDone !== null) {
        return apiError("Bạn đã xác nhận rồi.", "ALREADY_CONFIRMED", 400);
      }

      const { done } = parsed.data;

      if (done) {
        // User đồng ý → RESOLVED (seller thắng) + trả tiền seller
        await prisma.$transaction(async (tx) => {
          await tx.chatRoom.update({ where: { id: roomId }, data: { userDone: true } });
          await tx.complaint.update({
            where: { id: complaint.id },
            data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "Người mua xác nhận đã nhận hàng." },
          });
          if (complaint.orderId) {
            // Lock order row trước để tránh race condition
            await tx.$queryRaw`SELECT id FROM orders WHERE id = ${complaint.orderId}::uuid FOR UPDATE`;
            const order = await tx.order.findUnique({
              where: { id: complaint.orderId },
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
                  orderId: complaint.orderId,
                  type: "SELLER_PAYOUT",
                  amount: payAmt,
                  description: "Thanh toán đơn hàng — người mua xác nhận nhận hàng",
                  balanceBefore,
                  balanceAfter,
                },
              });
            }
            await tx.order.update({ where: { id: complaint.orderId }, data: { status: "DONE", withdrawn: true } });
          }
        });

        await writeAuditLog({ actorId: me.id, action: "RESOLVE_COMPLAINT_USER_DONE", targetType: "Complaint", targetId: complaint.id, after: { outcome: "seller_wins" } });
        return apiOk({ outcome: "RESOLVED" });
      } else {
        // User không đồng ý với kết quả của seller

        if (complaint.status === "IN_REVIEW") {
          // ── Vòng 1 tranh chấp → PENDING_ADMIN, đóng chat, chờ admin mở vòng 2 ──
          await prisma.$transaction([
            prisma.chatRoom.update({
              where: { id: roomId },
              data: { userDone: false }, // false = tranh chấp, chat đóng cho tới khi admin mở
            }),
            prisma.complaint.update({
              where: { id: complaint.id },
              data: {
                status:     "PENDING_ADMIN",
                resolution: "Người mua không đồng ý vòng 1. Chờ admin mở vòng 2 hoặc phán quyết.",
              },
            }),
          ]);

          await writeAuditLog({
            actorId: me.id,
            action: "DISPUTE_ROUND_1",
            targetType: "Complaint",
            targetId: complaint.id,
            after: { outcome: "pending_admin_waiting" },
          });
          return apiOk({ outcome: "PENDING_ADMIN_WAIT" });

        } else if (complaint.status === "PENDING_ADMIN" && roundTwoOpened) {
          // ── Vòng 2 tranh chấp cuối → đóng chat, admin phán quyết cuối ──
          await prisma.$transaction([
            prisma.chatRoom.update({
              where: { id: roomId },
              data: { userDone: false },
            }),
            prisma.complaint.update({
              where: { id: complaint.id },
              data: { resolution: "Người mua tiếp tục không đồng ý vòng 2. Chờ admin phán quyết cuối." },
            }),
          ]);

          await writeAuditLog({
            actorId: me.id,
            action: "DISPUTE_ROUND_2_FINAL",
            targetType: "Complaint",
            targetId: complaint.id,
            after: { outcome: "final_dispute_admin_decides" },
          });
          return apiOk({ outcome: "FINAL_DISPUTE" });

        } else {
          return apiError("Trạng thái khiếu nại không cho phép tranh chấp.", "INVALID_STATE", 400);
        }
      }
    }

    return apiError("Yêu cầu không hợp lệ.", "BAD_REQUEST", 400);
  } catch (err) {
    return apiCatch(err);
  }
}

async function resolveComplaint(complaintId: string, orderId: string | null) {
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: complaintId },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "Cả hai bên đã xác nhận hoàn thành." },
    });
    if (orderId) {
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
            description: "Thanh toán đơn hàng — cả hai bên xác nhận hoàn thành",
            balanceBefore,
            balanceAfter,
          },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "DONE", withdrawn: true } });
    }
  });
}
