import { prisma } from "@/lib/db/prisma";

const TOTAL_MSG_LIMIT = 100;
const USER_TURN_LIMIT = 3;
const WARN_THRESHOLD  = 97; // hiện warning khi còn <= 3 tin

// Dùng chung giữa GET/POST /api/chats/[id]/messages và SSE /api/chats/[id]/stream
export async function assertChatAccess(roomId: string, userId: string, role: string): Promise<string> {
  if (role === "ADMIN" || role === "STAFF") return "Admin";
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { label: true },
  });
  if (!participant) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
  return participant.label;
}

export function makeChatQuota(totalMsgCount: number, userTurnCount: number, senderLabel: string) {
  return {
    total: TOTAL_MSG_LIMIT,
    used: totalMsgCount,
    remaining: Math.max(0, TOTAL_MSG_LIMIT - totalMsgCount),
    warning: totalMsgCount >= WARN_THRESHOLD,
    locked: totalMsgCount >= TOTAL_MSG_LIMIT,
    userTurnLimit: USER_TURN_LIMIT,
    userTurnUsed: senderLabel === "Người mua" ? userTurnCount : undefined,
  };
}

export async function getChatSnapshot(roomId: string, after: Date | null, senderLabel: string) {
  const [messages, chatRoom] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { roomId, ...(after ? { createdAt: { gt: after } } : {}) },
      orderBy: { createdAt: "asc" },
      take: after ? 100 : 50,
      select: { id: true, senderId: true, senderName: true, senderLabel: true, content: true, createdAt: true },
    }),
    prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        totalMsgCount: true,
        userTurnCount: true,
        sellerConfirmed: true,
        sellerConfirmedAt: true,
        userDone: true,
        complaint: { select: { status: true } },
      },
    }),
  ]);

  if (!chatRoom) return null;

  // $queryRaw bypass Prisma client validation — đọc đúng kể cả khi client cũ chưa biết field
  const r2rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
    SELECT round_two_opened FROM chat_rooms WHERE id = ${roomId}::uuid
  `;
  const roundTwoOpened = r2rows[0]?.round_two_opened ?? false;

  const status = chatRoom.complaint?.status;
  const chatEnded = status === "RESOLVED" || status === "REJECTED";

  return {
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    chatEnded,
    complaintStatus: status,
    quota: makeChatQuota(chatRoom.totalMsgCount, chatRoom.userTurnCount, senderLabel),
    resolution: {
      sellerConfirmed:  chatRoom.sellerConfirmed,
      sellerConfirmedAt: chatRoom.sellerConfirmedAt?.toISOString() ?? null,
      userDone:         chatRoom.userDone,
      roundTwoOpened,
    },
  };
}
