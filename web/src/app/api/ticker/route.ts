import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, tickerRatelimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
// SSE must never be statically cached by Next.js
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  // 1. Rate limit: 20 new SSE connections per IP per minute
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const rl = await checkRateLimit(tickerRatelimit, `ticker:${ip}`);
  if (!rl.success) {
    return new Response(
      JSON.stringify({ success: false, error: "Quá nhiều kết nối. Vui lòng thử lại sau.", code: "RATE_LIMITED" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();

  // 2. ReadableStream — keeps the connection open and pushes events
  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller closed — ignore
        }
      };

      // 3. Query DB and push one SSE ticker event
      const sendData = async () => {
        try {
          const texts = await prisma.tickerText.findMany({
            where:   { isActive: true },
            select:  { id: true, text: true, displayOrder: true },
            orderBy: { displayOrder: "asc" },
            take:    20,
          });

          const payload = { texts, ts: Date.now() };
          enqueue(`event: ticker\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
          console.warn("[ticker] DB query failed:", err);
        }
      };

      // Initial push on connect (no wait)
      void sendData();

      // 4. Push fresh data every 15 seconds
      const dataInterval = setInterval(() => void sendData(), 15_000);

      // 5. Heartbeat comment every 30 s — keeps Nginx / proxies from closing idle connections
      const heartbeatInterval = setInterval(() => enqueue(":ping\n\n"), 30_000);

      // 6. Cleanup when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  // 7. SSE response headers
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
