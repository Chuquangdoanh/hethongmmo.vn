"use client";

import { useState, useEffect, useRef } from "react";

type Participant = { userId: string; label: string; userName: string };
type ChatMsg = {
  id: string;
  senderId: string;
  senderName: string;
  senderLabel: string;
  content: string;
  createdAt: string;
};
export type ChatRoomData = {
  id: string;
  participants: Participant[];
  messages: ChatMsg[];
};

interface Props {
  complaintId: string;
  chatRoom: ChatRoomData | null;
  currentUserId: string;
  currentUserName: string;
  complaintStatus: string;
  orderId: string | null;
}

export default function ComplaintChatPanel({
  complaintId,
  chatRoom: initialRoom,
  currentUserId,
  complaintStatus: initialStatus,
  orderId,
}: Props) {
  const [room, setRoom] = useState<ChatRoomData | null>(initialRoom);
  const [messages, setMessages] = useState<ChatMsg[]>(initialRoom?.messages ?? []);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const [confirmConfirm, setConfirmConfirm] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [resolvedOutcome, setResolvedOutcome] = useState<"seller_wins" | "frozen" | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isResolved = status === "RESOLVED" || status === "REJECTED";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll new messages every 3s while chat is open
  useEffect(() => {
    if (!room || isResolved) return;
    const id = setInterval(async () => {
      const last = messages[messages.length - 1];
      const cursor = last?.createdAt ?? new Date(0).toISOString();
      try {
        const res = await fetch(
          `/api/chats/${room.id}/messages?after=${encodeURIComponent(cursor)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { success: boolean; data: { messages: ChatMsg[]; chatEnded: boolean } };
        if (json.data?.messages?.length) setMessages((prev) => [...prev, ...json.data.messages]);
      } catch {
        /* ignore polling errors */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [room, messages, isResolved]);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/confirm-chat`, { credentials: "include",
        method: "POST",
      });
      const json = (await res.json()) as { success: boolean; data?: ChatRoomData; error?: string };
      if (!res.ok) { setError(json.error ?? "Lỗi tạo phòng chat"); return; }
      setRoom(json.data!);
      setMessages(json.data!.messages);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || !room) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/chats/${room.id}/messages`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = (await res.json()) as { success: boolean; data?: ChatMsg; error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi tin thất bại"); return; }
      setMessages((prev) => [...prev, json.data!]);
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  async function handleFreeze() {
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/resolve`, { credentials: "include", method: "POST" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Thao tác thất bại"); return; }
      setStatus("REJECTED");
      setResolvedOutcome("frozen");
      setConfirmFreeze(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResolving(false);
    }
  }

  async function handleConfirmOrder() {
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/confirm-order`, { credentials: "include", method: "POST" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Thao tác thất bại"); return; }
      setStatus("RESOLVED");
      setResolvedOutcome("seller_wins");
      setConfirmConfirm(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResolving(false);
    }
  }

  // — No room yet —
  if (!room) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 sticky top-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto">
            <span className="text-2xl">💬</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Khởi tạo trò chuyện</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Tạo nhóm chat 3 bên giữa Admin, Người mua và Nhà bán hàng để xử lý khiếu nại này.
            </p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!isResolved && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
            >
              {creating ? "Đang tạo..." : "Xác nhận trò chuyện"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // — Room exists —
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden sticky top-6 flex flex-col"
      style={{ maxHeight: "80vh" }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900">💬 Trò chuyện xử lý khiếu nại</h3>
          {isResolved && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
              Đã kết thúc
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {room.participants.map((p) => `${p.userName} (${p.label})`).join(" · ")}
        </p>
      </div>

      {/* Resolved banner */}
      {isResolved && (
        <div className={`px-4 py-3 border-b shrink-0 flex items-center gap-2 ${
          resolvedOutcome === "frozen"
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <span className="text-sm">{resolvedOutcome === "frozen" ? "🔒" : "✅"}</span>
          <p className={`text-xs font-semibold ${resolvedOutcome === "frozen" ? "text-red-700" : "text-emerald-700"}`}>
            {resolvedOutcome === "frozen"
              ? "Đơn hàng đã bị đóng băng — nhà bán hàng không thể rút tiền"
              : resolvedOutcome === "seller_wins"
              ? "Đơn hàng được xác nhận — nhà bán hàng có thể rút tiền"
              : "Khiếu nại đã được giải quyết"}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ minHeight: "280px" }}>
        {messages.length === 0 && (
          <p className="text-xs text-center text-gray-400 py-10">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[10px] text-gray-500 mb-0.5 font-medium">
                  {msg.senderName} · {msg.senderLabel}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                  isMe
                    ? "bg-[#7C3AED] text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
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
        <div ref={bottomRef} />
      </div>

      {/* Input + action buttons */}
      {!isResolved && (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0 space-y-2">
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Freeze confirmation */}
          {confirmFreeze && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 space-y-2">
              <p className="text-xs font-semibold text-red-700">🔒 Xác nhận đóng băng đơn hàng?</p>
              <p className="text-[11px] text-red-600 leading-relaxed">
                Đơn hàng sẽ bị đóng băng, nhà bán hàng không thể rút tiền từ đơn hàng này và người mua sẽ được hỗ trợ cộng tiền. Thao tác không thể hoàn tác.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFreeze(false)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
                <button onClick={() => void handleFreeze()} disabled={resolving} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60 transition-colors">
                  {resolving ? "Đang xử lý..." : "Xác nhận đóng băng"}
                </button>
              </div>
            </div>
          )}

          {/* Confirm order confirmation */}
          {confirmConfirm && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700">✅ Xác nhận đơn hàng hợp lệ?</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Đơn hàng sẽ được xác nhận, nhà bán hàng có thể rút tiền từ đơn này và từ chối khiếu nại của người mua. Khiếu nại sẽ được đóng.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmConfirm(false)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
                <button onClick={() => void handleConfirmOrder()} disabled={resolving} className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {resolving ? "Đang xử lý..." : "Xác nhận đơn hàng"}
                </button>
              </div>
            </div>
          )}

          {/* Main input row */}
          {!confirmFreeze && !confirmConfirm && (
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder="Nhập tin nhắn... (Enter để gửi)"
                rows={2}
                maxLength={2000}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !input.trim()}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#A855F7] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {sending ? "..." : "Gửi"}
                </button>
                <button
                  onClick={() => setConfirmConfirm(true)}
                  className="px-2 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  ✅ Xác nhận ĐH
                </button>
                <button
                  onClick={() => setConfirmFreeze(true)}
                  className="px-2 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  🔒 Đóng băng
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
