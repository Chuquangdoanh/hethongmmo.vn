"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Store, Send, Loader2 } from "lucide-react";
import { useNotificationSound } from "@/lib/hooks/useNotificationSound";

export type PartnerChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string; // USER | PROVIDER
  content: string;
  createdAt: string;
};

type ThreadStatus = "OPEN" | "RESOLVED" | "REFUNDED";

interface Props {
  threadId: string;
  currentUserId: string;
  /** true → admin đóng vai gian hàng (có nút hoàn tiền / đóng). */
  isAdmin?: boolean;
  /** false → ẩn nút hoàn tiền (vd chat tư vấn trước mua, không gắn đơn). */
  canRefund?: boolean;
  providerName: string;
  subject: string;
  initialMessages: PartnerChatMessage[];
  initialStatus: ThreadStatus;
  notificationSoundUrl?: string | null;
  /** true → panel lấp đầy chiều cao container (dùng ở /ho-tro để không dư khoảng trắng dưới chân).
   *  false/undefined → dùng chiều cao clamp cố định (dùng ở grid admin). */
  fill?: boolean;
}

const POLL_INTERVAL_MS = 4000;

export default function PartnerChatPanel({
  threadId,
  currentUserId,
  isAdmin = false,
  canRefund = true,
  providerName,
  subject,
  initialMessages,
  initialStatus,
  notificationSoundUrl,
  fill = false,
}: Props) {
  const [messages, setMessages] = useState<PartnerChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<ThreadStatus>(initialStatus);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const playNotificationSound = useNotificationSound(notificationSoundUrl);

  const closed = status !== "OPEN";

  // Chỉ cuộn BÊN TRONG khung tin nhắn xuống cuối — không dùng scrollIntoView
  // (scrollIntoView sẽ cuộn cả trang xuống đáy khi mở /ho-tro?id=ps-...).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Polling các tin mới + trạng thái
  const poll = useCallback(async () => {
    const cursor = messages[messages.length - 1]?.createdAt ?? new Date(0).toISOString();
    try {
      const res = await fetch(`/api/partner-support/${threadId}/messages?after=${encodeURIComponent(cursor)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json() as { data?: { status: ThreadStatus; messages: PartnerChatMessage[] } };
      if (!json.data) return;
      setStatus(json.data.status);
      if (json.data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = json.data!.messages.filter((m) => !ids.has(m.id));
          if (fresh.length === 0) return prev;
          // Phát âm thanh khi có tin mới từ bên kia (không phải mình gửi)
          if (fresh.some((m) => m.senderId !== currentUserId)) playNotificationSound();
          return [...prev, ...fresh];
        });
      }
    } catch { /* im lặng — sẽ thử lại lần poll sau */ }
  }, [messages, threadId, currentUserId, playNotificationSound]);

  useEffect(() => {
    if (closed) return;
    const t = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [poll, closed]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/partner-support/${threadId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = await res.json() as { data?: PartnerChatMessage; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Gửi tin thất bại"); return; }
      setMessages((prev) => prev.some((m) => m.id === json.data!.id) ? prev : [...prev, json.data!]);
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  async function handleRefund() {
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partner-support/${threadId}/refund`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Hoàn tiền thất bại"); return; }
      setStatus("REFUNDED");
      setConfirmRefund(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  async function handleResolve() {
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partner-support/${threadId}/resolve`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Đóng thất bại"); return; }
      setStatus("RESOLVED");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col min-h-0"
      style={fill ? { height: "100%" } : { height: "clamp(520px, calc(100vh - 300px), 860px)" }}
    >
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0d9488]/10 flex items-center justify-center shrink-0">
            <Store size={16} strokeWidth={1.75} className="text-[#0d9488]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{providerName}</p>
            <p className="text-[11px] text-gray-500 truncate">{subject}</p>
          </div>
        </div>
        {status === "REFUNDED" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
            Đã hoàn tiền
          </span>
        )}
        {status === "RESOLVED" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
            Đã đóng
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-center text-gray-400 py-16">Chưa có tin nhắn.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const isProvider = msg.senderRole === "PROVIDER";
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[10px] text-gray-500 mb-0.5 font-medium">
                  {msg.senderName} · {isProvider ? "Gian hàng" : "Người mua"}
                </span>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                  isMe ? "bg-[#0d9488] text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Closed banner */}
      {closed && (
        <div className={`px-5 py-3 border-t shrink-0 flex items-center gap-2.5 ${
          status === "REFUNDED" ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
        }`}>
          <span className="text-lg">{status === "REFUNDED" ? "💰" : "✅"}</span>
          <p className={`text-sm font-semibold ${status === "REFUNDED" ? "text-blue-700" : "text-gray-600"}`}>
            {status === "REFUNDED" ? "Đã hoàn tiền cho người mua." : "Cuộc trò chuyện đã đóng."}
          </p>
        </div>
      )}

      {/* Input + admin actions */}
      {!closed && (
        <div className="px-5 py-4 border-t border-gray-200 shrink-0 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {confirmRefund ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-blue-800">💰 Hoàn tiền cho người mua?</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Hệ thống sẽ hoàn tiền vào ví người mua. Đơn hàng vẫn giữ trạng thái hoàn tất — doanh thu &amp; lợi nhuận không bị trừ. Thao tác không thể hoàn tác.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmRefund(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleRefund()}
                  disabled={acting}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {acting ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder="Nhập tin nhắn... (Enter để gửi)"
                rows={2}
                maxLength={2000}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
              />
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !input.trim()}
                  className="px-5 py-2 rounded-xl bg-[#0d9488] text-white text-sm font-bold hover:bg-[#0f766e] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Gửi
                </button>
                {isAdmin && (
                  <>
                    {canRefund && (
                      <button
                        onClick={() => setConfirmRefund(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        💰 Hoàn tiền
                      </button>
                    )}
                    <button
                      onClick={() => void handleResolve()}
                      disabled={acting}
                      className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-100 disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      Đóng
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
