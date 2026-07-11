import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { checkAutoResolution } from "@/lib/services/complaint-auto-resolve";
import { sendSellerFirstReplyEmail } from "@/lib/services/email.service";
import { assertChatAccess, makeChatQuota, getChatSnapshot } from "@/lib/services/chat-stream.service";

export const runtime = "nodejs";

const TOTAL_MSG_LIMIT = 100;
const USER_TURN_LIMIT = 3;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: roomId } = await params;

    const senderLabel = await assertChatAccess(roomId, me.id, me.role);

    // Lazy auto-resolution check — lỗi bên trong không được làm hỏng response
    try { await checkAutoResolution(roomId); } catch { /* silent — không block user */ }

    const afterStr = req.nextUrl.searchParams.get("after");
    const after = afterStr ? new Date(afterStr) : null;

    const snapshot = await getChatSnapshot(roomId, after, senderLabel);
    if (!snapshot) return NextResponse.json({ error: "Không tìm thấy phòng chat", code: "NOT_FOUND" }, { status: 404 });

    return apiOk(snapshot);
  } catch (err: unknown) {
    if (err instanceof Error && (err as { statusCode?: number }).statusCode === 403) {
      return NextResponse.json({ error: "Không có quyền truy cập", code: "FORBIDDEN" }, { status: 403 });
    }
    return apiCatch(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: roomId } = await params;

    const senderLabel = await assertChatAccess(roomId, me.id, me.role);

    // Lazy auto-resolution check — lỗi bên trong không được làm hỏng response
    try { await checkAutoResolution(roomId); } catch { /* silent — không block user */ }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        totalMsgCount: true,
        userTurnCount: true,
        firstSellerMsgAt: true,
        sellerConfirmed: true,
        userDone: true,
        complaint: {
          select: {
            status: true,
            subject: true,
            orderId: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!room) return NextResponse.json({ error: "Không tìm thấy phòng chat", code: "NOT_FOUND" }, { status: 404 });

    const status = room.complaint?.status;

    // Chat đóng khi:
    // - Kết thúc hoàn toàn (RESOLVED/REJECTED)
    // - PENDING_ADMIN + userDone=false (cả vòng 1 chờ admin lẫn vòng 2 tranh chấp cuối)
    const chatClosed = status === "RESOLVED" || status === "REJECTED" ||
      (status === "PENDING_ADMIN" && room.userDone === false);
    if (chatClosed) {
      return NextResponse.json({ error: "Chat hiện đang đóng.", code: "CHAT_ENDED" }, { status: 400 });
    }

    // Hết tổng quota → block
    if (room.totalMsgCount >= TOTAL_MSG_LIMIT) {
      return NextResponse.json(
        { error: "Đã đạt giới hạn 100 tin nhắn. Vui lòng xác nhận kết quả.", code: "QUOTA_EXCEEDED" },
        { status: 400 },
      );
    }

    // User bị giới hạn 3 tin/lượt
    if (senderLabel === "Người mua" && room.userTurnCount >= USER_TURN_LIMIT) {
      return NextResponse.json(
        { error: "Bạn đã gửi 3 tin nhắn. Vui lòng chờ nhà bán hàng phản hồi.", code: "TURN_LIMIT_REACHED" },
        { status: 429 },
      );
    }

    const body: unknown = await req.json();
    const parsed = z.object({ content: z.string().min(1).max(2000).trim() }).safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const senderName = senderLabel === "Nhà bán hàng"
      ? `Seller #${me.id.slice(0, 8).toUpperCase()}`
      : (me.fullName ?? me.email);

    // Cập nhật counters + ghi tin nhắn
    const isSeller = senderLabel === "Nhà bán hàng";
    const newTotalMsgCount = room.totalMsgCount + 1;
    const newUserTurnCount = isSeller ? 0 : room.userTurnCount + 1;

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: { roomId, senderId: me.id, senderName, senderLabel, content: parsed.data.content },
        select: { id: true, senderId: true, senderName: true, senderLabel: true, content: true, createdAt: true },
      }),
      prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          totalMsgCount: newTotalMsgCount,
          userTurnCount: newUserTurnCount,
          // Set firstSellerMsgAt khi seller gửi tin đầu tiên (dùng để check 12h deadline)
          ...(isSeller && !room.firstSellerMsgAt ? { firstSellerMsgAt: new Date() } : {}),
        },
      }),
    ]);

    const quota = makeChatQuota(newTotalMsgCount, newUserTurnCount, senderLabel);

    // Gửi email thông báo cho user khi seller phản hồi lần đầu tiên
    if (isSeller && !room.firstSellerMsgAt && room.complaint?.user?.email && room.complaint.orderId) {
      sendSellerFirstReplyEmail({
        to: room.complaint.user.email,
        subject: room.complaint.subject ?? "Khiếu nại đơn hàng",
        orderId: room.complaint.orderId,
      }).catch(() => {});
    }

    return apiOk(
      { ...message, createdAt: message.createdAt.toISOString(), quota },
      201,
    );
  } catch (err: unknown) {
    if (err instanceof Error && (err as { statusCode?: number }).statusCode === 403) {
      return NextResponse.json({ error: "Không có quyền truy cập", code: "FORBIDDEN" }, { status: 403 });
    }
    return apiCatch(err);
  }
}
