"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  initialRoundTwoOpened?: boolean;
}

export default function ComplaintChatPanel({
  complaintId,
  chatRoom: initialRoom,
  currentUserId,
  complaintStatus: initialStatus,
  initialRoundTwoOpened = false,
}: Props) {
  const [room, setRoom] = useState<ChatRoomData | null>(initialRoom);
  const [messages, setMessages] = useState<ChatMsg[]>(initialRoom?.messages ?? []);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [openingRound2, setOpeningRound2] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmConfirm, setConfirmConfirm] = useState(false);
  const [confirmRound2, setConfirmRound2] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [roundTwoOpened, setRoundTwoOpened] = useState(initialRoundTwoOpened);
  const [resolvedOutcome, setResolvedOutcome] = useState<"user_wins" | "seller_wins" | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Trạng thái PENDING_ADMIN: chờ admin mở vòng 2 (chat đóng với user/seller)
  const waitingAdmin = status === "PENDING_ADMIN" && !roundTwoOpened;

  const isResolved = status === "RESOLVED" || status === "REJECTED";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const poll = useCallback(async () => {
    if (!room || isResolved) return;
    const last = messages[messages.length - 1];
    const cursor = last?.createdAt ?? new Date(0).toISOString();
    try {
      const res = await fetch(
        `/api/chats/${room.id}/messages?after=${encodeURIComponent(cursor)}`,
        { credentials: "include", cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        success: boolean;
        data: { messages: ChatMsg[]; chatEnded: boolean; complaintStatus: string; resolution?: { roundTwoOpened: boolean } };
      };
      if (json.data?.messages?.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = json.data.messages.filter((m: ChatMsg) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
      if (json.data?.complaintStatus) setStatus(json.data.complaintStatus);
      if (json.data?.resolution?.roundTwoOpened) setRoundTwoOpened(true);
      if (json.data?.chatEnded) {
        if (json.data.complaintStatus === "RESOLVED") setResolvedOutcome("seller_wins");
        if (json.data.complaintStatus === "REJECTED") setResolvedOutcome("user_wins");
      }
    } catch { /* ignore polling errors */ }
  }, [room, messages, isResolved]);

  useEffect(() => {
    if (!room || isResolved) return;
    const intervalId = setInterval(() => { void poll(); }, 3000);
    return () => clearInterval(intervalId);
  }, [poll, room, isResolved]);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/confirm-chat`, {
        credentials: "include",
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
      const res = await fetch(`/api/chats/${room.id}/messages`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = (await res.json()) as { success: boolean; data?: ChatMsg; error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi tin thất bại"); return; }
      setMessages((prev) => prev.some((m) => m.id === json.data!.id) ? prev : [...prev, json.data!]);
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  // Admin: user wins → refund buyer
  async function handleRefundUser() {
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/resolve`, {
        credentials: "include",
        method: "POST",
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Thao tác thất bại"); return; }
      setStatus("REJECTED");
      setResolvedOutcome("user_wins");
      setConfirmRefund(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResolving(false);
    }
  }

  // Admin: seller wins → confirm order, release payment
  async function handleConfirmOrder() {
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/confirm-order`, {
        credentials: "include",
        method: "POST",
      });
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

  // Admin mở vòng 2: reset chat, cho phép user/seller đàm phán lại
  async function handleOpenRound2() {
    setOpeningRound2(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/open-round2`, {
        credentials: "include",
        method: "POST",
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Không mở được vòng 2"); return; }
      setRoundTwoOpened(true);
      setConfirmRound2(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setOpeningRound2(false);
    }
  }

  // — No room yet —
  if (!room) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto">
            <span className="text-3xl">💬</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Khởi tạo trò chuyện 3 bên</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Tạo nhóm chat giữa <strong>Admin</strong>, <strong>Người mua</strong> và <strong>Nhà bán hàng</strong> để xử lý khiếu nại này.
            </p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!isResolved && (
            <button
              onClick={() => void handleCreate()}
              disabled={creating}
              className="px-8 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
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
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ height: "clamp(560px, calc(100vh - 280px), 900px)" }}>
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h3 className="text-sm font-bold text-gray-900">Trò chuyện xử lý khiếu nại</h3>
          </div>
          <div className="flex items-center gap-3">
            {isResolved && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                Đã kết thúc
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {room.participants.map((p) => `${p.userName} (${p.label})`).join(" · ")}
            </span>
          </div>
        </div>
      </div>

      {/* Resolved banner */}
      {isResolved && (
        <div className={`px-5 py-3 border-b shrink-0 flex items-center gap-2.5 ${
          resolvedOutcome === "user_wins"
            ? "bg-blue-50 border-blue-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <span className="text-lg">{resolvedOutcome === "user_wins" ? "💰" : "✅"}</span>
          <p className={`text-sm font-semibold ${resolvedOutcome === "user_wins" ? "text-blue-700" : "text-emerald-700"}`}>
            {resolvedOutcome === "user_wins"
              ? "Người mua thắng — Đã hoàn tiền cho người mua"
              : resolvedOutcome === "seller_wins"
              ? "Nhà bán hàng thắng — Đã xác nhận đơn và mở thanh toán"
              : "Khiếu nại đã được giải quyết"}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-center text-gray-400 py-16">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</p>
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
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
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

      {/* Waiting-for-admin banner (chat đóng với user/seller) */}
      {waitingAdmin && !isResolved && (
        <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 shrink-0">
          <p className="text-sm font-semibold text-amber-800">
            ⏳ Người mua đã gửi khiếu nại vòng 1. Chat đã đóng với user &amp; seller.
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Mở vòng 2 để tiếp tục đàm phán, hoặc phán quyết ngay bên dưới.
          </p>
        </div>
      )}

      {/* Input + action buttons */}
      {!isResolved && (
        <div className="px-5 py-4 border-t border-gray-200 shrink-0 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Confirm mở vòng 2 */}
          {confirmRound2 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-amber-800">🔄 Xác nhận mở vòng 2?</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Chat sẽ reset: quota mới (100 tin), seller và user cần xác nhận lại. Chỉ mở được 1 lần.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmRound2(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleOpenRound2()}
                  disabled={openingRound2}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-60 transition-colors"
                >
                  {openingRound2 ? "Đang mở..." : "Xác nhận mở vòng 2"}
                </button>
              </div>
            </div>
          )}

          {/* Confirm refund */}
          {confirmRefund && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-blue-800">💰 Xác nhận hoàn tiền cho người mua?</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Người mua sẽ được hoàn tiền. Nếu nhà bán hàng đã rút, tiền sẽ bị trừ từ số dư của họ. Thao tác không thể hoàn tác.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmRefund(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleRefundUser()}
                  disabled={resolving}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {resolving ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                </button>
              </div>
            </div>
          )}

          {/* Confirm seller wins */}
          {confirmConfirm && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-emerald-800">✅ Xác nhận đơn hàng hợp lệ (Nhà bán hàng thắng)?</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Đơn hàng sẽ được xác nhận, nhà bán hàng có thể rút tiền và khiếu nại sẽ đóng. Thao tác không thể hoàn tác.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleConfirmOrder()}
                  disabled={resolving}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {resolving ? "Đang xử lý..." : "Xác nhận đơn hàng"}
                </button>
              </div>
            </div>
          )}

          {/* Main input row */}
          {!confirmRefund && !confirmConfirm && !confirmRound2 && (
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder="Nhập tin nhắn với user và seller... (Enter để gửi)"
                rows={2}
                maxLength={2000}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !input.trim()}
                  className="px-5 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#A855F7] disabled:opacity-50 transition-colors"
                >
                  {sending ? "..." : "Gửi"}
                </button>
                {waitingAdmin && (
                  <button
                    onClick={() => setConfirmRound2(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap"
                  >
                    🔄 Mở vòng 2
                  </button>
                )}
                <button
                  onClick={() => setConfirmConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  ✅ Seller thắng
                </button>
                <button
                  onClick={() => setConfirmRefund(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  💰 Hoàn tiền user
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
