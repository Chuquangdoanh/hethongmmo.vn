import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { checkRateLimit, apiRatelimit } from "@/lib/security/rate-limit";
import { assertChatAccess, getChatSnapshot } from "@/lib/services/chat-stream.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_MS = 30_000;

// SSE — đẩy tin nhắn mới + thay đổi trạng thái phòng chat khiếu nại theo thời gian thực.
// Poll DB nằm ở phía server (không phụ thuộc tab trình duyệt có bị ẩn/throttle hay không).
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

  const { id: roomId } = await params;

  const { success } = await checkRateLimit(apiRatelimit, me.id);
  if (!success) {
    return new Response(JSON.stringify({ error: "Quá nhiều kết nối. Vui lòng thử lại sau.", code: "RATE_LIMITED" }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  let senderLabel: string;
  try {
    senderLabel = await assertChatAccess(roomId, me.id, me.role);
  } catch {
    return new Response(JSON.stringify({ error: "Không có quyền truy cập", code: "FORBIDDEN" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const afterStr = url.searchParams.get("after");
  let cursor = afterStr ? new Date(afterStr) : null;
  let lastStatusKey = "";

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
          const snapshot = await getChatSnapshot(roomId, cursor, senderLabel);
          if (!snapshot) return;

          const statusKey = JSON.stringify({
            chatEnded: snapshot.chatEnded,
            complaintStatus: snapshot.complaintStatus,
            resolution: snapshot.resolution,
            quota: snapshot.quota,
          });
          const hasNewMessages = snapshot.messages.length > 0;
          const statusChanged = statusKey !== lastStatusKey;

          if (hasNewMessages || statusChanged) {
            enqueue(`event: chat\ndata: ${JSON.stringify(snapshot)}\n\n`);
            lastStatusKey = statusKey;
          }
          if (hasNewMessages) {
            const lastMsg = snapshot.messages[snapshot.messages.length - 1];
            if (lastMsg) cursor = new Date(lastMsg.createdAt);
          }
        } catch (err) {
          console.warn(`[chats/${roomId}/stream] poll failed:`, err);
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
