import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id: complaintId } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { chatRoom: true },
    });
    if (!complaint) {
      return NextResponse.json({ error: "Không tìm thấy khiếu nại", code: "NOT_FOUND" }, { status: 404 });
    }

    // Return existing room if already created
    if (complaint.chatRoom) {
      const existing = await prisma.chatRoom.findUnique({
        where: { id: complaint.chatRoom.id },
        include: {
          participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      });
      return apiOk(formatRoom(existing!));
    }

    // Resolve user
    const buyer = await prisma.user.findUnique({
      where: { id: complaint.userId },
      select: { id: true, fullName: true, email: true },
    });
    if (!buyer) {
      return NextResponse.json({ error: "Không tìm thấy người mua", code: "NOT_FOUND" }, { status: 404 });
    }

    // Resolve seller if SELLER_PRODUCT order
    let sellerId: string | null = null;
    let sellerEmail: string | null = null;
    if (complaint.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: complaint.orderId },
        select: {
          orderType: true,
          sellerProduct: { select: { seller: { select: { id: true, email: true } } } },
        },
      });
      if (order?.orderType === "SELLER_PRODUCT" && order.sellerProduct?.seller) {
        sellerId = order.sellerProduct.seller.id;
        sellerEmail = order.sellerProduct.seller.email;
      }
    }

    // Build participant list (avoid duplicate if admin is the buyer or seller)
    const participantEntries: { userId: string; label: string }[] = [
      { userId: me.id, label: "Admin" },
    ];
    if (buyer.id !== me.id) {
      participantEntries.push({ userId: buyer.id, label: "Người mua" });
    }
    if (sellerId && sellerId !== me.id && sellerId !== buyer.id) {
      participantEntries.push({ userId: sellerId, label: "Nhà bán hàng" });
    }

    const [chatRoom] = await prisma.$transaction([
      prisma.chatRoom.create({
        data: {
          complaintId,
          participants: { create: participantEntries },
        },
        include: {
          participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      }),
      prisma.complaint.update({
        where: { id: complaintId },
        data: { status: "IN_REVIEW" },
      }),
    ]);

    await writeAuditLog({
      actorId: me.id,
      action: "CREATE_CHAT_ROOM",
      targetType: "Complaint",
      targetId: complaintId,
      after: { chatRoomId: chatRoom.id },
    });

    return apiOk(formatRoom(chatRoom), 201);
  } catch (err) {
    return apiCatch(err);
  }
}

function formatRoom(room: {
  id: string;
  participants: Array<{ userId: string; label: string; user: { id: string; fullName: string; email: string } }>;
  messages: Array<{ id: string; senderId: string; senderName: string; senderLabel: string; content: string; createdAt: Date }>;
}) {
  return {
    id: room.id,
    participants: room.participants.map((p) => ({
      userId: p.userId,
      label: p.label,
      userName: p.user.fullName ?? p.user.email,
    })),
    messages: room.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderLabel: m.senderLabel,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
