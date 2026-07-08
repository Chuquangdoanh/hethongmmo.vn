import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notifySellerNewSupportMessage } from "@/lib/services/telegram-alert.service";

// Khớp hạn khiếu nại 2 giờ dùng ở api/user/complaints/route.ts — chỉ mở chat hỗ trợ
// SAU KHI hạn khiếu nại đã hết, để không chồng lấn với luồng khiếu nại có xử lý tiền.
const SUPPORT_TICKET_UNLOCK_MS = 2 * 60 * 60 * 1000;

export type SupportTicketRole = "USER" | "SELLER";

export async function getOrCreateSupportTicket(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, orderType: true, sellerId: true, createdAt: true },
  });

  if (!order || order.userId !== userId) throw new NotFoundError("Đơn hàng");
  if (order.orderType !== "SELLER_PRODUCT" || !order.sellerId) {
    throw new ValidationError("Đơn hàng này không hỗ trợ chat với nhà bán hàng.");
  }
  if (Date.now() - order.createdAt.getTime() < SUPPORT_TICKET_UNLOCK_MS) {
    throw new ValidationError("Chat hỗ trợ chỉ mở sau khi hết hạn khiếu nại.");
  }

  return prisma.supportTicket.upsert({
    where: { orderId },
    create: { orderId, userId: order.userId, sellerId: order.sellerId },
    update: {},
    select: { id: true },
  });
}

export async function resolveSupportTicketRole(
  ticketId: string,
  userId: string,
): Promise<{ role: SupportTicketRole; ticket: { id: string; userId: string; sellerId: string; orderId: string } }> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, sellerId: true, orderId: true },
  });
  if (!ticket) throw new NotFoundError("Ticket hỗ trợ");

  if (ticket.userId === userId) return { role: "USER", ticket };
  if (ticket.sellerId === userId) return { role: "SELLER", ticket };
  throw new NotFoundError("Ticket hỗ trợ");
}

export async function sendSupportMessage(
  ticketId: string,
  senderId: string,
  senderName: string,
  content: string,
) {
  const { role, ticket } = await resolveSupportTicketRole(ticketId, senderId);

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId, senderId, senderName, senderRole: role, content },
      select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
    }),
    prisma.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }),
  ]);

  // Chỉ báo seller khi buyer nhắn tin — buyer chưa có kết nối Telegram để nhận báo ngược lại
  if (role === "USER") {
    notifySellerNewSupportMessage(ticket.sellerId, ticket.userId, ticket.orderId, content);
  }

  return message;
}
