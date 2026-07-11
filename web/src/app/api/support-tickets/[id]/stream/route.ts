import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, apiRatelimit } from "@/lib/security/rate-limit";
import { resolveSupportTicketRole } from "@/lib/services/support-ticket.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_MS = 30_000;

// SSE — đẩy tin nhắn mới của Chat hỗ trợ theo thời gian thực (server-side poll, không
// phụ thuộc tab trình duyệt bị ẩn/throttle).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await auth();
  let me: ReturnType<typeof requireUser>;
  try {
    me = requireUser(session);
  } catch {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập", code: "UNAUTHORIZED" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { id: ticketId } = await params;

  const { success } = await checkRateLimit(apiRatelimit, me.id);
  if (!success) {
    return new Response(JSON.stringify({ error: "Quá nhiều kết nối. Vui lòng thử lại sau.", code: "RATE_LIMITED" }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await resolveSupportTicketRole(ticketId, me.id);
  } catch {
    return new Response(JSON.stringify({ error: "Không tìm thấy ticket hỗ trợ", code: "NOT_FOUND" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const afterStr = url.searchParams.get("after");
  let cursor = afterStr ? new Date(afterStr) : new Date(0);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller closed — ignore
        }
      };

      const tick = async () => {
        try {
          const messages = await prisma.supportMessage.findMany({
            where: { ticketId, createdAt: { gt: cursor } },
            orderBy: { createdAt: "asc" },
            take: 100,
            select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
          });
          if (messages.length === 0) return;

          const payload = messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
          enqueue(`event: message\ndata: ${JSON.stringify({ messages: payload })}\n\n`);
          const lastMsg = messages[messages.length - 1];
          if (lastMsg) cursor = lastMsg.createdAt;
        } catch (err) {
          console.warn(`[support-tickets/${ticketId}/stream] poll failed:`, err);
        }
      };

      void tick();
      const dataInterval = setInterval(() => void tick(), POLL_INTERVAL_MS);
      const heartbeatInterval = setInterval(() => enqueue(":ping\n\n"), HEARTBEAT_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-store, must-revalidate",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
