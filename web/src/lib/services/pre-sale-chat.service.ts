import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notifySellerNewPreSaleMessage } from "@/lib/services/telegram-alert.service";

export type PreSaleChatRole = "USER" | "SELLER";

export async function getOrCreatePreSaleChat(buyerId: string, sellerId: string) {
  if (buyerId === sellerId) {
    throw new ValidationError("Không thể tự nhắn tin với chính mình.");
  }

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, role: true, sellerStatus: true },
  });
  if (!seller || seller.role !== "SELLER" || seller.sellerStatus !== "APPROVED") {
    throw new NotFoundError("Nhà bán hàng");
  }

  return prisma.preSaleChat.upsert({
    where: { userId_sellerId: { userId: buyerId, sellerId } },
    create: { userId: buyerId, sellerId },
    update: {},
    select: { id: true },
  });
}

export async function resolvePreSaleChatRole(
  chatId: string,
  userId: string,
): Promise<{ role: PreSaleChatRole; chat: { id: string; userId: string; sellerId: string } }> {
  const chat = await prisma.preSaleChat.findUnique({
    where: { id: chatId },
    select: { id: true, userId: true, sellerId: true },
  });
  if (!chat) throw new NotFoundError("Cuộc trò chuyện");

  if (chat.userId === userId) return { role: "USER", chat };
  if (chat.sellerId === userId) return { role: "SELLER", chat };
  throw new NotFoundError("Cuộc trò chuyện");
}

export async function sendPreSaleMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  content: string,
) {
  const { role, chat } = await resolvePreSaleChatRole(chatId, senderId);

  const [message] = await prisma.$transaction([
    prisma.preSaleMessage.create({
      data: { chatId, senderId, senderName, senderRole: role, content },
      select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
    }),
    prisma.preSaleChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
  ]);

  // Chỉ báo seller khi buyer nhắn tin — seller trả lời qua UI, không cần báo ngược lại buyer
  if (role === "USER") {
    notifySellerNewPreSaleMessage(chat.sellerId, chat.userId, content);
  }

  return message;
}
