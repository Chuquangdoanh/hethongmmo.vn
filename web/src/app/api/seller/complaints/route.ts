import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

/* ── GET — danh sách khiếu nại từ khách hàng (seller view) ── */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    // Lấy tất cả order thuộc seller
    const sellerOrderIds = (
      await prisma.order.findMany({
        where: { sellerId: me.id },
        select: { id: true },
      })
    ).map((o) => o.id);

    if (sellerOrderIds.length === 0) return apiOk([]);

    const complaints = await prisma.complaint.findMany({
      where: { orderId: { in: sellerOrderIds } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        subject: true,
        status: true,
        updatedAt: true,
        orderId: true,
        user: { select: { fullName: true, email: true } },
        chatRoom: {
          select: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { senderName: true, content: true },
            },
          },
        },
      },
    });

    const orderIds = complaints.map((c) => c.orderId).filter(Boolean) as string[];
    const orders = orderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, orderCode: true, itemName: true },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const data = complaints.map((c) => {
      const order   = c.orderId ? orderMap.get(c.orderId) : null;
      const lastMsg = c.chatRoom?.messages[0];
      const buyer   = c.user.fullName ?? c.user.email;
      return {
        id:             c.id,
        subject:        c.subject,
        status:         c.status,
        updatedAt:      c.updatedAt.toISOString(),
        orderCode:      order?.orderCode      ?? null,
        itemName:       order?.itemName       ?? null,
        buyerName:      buyer,
        lastMsgSender:  lastMsg?.senderName   ?? null,
        lastMsgContent: lastMsg?.content      ?? null,
      };
    });

    return apiOk(data);
  } catch (err) {
    return apiCatch(err);
  }
}
