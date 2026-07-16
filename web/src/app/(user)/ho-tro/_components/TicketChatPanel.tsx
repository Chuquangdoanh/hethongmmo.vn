"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { ChatMsg, ChatRoomInfo } from "@/components/shared/ChatWidget";
import { useNotificationSound } from "@/lib/hooks/useNotificationSound";

interface Quota {
  total: number;
  used: number;
  remaining: number;
  warning: boolean;
  locked: boolean;
  userTurnLimit: number;
  userTurnUsed?: number;
}

interface Resolution {
  sellerConfirmed:  boolean;
  sellerConfirmedAt: string | null;
  userDone:         boolean | null;
  roundTwoOpened:   boolean;
}

interface Props {
  room: ChatRoomInfo;
  currentUserId: string;
  currentUserLabel: string;         // "Người mua" | "Nhà bán hàng" | "Admin"
  initialChatEnded?: boolean;
  initialComplaintStatus?: string;
  initialQuota?: Quota;
  initialResolution?: Resolution;
  notificationSoundUrl?: string | null;
}

const LABEL_BG: Record<string, string> = {
  Admin: "#7c3aed",
  "Nhà bán hàng": "#f59e0b",
  "Người mua": "#2563eb",
};

const USER_CONFIRM_MS = 60 * 60 * 1000; // 60 phút

export default function TicketChatPanel({
  room,
  currentUserId,
  currentUserLabel,
  initialChatEnded = false,
  initialComplaintStatus,
  initialQuota,
  initialResolution,
  notificationSoundUrl,
}: Props) {
  const [messages, setMessages]       = useState<ChatMsg[]>(room.messages);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [error, setError]             = useState("");
  const [chatEnded, setChatEnded]     = useState(initialChatEnded);
  const [status, setStatus]           = useState(initialComplaintStatus ?? "IN_REVIEW");
  const [quota, setQuota]             = useState<Quota>(initialQuota ?? {
    total: 20, used: 0, remaining: 20, warning: false, locked: false,
    userTurnLimit: 3, userTurnUsed: 0,
  });
  const [resolution, setResolution]   = useState<Resolution>(initialResolution ?? {
    sellerConfirmed: false, sellerConfirmedAt: null, userDone: null, roundTwoOpened: false,
  });
  const [resolving, setResolving]     = useState(false);
  const [countdown, setCountdown]     = useState<number | null>(null);
  const [confirmSellerRefund, setConfirmSellerRefund] = useState(false);
  const [sellerRefunding, setSellerRefunding]         = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const playNotificationSound = useNotificationSound(notificationSoundUrl);

  // useLayoutEffect: scroll chat xuống bottom trước paint để tránh flash nội dung cũ
  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Countdown timer sau khi seller confirm (60')
  useEffect(() => {
    if (!resolution.sellerConfirmed || !resolution.sellerConfirmedAt || resolution.userDone !== null) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - new Date(resolution.sellerConfirmedAt!).getTime();
      const left = Math.max(0, USER_CONFIRM_MS - elapsed);
      setCountdown(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resolution.sellerConfirmed, resolution.sellerConfirmedAt, resolution.userDone]);

  // Real-time messages + resolution state qua SSE — poll nằm ở server (không phụ thuộc
  // tab trình duyệt bị ẩn/throttle như setInterval phía client trước đây).
  useEffect(() => {
    if (chatEnded) return;
    const cursor = messages[messages.length - 1]?.createdAt ?? new Date(0).toISOString();
    const es = new EventSource(`/api/chats/${room.id}/stream?after=${encodeURIComponent(cursor)}`, { withCredentials: true });

    es.addEventListener("chat", (evt) => {
      try {
        const d = JSON.parse((evt as MessageEvent<string>).data) as {
          messages: ChatMsg[];
          chatEnded: boolean;
          complaintStatus: string;
          quota: Quota;
          resolution: Resolution;
        };
        if (d.messages?.length) {
          // Dedup để tránh trùng key khi event trùng với tin vừa gửi
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const fresh = d.messages.filter((m: ChatMsg) => !existingIds.has(m.id));
            if (fresh.some(m => m.senderId !== currentUserId)) playNotificationSound();
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        if (d.chatEnded)       setChatEnded(true);
        if (d.complaintStatus) setStatus(d.complaintStatus);
        if (d.quota)           setQuota(d.quota);
        if (d.resolution)      setResolution(d.resolution);
      } catch { /* ignore malformed event */ }
    });

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cursor chỉ dùng khi mở kết nối, không reconnect theo messages
  }, [chatEnded, room.id, currentUserId, playNotificationSound]);

  // ── Gửi tin nhắn ──
  async function handleSend() {
    if (!input.trim() || chatEnded || sending || quota.locked) return;
    setSending(true);
    setError("");
    try {
      const res  = await fetch(`/api/chats/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = (await res.json()) as { data?: { quota?: Quota } & ChatMsg; error?: string; code?: string };
      if (!res.ok) {
        setError(
          json.code === "TURN_LIMIT_REACHED"
            ? "Bạn đã gửi 3 tin nhắn. Chờ nhà bán hàng phản hồi."
            : json.code === "QUOTA_EXCEEDED"
              ? "Đã hết lượt nhắn tin. Vui lòng xác nhận kết quả."
              : (json.error ?? "Gửi thất bại"),
        );
        if (json.data?.quota) setQuota(json.data.quota);
        return;
      }
      if (json.data) {
        const { quota: newQuota, ...msg } = json.data;
        const newMsg = msg as ChatMsg;
        // Dedup: poll kế tiếp có thể fetch lại message này nếu cursor chưa kịp cập nhật
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newQuota) setQuota(newQuota);
      }
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  // ── Seller/User xác nhận ──
  async function handleResolve(role: "seller" | "user", done?: boolean) {
    setResolving(true);
    setError("");
    try {
      const body = role === "seller" ? { role } : { role, done };
      const res  = await fetch(`/api/chats/${room.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: { outcome: string }; error?: string };
      if (!res.ok) { setError(json.error ?? "Thao tác thất bại"); return; }

      const outcome = json.data?.outcome;
      if (outcome === "RESOLVED")      { setChatEnded(true); setStatus("RESOLVED"); }
      if (outcome === "REJECTED")      { setChatEnded(true); setStatus("REJECTED"); }
      if (outcome === "PENDING_ADMIN_WAIT") {
        // Vòng 1 tranh chấp → chat đóng, chờ admin mở vòng 2
        setStatus("PENDING_ADMIN");
        setResolution(prev => ({ ...prev, userDone: false }));
      }
      if (outcome === "FINAL_DISPUTE") {
        // Vòng 2 tranh chấp cuối → đánh dấu userDone=false, không reset, admin phán quyết
        setResolution(prev => ({ ...prev, userDone: false }));
      }
      if (outcome === "WAITING_USER") {
        setResolution(prev => ({ ...prev, sellerConfirmed: true, sellerConfirmedAt: new Date().toISOString() }));
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResolving(false);
    }
  }

  // ── Seller: hoàn tiền ngay cho người mua, không cần chờ hệ thống ──
  async function handleSellerRefund() {
    setSellerRefunding(true);
    setError("");
    try {
      const res  = await fetch(`/api/chats/${room.id}/seller-refund`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { data?: { refundedAmount: number }; error?: string };
      if (!res.ok) { setError(json.error ?? "Hoàn tiền thất bại"); return; }
      setChatEnded(true);
      setStatus("REJECTED");
      setConfirmSellerRefund(false);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSellerRefunding(false);
    }
  }

  const isBuyer  = currentUserLabel === "Người mua";
  const isSeller = currentUserLabel === "Nhà bán hàng";

  // Seller chỉ được xác nhận sau khi đã trả lời ≥1 tin (API bắt buộc firstSellerMsgAt).
  // Suy ra từ messages để khóa nút, tránh seller bấm hụt gây "user không thấy panel".
  const sellerHasReplied = messages.some((m) => m.senderLabel === "Nhà bán hàng");

  // Trạng thái PENDING_ADMIN được chia làm 3 giai đoạn:
  // waitingAdmin   : vòng 1 tranh chấp, chat đóng, chờ admin mở vòng 2 (roundTwoOpened=false)
  // roundTwoActive : admin đã mở vòng 2 (roundTwoOpened=true, userDone=null) — chat mở
  // finalDispute   : vòng 2 tranh chấp (roundTwoOpened=true, userDone=false) — chat đóng, admin phán quyết
  const waitingAdmin   = status === "PENDING_ADMIN" && !resolution.roundTwoOpened;
  const roundTwoActive = status === "PENDING_ADMIN" && resolution.roundTwoOpened && resolution.userDone === null;
  const finalDispute   = status === "PENDING_ADMIN" && resolution.roundTwoOpened && resolution.userDone === false;

  const chatActive    = status === "IN_REVIEW" || roundTwoActive; // finalDispute = chat đóng
  const turnBlocked   = isBuyer && (quota.userTurnUsed ?? 0) >= quota.userTurnLimit;
  const inputDisabled = chatEnded || quota.locked || turnBlocked || sending;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* Quota warning bar */}
      {quota.warning && !quota.locked && (
        <div style={{
          padding: "6px 12px", background: "#fffbeb", borderBottom: "1px solid #fef08a",
          fontSize: "11px", color: "#854d0e", display: "flex", alignItems: "center", gap: "6px",
          flexShrink: 0,
        }}>
          <Clock size={12} />
          Còn <strong>{quota.remaining}</strong> tin nhắn — Hãy nói điều quan trọng nhất!
        </div>
      )}

      {/* Messages */}
      <div ref={msgsRef} className="ht-chat-msgs" style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>Chưa có tin nhắn nào.</p>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Nhà bán hàng sẽ phản hồi trong vòng 12 giờ.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isMe     = msg.senderId === currentUserId;
          const isSystem = msg.senderLabel === "System" || msg.senderLabel === "Hệ thống";
          const labelBg  = LABEL_BG[msg.senderLabel] ?? "#64748b";

          if (isSystem) {
            return (
              <div key={msg.id} style={{ textAlign: "center", padding: "8px 0" }}>
                <span style={{
                  fontSize: "11px", color: "#64748b",
                  background: "#f1f5f9", padding: "4px 12px",
                  borderRadius: "20px", border: "1px solid #e2e8f0",
                }}>
                  🔔 {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} style={{
              display: "flex", flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
              marginBottom: "12px",
            }}>
              {!isMe && (
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                  <div style={{
                    width: "26px", height: "26px", borderRadius: "50%", background: labelBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "800", color: "#fff", flexShrink: 0,
                  }}>
                    {msg.senderName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>{msg.senderName}</span>
                    {" "}
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>({msg.senderLabel})</span>
                  </div>
                </div>
              )}

              <div style={{
                maxWidth: "78%", padding: "9px 14px",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "#2563eb" : "#fff",
                color: isMe ? "#fff" : "#1e293b",
                fontSize: "13px", lineHeight: "1.55",
                border: isMe ? "none" : "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", wordBreak: "break-word",
              }}>
                {msg.content}
              </div>

              <span suppressHydrationWarning style={{
                fontSize: "10px", color: "#94a3b8", marginTop: "3px",
                alignSelf: isMe ? "flex-end" : "flex-start",
              }}>
                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Bottom zone ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", flexShrink: 0 }}>
        {error && <p style={{ fontSize: "11px", color: "#dc2626", marginBottom: "6px" }}>{error}</p>}

        {/* Status banners */}
        {status === "RESOLVED" && (
          <EndedBanner color="#16a34a" text="Khiếu nại đã được giải quyết. Cảm ơn bạn!" />
        )}
        {status === "REJECTED" && (
          <EndedBanner color="#dc2626" text="Khiếu nại kết thúc. " />
        )}
        {/* Vòng 1 tranh chấp: chat đóng, chờ admin mở vòng 2 */}
        {waitingAdmin && (
          <EndedBanner color="#f59e0b" text="Hệ Thống đang xử lý." />
        )}
        {/* Vòng 2 đang chạy: admin mở, hai bên tiếp tục đàm phán */}
        {roundTwoActive && (
          <EndedBanner color="#7c3aed" text="Hệ Thống đang xử lý." />
        )}
        {/* Vòng 2 tranh chấp cuối: chat đóng, admin phán quyết */}
        {finalDispute && (
          <EndedBanner color="#dc2626" text="Hệ thống đang xử lý." />
        )}

        {/* ── Seller: nút xác nhận (vòng 1 hoặc vòng 2 đang chạy, chưa tranh chấp cuối) ── */}
        {!chatEnded && isSeller && (status === "IN_REVIEW" || roundTwoActive) && !resolution.sellerConfirmed && (
          <div style={{ marginBottom: "8px" }}>
            <button
              onClick={() => { void handleResolve("seller"); }}
              disabled={resolving || !sellerHasReplied}
              style={{
                width: "100%", padding: "9px 14px", borderRadius: "10px",
                background: sellerHasReplied ? "#16a34a" : "#9ca3af", color: "#fff", border: "none",
                fontSize: "13px", fontWeight: "700",
                cursor: (resolving || !sellerHasReplied) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                opacity: (resolving || !sellerHasReplied) ? 0.7 : 1,
              }}
            >
              <CheckCircle2 size={15} />
              Xác nhận đơn hàng đã hoàn thành
            </button>
            {!sellerHasReplied && (
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", textAlign: "center" }}>
                Hãy phản hồi người mua ít nhất 1 tin trước khi xác nhận.
              </p>
            )}
          </div>
        )}

        {/* Seller đã xác nhận — chờ user phản hồi (ẩn khi tranh chấp cuối vì finalDispute banner đã hiện) */}
        {!chatEnded && isSeller && resolution.sellerConfirmed && !finalDispute && (
          <div style={{
            padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px",
            border: "1px solid #bbf7d0", marginBottom: "8px", textAlign: "center",
          }}>
            <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
              ✓ Bạn đã xác nhận đơn hàng hoàn thành. Đang chờ người mua phản hồi...
            </p>
          </div>
        )}

        {/* ── User: panel xác nhận xuất hiện ngay khi seller confirm ── */}
        {!chatEnded && isBuyer && resolution.sellerConfirmed && resolution.userDone === null && (
          <div style={{
            background: "#eff6ff", borderRadius: "12px", padding: "12px 14px",
            border: "1px solid #bfdbfe", marginBottom: "8px",
          }}>
            <p style={{ fontSize: "12px", color: "#1d4ed8", fontWeight: "700", marginBottom: "8px", textAlign: "center" }}>
              Nhà bán hàng đã xác nhận đơn hoàn thành. Bạn có đồng ý không?
            </p>
            {countdown !== null && (
              <div style={{
                textAlign: "center", marginBottom: "8px", padding: "5px 10px",
                background: countdown < 300000 ? "#fef2f2" : "#f0fdf4",
                borderRadius: "6px",
                border: `1px solid ${countdown < 300000 ? "#fecaca" : "#bbf7d0"}`,
              }}>
                <span style={{ fontSize: "11px", color: countdown < 300000 ? "#dc2626" : "#16a34a" }}>
                  ⏱ Tự động xác nhận sau: <strong>{fmtCountdown(countdown)}</strong>
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => { void handleResolve("user", true); }}
                disabled={resolving}
                style={{
                  flex: 1, padding: "9px", borderRadius: "9px",
                  background: "#16a34a", color: "#fff", border: "none",
                  fontSize: "13px", fontWeight: "700",
                  cursor: resolving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  opacity: resolving ? 0.7 : 1,
                }}
              >
                <CheckCircle2 size={14} /> Đã nhận được
              </button>
              <button
                onClick={() => { void handleResolve("user", false); }}
                disabled={resolving}
                style={{
                  flex: 1, padding: "9px", borderRadius: "9px",
                  background: "#fff", color: "#dc2626",
                  border: "1.5px solid #fca5a5",
                  fontSize: "13px", fontWeight: "700",
                  cursor: resolving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  opacity: resolving ? 0.7 : 1,
                }}
              >
                <XCircle size={14} /> Chưa hoàn thành
              </button>
            </div>
          </div>
        )}

        {/* Chờ seller reply (user đã gửi đủ lượt) */}
        {!chatEnded && turnBlocked && chatActive && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              ⏳ Đang chờ nhà bán hàng phản hồi...
            </p>
          </div>
        )}

        {/* Quota đầy */}
        {!chatEnded && quota.locked && chatActive && !resolution.sellerConfirmed && isBuyer && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              ⏳ Đang chờ nhà bán hàng xác nhận...
            </p>
          </div>
        )}

        {/* Input bình thường */}
        {!chatEnded && !quota.locked && !turnBlocked && chatActive && (
          <>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder="Nhập nội dung phản hồi..."
                rows={2}
                maxLength={2000}
                disabled={inputDisabled}
                style={{
                  flex: 1, padding: "10px 14px",
                  borderRadius: "12px", border: "1.5px solid #e2e8f0",
                  fontSize: "13px", resize: "none", outline: "none",
                  fontFamily: "inherit", lineHeight: "1.5",
                  opacity: inputDisabled ? 0.5 : 1,
                  cursor: inputDisabled ? "not-allowed" : "auto",
                }}
                onFocus={e  => { e.currentTarget.style.borderColor = "#2563eb"; }}
                onBlur={e   => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
              />
              <button
                onClick={() => { void handleSend(); }}
                disabled={inputDisabled || !input.trim()}
                style={{
                  padding: "10px 18px", borderRadius: "12px",
                  background: inputDisabled || !input.trim() ? "#f1f5f9" : "#2563eb",
                  color: inputDisabled || !input.trim() ? "#94a3b8" : "#fff",
                  border: "none",
                  cursor: inputDisabled || !input.trim() ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: "700",
                  display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <Send size={13} />
                Gửi
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>
                Enter để gửi · Shift+Enter xuống dòng
              </p>
              {isBuyer && (
                <p style={{ fontSize: "10px", color: quota.warning ? "#b45309" : "#94a3b8" }}>
                  {quota.userTurnUsed}/{quota.userTurnLimit} lượt · {quota.used}/{quota.total} tổng
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Seller: hoàn tiền ngay cho người mua — không cần chờ hệ thống đủ thời gian ── */}
        {!chatEnded && isSeller && (
          <div style={{ marginTop: "10px" }}>
            {confirmSellerRefund ? (
              <div style={{
                borderRadius: "10px", border: "1px solid #bfdbfe", background: "#eff6ff",
                padding: "10px 12px",
              }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#1d4ed8", marginBottom: "4px" }}>
                  💰 Xác nhận hoàn tiền ngay cho người mua?
                </p>
                <p style={{ fontSize: "11px", color: "#1e40af", lineHeight: "1.5", marginBottom: "8px" }}>
                  Người mua nhận tiền ngay lập tức, không cần chờ hệ thống. Nếu bạn đã rút tiền đơn này, số tiền sẽ bị trừ lại từ số dư của bạn. Thao tác không thể hoàn tác.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setConfirmSellerRefund(false)}
                    disabled={sellerRefunding}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px",
                      background: "#fff", color: "#64748b", border: "1px solid #e2e8f0",
                      fontSize: "12px", fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => { void handleSellerRefund(); }}
                    disabled={sellerRefunding}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px",
                      background: "#2563eb", color: "#fff", border: "none",
                      fontSize: "12px", fontWeight: "700",
                      cursor: sellerRefunding ? "not-allowed" : "pointer",
                      opacity: sellerRefunding ? 0.7 : 1,
                    }}
                  >
                    {sellerRefunding ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmSellerRefund(true)}
                style={{
                  width: "100%", padding: "7px 12px", borderRadius: "8px",
                  background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                  fontSize: "11px", fontWeight: "600", cursor: "pointer",
                }}
              >
                💰 Hoàn tiền ngay cho người mua — không cần chờ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Banner trạng thái kết thúc ──
function EndedBanner({ color, text }: { color: string; text: string }) {
  return (
    <div style={{
      textAlign: "center", padding: "8px 12px",
      background: `${color}15`, borderRadius: "8px",
      border: `1px solid ${color}40`,
    }}>
      <p style={{ fontSize: "12px", color, fontWeight: "600" }}>{text}</p>
    </div>
  );
}
