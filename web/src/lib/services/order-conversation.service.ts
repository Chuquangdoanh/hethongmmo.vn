import { prisma } from "@/lib/db/prisma";

// Trả về map orderId -> id hội thoại dùng cho /ban-hang/khieu-nai?id=...
// Ưu tiên Complaint (khiếu nại đang xử lý) trước, SupportTicket (chat hỗ trợ sau khiếu nại) là dự phòng
export async function getOrderConversationLinks(orderIds: string[]): Promise<Map<string, string>> {
  if (orderIds.length === 0) return new Map();

  const [complaints, supportTickets] = await Promise.all([
    prisma.complaint.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderId: true },
    }),
    prisma.supportTicket.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true, orderId: true },
    }),
  ]);

  const links = new Map<string, string>();
  for (const c of complaints) {
    if (c.orderId && !links.has(c.orderId)) links.set(c.orderId, c.id);
  }
  for (const t of supportTickets) {
    if (!links.has(t.orderId)) links.set(t.orderId, `st-${t.id}`);
  }
  return links;
}
