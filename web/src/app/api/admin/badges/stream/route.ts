import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { getAdminBadgeCounts } from "@/lib/services/admin-badges.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_MS = 30_000;

// SSE — đẩy số liệu badge sidebar admin (đơn hàng/khiếu nại/bán tài nguyên/đăng ký dịch vụ/
// rút tiền/nạp tiền) theo thời gian thực. Poll DB nằm ở phía server.
export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  try {
    requireStaff(session);
    await requirePermission(session, "content:read");
  } catch {
    return new Response(JSON.stringify({ error: "Không có quyền truy cập", code: "FORBIDDEN" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let lastSentKey = "";

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
          const counts = await getAdminBadgeCounts();
          const key = JSON.stringify(counts);
          if (key !== lastSentKey) {
            enqueue(`event: badges\ndata: ${key}\n\n`);
            lastSentKey = key;
          }
        } catch (err) {
          console.warn("[admin/badges/stream] poll failed:", err);
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
