import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { checkRateLimit, apiRatelimit } from "@/lib/security/rate-limit";
import { sendPreSaleMessageSchema } from "@/lib/validation/pre-sale-chat.schema";
import { resolvePreSaleChatRole, sendPreSaleMessage } from "@/lib/services/pre-sale-chat.service";

export const runtime = "nodejs";

/* GET — lấy thông tin chat + danh sách tin nhắn. Dùng chung cho buyer và seller. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: chatId } = await params;

    const { role } = await resolvePreSaleChatRole(chatId, me.id);

    const [messages, chat] = await Promise.all([
      prisma.preSaleMessage.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
      }),
      prisma.preSaleChat.findUnique({
        where: { id: chatId },
        select: {
          user:   { select: { fullName: true } },
          seller: { select: { fullName: true } },
        },
      }),
    ]);

    return apiOk({
      peerName: role === "USER" ? (chat?.seller.fullName ?? null) : (chat?.user.fullName ?? null),
      messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    return apiCatch(err);
  }
}

/* POST — gửi tin nhắn. Không giới hạn số lượng — chỉ ghi PreSaleMessage. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: chatId } = await params;

    const { success } = await checkRateLimit(apiRatelimit, me.id);
    if (!success) {
      return NextResponse.json({ error: "Bạn thao tác quá nhanh, vui lòng thử lại sau.", code: "RATE_LIMITED" }, { status: 429 });
    }

    const body: unknown = await req.json();
    const parsed = sendPreSaleMessageSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const senderName = me.fullName ?? me.email;
    const message = await sendPreSaleMessage(chatId, me.id, senderName, parsed.data.content);

    return apiOk({ ...message, createdAt: message.createdAt.toISOString() }, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
