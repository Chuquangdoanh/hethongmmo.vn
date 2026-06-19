"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { ChatMsg, ChatRoomInfo } from "@/components/shared/ChatWidget";

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
  sellerConfirmed: boolean;
  sellerConfirmedAt: string | null;
  userDone: boolean | null;
}

interface Props {
  room: ChatRoomInfo;
  currentUserId: string;
  currentUserLabel: string;         // "Người mua" | "Nhà bán hàng" | "Admin"
  initialChatEnded?: boolean;
  initialComplaintStatus?: string;
  initialQuota?: Quota;
  initialResolution?: Resolution;
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
    sellerConfirmed: false, sellerConfirmedAt: null, userDone: null,
  });
  const [resolving, setResolving]     = useState(false);
  const [countdown, setCountdown]     = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Polling messages
  const poll = useCallback(async () => {
    const last   = messages[messages.length - 1];
    const cursor = last?.createdAt ?? new Date(0).toISOString();
    try {
      const res  = await fetch(`/api/chats/${room.id}/messages?after=${encodeURIComponent(cursor)}`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: {
          messages: ChatMsg[];
          chatEnded: boolean;
          complaintStatus: string;
          quota: Quota;
          resolution: Resolution;
        };
      };
      const d = json.data;
      if (d?.messages?.length)  setMessages(prev => [...prev, ...d.messages]);
      if (d?.chatEnded)         setChatEnded(true);
      if (d?.complaintStatus)   setStatus(d.complaintStatus);
      if (d?.quota)             setQuota(d.quota);
      if (d?.resolution)        setResolution(d.resolution);
    } catch { /* ignore polling errors */ }
  }, [room.id, messages]);

  useEffect(() => {
    if (chatEnded) return;
    const id = setInterval(() => { void poll(); }, 3000);
    return () => clearInterval(id);
  }, [chatEnded, poll]);

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
        setMessages(prev => [...prev, msg as ChatMsg]);
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
      if (outcome === "RESOLVED") { setChatEnded(true); setStatus("RESOLVED"); }
      if (outcome === "PENDING_ADMIN") { setChatEnded(true); setStatus("PENDING_ADMIN"); }
      if (outcome === "WAITING_USER") {
        setResolution(prev => ({ ...prev, sellerConfirmed: true, sellerConfirmedAt: new Date().toISOString() }));
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResolving(false);
    }
  }

  const isBuyer  = currentUserLabel === "Người mua";
  const isSeller = currentUserLabel === "Nhà bán hàng";
  const turnBlocked = isBuyer && (quota.userTurnUsed ?? 0) >= quota.userTurnLimit;
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
      <div className="ht-chat-msgs" style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
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
        <div ref={bottomRef} />
      </div>

      {/* ── Bottom zone ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", flexShrink: 0 }}>
        {error && <p style={{ fontSize: "11px", color: "#dc2626", marginBottom: "6px" }}>{error}</p>}

        {/* RESOLVED */}
        {status === "RESOLVED" && (
          <EndedBanner color="#16a34a" text="Khiếu nại đã được giải quyết. Cảm ơn bạn!" />
        )}

        {/* REJECTED (auto hoặc admin quyết) */}
        {status === "REJECTED" && (
          <EndedBanner color="#dc2626" text="Khiếu nại kết thúc. Tiền đã được hoàn về ví của bạn." />
        )}

        {/* PENDING_ADMIN */}
        {status === "PENDING_ADMIN" && (
          <EndedBanner color="#7c3aed" text="Admin đang xem xét khiếu nại. Vui lòng chờ phán quyết." />
        )}

        {/* Chờ seller reply (user đã gửi 3 tin) */}
        {!chatEnded && turnBlocked && status === "IN_REVIEW" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              ⏳ Đang chờ nhà bán hàng phản hồi...
            </p>
          </div>
        )}

        {/* Quota hết — Resolution buttons */}
        {!chatEnded && quota.locked && status === "IN_REVIEW" && (
          <ResolutionButtons
            isSeller={isSeller}
            isBuyer={isBuyer}
            resolution={resolution}
            countdown={countdown}
            resolving={resolving}
            onSellerConfirm={() => { void handleResolve("seller"); }}
            onUserDone={(done) => { void handleResolve("user", done); }}
          />
        )}

        {/* Input bình thường */}
        {!chatEnded && !quota.locked && !turnBlocked && status === "IN_REVIEW" && (
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
      </div>
    </div>
  );
}

// ── Resolution buttons (sau 20 tin) ──
function ResolutionButtons({
  isSeller, isBuyer, resolution, countdown, resolving,
  onSellerConfirm, onUserDone,
}: {
  isSeller: boolean; isBuyer: boolean;
  resolution: Resolution; countdown: number | null; resolving: boolean;
  onSellerConfirm: () => void; onUserDone: (done: boolean) => void;
}) {
  const fmtCountdown = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div style={{
      background: "#f8fafc", borderRadius: "12px", padding: "14px",
      border: "1px solid #e2e8f0", marginBottom: "2px",
    }}>
      <p style={{ fontSize: "12px", color: "#475569", marginBottom: "10px", textAlign: "center" }}>
        Đã đạt giới hạn <strong>20 tin nhắn</strong>. Vui lòng xác nhận kết quả.
      </p>

      {/* Seller chưa confirm */}
      {isSeller && !resolution.sellerConfirmed && (
        <button
          onClick={onSellerConfirm}
          disabled={resolving}
          style={{
            width: "100%", padding: "10px", borderRadius: "10px",
            background: "#16a34a", color: "#fff", border: "none",
            fontSize: "13px", fontWeight: "700", cursor: resolving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
            opacity: resolving ? 0.7 : 1,
          }}
        >
          <CheckCircle2 size={15} />
          Xác nhận đơn hàng đã hoàn thành
        </button>
      )}

      {/* Seller đã confirm — thông báo */}
      {isSeller && resolution.sellerConfirmed && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
          ✓ Bạn đã xác nhận. Đang chờ người mua phản hồi...
        </p>
      )}

      {/* User: chờ seller xác nhận trước */}
      {isBuyer && !resolution.sellerConfirmed && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b" }}>
          ⏳ Đang chờ nhà bán hàng xác nhận hoàn thành...
        </p>
      )}

      {/* User: seller đã confirm → user có 60' để bấm */}
      {isBuyer && resolution.sellerConfirmed && resolution.userDone === null && (
        <>
          {countdown !== null && (
            <div style={{
              textAlign: "center", marginBottom: "10px",
              padding: "6px", background: countdown < 300000 ? "#fef2f2" : "#f0fdf4",
              borderRadius: "8px", border: `1px solid ${countdown < 300000 ? "#fecaca" : "#bbf7d0"}`,
            }}>
              <span style={{ fontSize: "11px", color: countdown < 300000 ? "#dc2626" : "#16a34a" }}>
                ⏱ Tự động xác nhận sau: <strong>{fmtCountdown(countdown)}</strong>
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onUserDone(true)}
              disabled={resolving}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px",
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
              onClick={() => onUserDone(false)}
              disabled={resolving}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px",
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
        </>
      )}
    </div>
  );
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
