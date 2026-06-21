import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "chat:read");

    const rooms = await prisma.chatRoom.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        complaint: {
          select: {
            id: true, subject: true, status: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        participants: { select: { userId: true, label: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { senderName: true, content: true, createdAt: true },
        },
      },
    });

    return apiOk(
      rooms.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        complaint: {
          id: r.complaint.id,
          subject: r.complaint.subject,
          status: r.complaint.status,
          userName: r.complaint.user.fullName ?? r.complaint.user.email,
        },
        participantCount: r.participants.length,
        lastMessage: r.messages[0]
          ? {
              senderName: r.messages[0].senderName,
              content: r.messages[0].content,
              createdAt: r.messages[0].createdAt.toISOString(),
            }
          : null,
      })),
    );
  } catch (err) {
    return apiCatch(err);
  }
}
