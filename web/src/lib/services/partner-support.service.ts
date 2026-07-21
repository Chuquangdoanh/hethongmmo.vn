import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/security/audit";
import { getPublicProviderInfo } from "@/lib/external-providers/providers-config";

export type PartnerSupportRole = "USER" | "PROVIDER";

const MAX_MESSAGES = 200;

// Buyer mở (hoặc lấy lại) thread hỗ trợ cho 1 đơn sản phẩm gian hàng đối tác (external).
// Một đơn = một thread. Tin đầu tiên do buyer gửi.
export async function openPartnerSupportThread(
  buyerId: string,
  orderId: string,
  subject: string,
  content: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, userId: true, orderType: true, itemName: true,
      externalProduct: { select: { provider: true } },
    },
  });
  if (!order || order.userId !== buyerId) throw new NotFoundError("Đơn hàng");
  if (order.orderType !== "KHUONGFB_PRODUCT" || !order.externalProduct) {
    throw new ValidationError("Chỉ đơn hàng gian hàng đối tác mới hỗ trợ chat này.");
  }

  const existing = await prisma.partnerSupportThread.findUnique({
    where: { orderId },
    select: { id: true },
  });
  if (existing) return existing;

  const providerId = order.externalProduct.provider;
  const providerInfo = await getPublicProviderInfo(providerId);
  const providerName = providerInfo?.name ?? "Gian hàng đối tác";

  const thread = await prisma.partnerSupportThread.create({
    data: {
      orderId,
      userId: buyerId,
      providerId,
      providerName,
      subject,
      messages: {
        create: {
          senderId: buyerId,
          senderName: "Người mua",
          senderRole: "USER",
          content,
        },
      },
    },
    select: { id: true },
  });

  return thread;
}

// Xác định vai trò của người đang truy cập thread. Admin/Staff luôn là "PROVIDER"
// (đóng vai gian hàng để trả lời). Buyer là "USER". Người khác → 404.
export async function assertPartnerThreadAccess(
  threadId: string,
  userId: string,
  role: string,
): Promise<{ threadRole: PartnerSupportRole; providerName: string; buyerId: string }> {
  const thread = await prisma.partnerSupportThread.findUnique({
    where: { id: threadId },
    select: { userId: true, providerName: true },
  });
  if (!thread) throw new NotFoundError("Cuộc trò chuyện");

  if (role === "ADMIN" || role === "STAFF") {
    return { threadRole: "PROVIDER", providerName: thread.providerName, buyerId: thread.userId };
  }
  if (thread.userId === userId) {
    return { threadRole: "USER", providerName: thread.providerName, buyerId: thread.userId };
  }
  throw new NotFoundError("Cuộc trò chuyện");
}

export async function getPartnerThreadSnapshot(threadId: string, after: Date | null) {
  const [thread, messages] = await Promise.all([
    prisma.partnerSupportThread.findUnique({
      where: { id: threadId },
      select: { id: true, status: true, subject: true, providerName: true },
    }),
    prisma.partnerSupportMessage.findMany({
      where: { threadId, ...(after ? { createdAt: { gt: after } } : {}) },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
    }),
  ]);
  if (!thread) return null;

  return {
    status: thread.status,
    subject: thread.subject,
    providerName: thread.providerName,
    closed: thread.status !== "OPEN",
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };
}

export async function postPartnerMessage(
  threadId: string,
  senderId: string,
  role: PartnerSupportRole,
  providerName: string,
  content: string,
) {
  const thread = await prisma.partnerSupportThread.findUnique({
    where: { id: threadId },
    select: { status: true, _count: { select: { messages: true } } },
  });
  if (!thread) throw new NotFoundError("Cuộc trò chuyện");
  if (thread.status !== "OPEN") throw new ValidationError("Cuộc trò chuyện đã đóng.");
  if (thread._count.messages >= MAX_MESSAGES) {
    throw new ValidationError("Đã đạt giới hạn tin nhắn cho cuộc trò chuyện này.");
  }

  const senderName = role === "PROVIDER" ? providerName : "Người mua";

  const [message] = await prisma.$transaction([
    prisma.partnerSupportMessage.create({
      data: { threadId, senderId, senderName, senderRole: role, content },
      select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
    }),
    prisma.partnerSupportThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
  ]);

  return { ...message, createdAt: message.createdAt.toISOString() };
}

// Admin hoàn tiền cho khách: hoàn từ hệ thống → ví buyer, GIỮ order.status = DONE
// (doanh thu/lợi nhuận không bị trừ), chỉ set cờ partnerRefunded để hiển thị badge.
export async function partnerRefund(threadId: string, adminId: string, reason?: string) {
  const thread = await prisma.partnerSupportThread.findUnique({
    where: { id: threadId },
    select: { id: true, orderId: true, userId: true, status: true },
  });
  if (!thread) throw new NotFoundError("Cuộc trò chuyện");
  if (thread.status === "REFUNDED") throw new ValidationError("Đơn này đã được hoàn tiền.");

  let refundedAmount = 0;

  await prisma.$transaction(async (tx) => {
    // Lock order row — tránh race với các thao tác đơn khác
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${thread.orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: thread.orderId },
      select: { id: true, finalPrice: true, partnerRefunded: true, userId: true },
    });
    if (!order) throw new ValidationError("Đơn hàng không tồn tại");
    if (order.partnerRefunded) throw new ValidationError("Đơn này đã được hoàn tiền.");

    const refundAmt = Number(order.finalPrice);
    refundedAmount = refundAmt;

    // GIỮ status DONE — chỉ set cờ để doanh thu/lợi nhuận không bị trừ
    await tx.order.update({
      where: { id: order.id },
      data: {
        partnerRefunded: true,
        partnerRefundedAt: new Date(),
        partnerRefundReason: reason ?? "Admin hoàn tiền hỗ trợ gian hàng đối tác",
      },
    });

    // Lock buyer row và hoàn tiền từ hệ thống về ví người mua
    const buyerRows = await tx.$queryRaw<Array<{ balance: string }>>`
      SELECT balance::text FROM users WHERE id = ${order.userId}::uuid FOR UPDATE
    `;
    const balanceBefore = parseFloat(buyerRows[0]?.balance ?? "0");
    const balanceAfter = balanceBefore + refundAmt;
    await tx.user.update({ where: { id: order.userId }, data: { balance: balanceAfter } });
    await tx.transaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: "REFUND",
        amount: refundAmt,
        description: "Hoàn tiền hỗ trợ gian hàng đối tác — hệ thống hoàn cho khách",
        balanceBefore,
        balanceAfter,
      },
    });

    await tx.partnerSupportThread.update({ where: { id: threadId }, data: { status: "REFUNDED" } });
  });

  await writeAuditLog({
    actorId: adminId,
    action: "PARTNER_SUPPORT_REFUND",
    targetType: "PartnerSupportThread",
    targetId: threadId,
    after: { orderId: thread.orderId, refundedAmount, keepRevenue: true },
  });

  return refundedAmount;
}

export async function resolvePartnerThread(threadId: string, adminId: string) {
  const updated = await prisma.partnerSupportThread.updateMany({
    where: { id: threadId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });
  if (updated.count === 0) throw new ValidationError("Cuộc trò chuyện đã đóng.");

  await writeAuditLog({
    actorId: adminId,
    action: "PARTNER_SUPPORT_RESOLVE",
    targetType: "PartnerSupportThread",
    targetId: threadId,
  });
}
