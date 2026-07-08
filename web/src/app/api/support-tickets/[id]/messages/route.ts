import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { checkRateLimit, apiRatelimit } from "@/lib/security/rate-limit";
import { sendSupportMessageSchema } from "@/lib/validation/support-ticket.schema";
import { resolveSupportTicketRole, sendSupportMessage } from "@/lib/services/support-ticket.service";

export const runtime = "nodejs";

/* GET — lấy thông tin ticket + danh sách tin nhắn. Dùng chung cho buyer và seller. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: ticketId } = await params;

    await resolveSupportTicketRole(ticketId, me.id);

    const [messages, order] = await Promise.all([
      prisma.supportMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
      }),
      prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { order: { select: { orderCode: true, itemName: true } } },
      }),
    ]);

    return apiOk({
      orderCode: order?.order.orderCode ?? null,
      itemName: order?.order.itemName ?? null,
      messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    return apiCatch(err);
  }
}

/* POST — gửi tin nhắn. Không đụng order/balance — chỉ ghi SupportMessage. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: ticketId } = await params;

    const { success } = await checkRateLimit(apiRatelimit, me.id);
    if (!success) {
      return NextResponse.json({ error: "Bạn thao tác quá nhanh, vui lòng thử lại sau.", code: "RATE_LIMITED" }, { status: 429 });
    }

    const body: unknown = await req.json();
    const parsed = sendSupportMessageSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const senderName = me.fullName ?? me.email;
    const message = await sendSupportMessage(ticketId, me.id, senderName, parsed.data.content);

    return apiOk({ ...message, createdAt: message.createdAt.toISOString() }, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
