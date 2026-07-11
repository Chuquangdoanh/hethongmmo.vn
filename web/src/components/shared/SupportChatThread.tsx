"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Send } from "lucide-react";
import { useNotificationSound } from "@/lib/hooks/useNotificationSound";

export interface SupportChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "USER" | "SELLER";
  content: string;
  createdAt: string;
}

interface Props {
  ticketId: string;
  myRole: "USER" | "SELLER";
  notificationSoundUrl?: string | null;
}

async function fetchMessages(ticketId: string): Promise<SupportChatMessage[]> {
  const res = await fetch(`/api/support-tickets/${ticketId}/messages`, { credentials: "include", cache: "no-store" });
  const json = await res.json() as { data?: { messages?: SupportChatMessage[] } };
  return json.data?.messages ?? [];
}

export default function SupportChatThread({ ticketId, myRole, notificationSoundUrl }: Props) {
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);
  const playNotificationSound = useNotificationSound(notificationSoundUrl);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    fetchMessages(ticketId).then((msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setLoading(false);

      // Real-time tin nhắn mới qua SSE — poll nằm ở server (không phụ thuộc tab
      // trình duyệt bị ẩn/throttle như setInterval phía client trước đây).
      const cursor = msgs[msgs.length - 1]?.createdAt ?? new Date(0).toISOString();
      es = new EventSource(`/api/support-tickets/${ticketId}/stream?after=${encodeURIComponent(cursor)}`, { withCredentials: true });
      es.addEventListener("message", (evt) => {
        try {
          const d = JSON.parse((evt as MessageEvent<string>).data) as { messages: SupportChatMessage[] };
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = d.messages.filter((m) => !existingIds.has(m.id));
            if (fresh.some((m) => m.senderRole !== myRole)) playNotificationSound();
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        } catch { /* ignore malformed event */ }
      });
    });

    return () => { cancelled = true; es?.close(); };
  }, [ticketId, myRole, playNotificationSound]);

  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json() as { data?: SupportChatMessage; error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi tin nhắn thất bại."); return; }
      if (json.data) {
        const msg = json.data;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  const otherPartyLabel = myRole === "USER" ? "người bán" : "người mua";

  return (
    <div className="flex flex-col h-full">
      <div ref={msgsRef} className="flex-1 overflow-y-auto space-y-2.5 px-1 py-2 min-h-40">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 w-2/3 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-10 w-1/2 rounded-xl bg-gray-100 animate-pulse ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Chưa có tin nhắn nào — hãy bắt đầu trao đổi với {otherPartyLabel}.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === myRole;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                  {!isMine && <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.senderName}</p>}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-xs text-red-500 px-1 mb-1">{error}</p>}

      <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Nhập tin nhắn..."
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
