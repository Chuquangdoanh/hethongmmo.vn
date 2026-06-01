import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

async function assertAccess(roomId: string, userId: string, role: string): Promise<string> {
  if (role === "ADMIN" || role === "STAFF") return "Admin";
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { label: true },
  });
  if (!participant) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
  return participant.label;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id: roomId } = await params;

    await assertAccess(roomId, me.id, me.role);

    const afterStr = req.nextUrl.searchParams.get("after");
    const after = afterStr ? new Date(afterStr) : null;

    const [messages, chatRoom] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId, ...(after ? { createdAt: { gt: after } } : {}) },
        orderBy: { createdAt: "asc" },
        take: after ? 100 : 50,
        select: { id: true, senderId: true, senderName: true, senderLabel: true, content: true, createdAt: true },
      }),
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { complaint: { select: { status: true } } },
      }),
    ]);

    const chatEnded =
      chatRoom?.complaint?.status === "RESOLVED" ||
      chatRoom?.complaint?.status === "REJECTED";

    return apiOk({
      messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      chatEnded,
    });
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

    const senderLabel = await assertAccess(roomId, me.id, me.role);

    const body: unknown = await req.json();
    const parsed = z.object({ content: z.string().min(1).max(2000).trim() }).safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const senderName = senderLabel === "Nhà bán hàng"
      ? `Seller #${me.id.slice(0, 8).toUpperCase()}`
      : me.fullName;

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: me.id,
        senderName,
        senderLabel,
        content: parsed.data.content,
      },
      select: { id: true, senderId: true, senderName: true, senderLabel: true, content: true, createdAt: true },
    });

    return apiOk({ ...message, createdAt: message.createdAt.toISOString() }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && (err as { statusCode?: number }).statusCode === 403) {
      return NextResponse.json({ error: "Không có quyền truy cập", code: "FORBIDDEN" }, { status: 403 });
    }
    return apiCatch(err);
  }
}
