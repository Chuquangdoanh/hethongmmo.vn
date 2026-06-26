import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

// Admin mở vòng 2: reset chat và cho phép user/seller tiếp tục đàm phán
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "complaints:update");
    const { id: complaintId } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        status: true,
        chatRoom: { select: { id: true, userDone: true } },
      },
    });

    // $queryRaw bypass Prisma client validation — đọc đúng kể cả khi client cũ chưa biết field
    let roundTwoOpened = false;
    if (complaint?.chatRoom?.id) {
      const r2rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
        SELECT round_two_opened FROM chat_rooms WHERE id = ${complaint.chatRoom.id}::uuid
      `;
      roundTwoOpened = r2rows[0]?.round_two_opened ?? false;
    }

    if (!complaint) return apiError("Không tìm thấy khiếu nại", "NOT_FOUND", 404);
    if (complaint.status !== "PENDING_ADMIN") {
      return apiError("Chỉ mở vòng 2 khi khiếu nại đang PENDING_ADMIN.", "INVALID_STATE", 400);
    }
    if (!complaint.chatRoom) {
      return apiError("Chưa có phòng chat.", "NO_CHAT_ROOM", 400);
    }
    if (roundTwoOpened) {
      return apiError("Vòng 2 đã được mở trước đó.", "ALREADY_OPENED", 400);
    }

    // Reset chat để bắt đầu vòng 2
    // roundTwoOpened set qua $executeRaw để tránh lỗi khi Prisma client cũ chưa có field này
    const chatRoomId = complaint.chatRoom.id;
    await prisma.$transaction(async (tx) => {
      await tx.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          sellerConfirmed:  false,
          sellerConfirmedAt: null,
          userDone:         null,
          totalMsgCount:    0,
          userTurnCount:    0,
          firstSellerMsgAt: null,
        },
      });
      // Set round_two_opened = true trực tiếp qua SQL (hoạt động kể cả khi Prisma client cũ)
      await tx.$executeRaw`UPDATE chat_rooms SET round_two_opened = true WHERE id = ${chatRoomId}::uuid`;
      await tx.complaint.update({
        where: { id: complaintId },
        data: { resolution: "Admin mở vòng 2. Seller và user có thêm cơ hội đàm phán." },
      });
    });

    await writeAuditLog({
      actorId: me.id,
      action: "ADMIN_OPEN_ROUND_2",
      targetType: "Complaint",
      targetId: complaintId,
      after: { action: "round_2_opened_reset_chat" },
    });

    return apiOk({ outcome: "ROUND_2_OPENED" });
  } catch (err) {
    return apiCatch(err);
  }
}
