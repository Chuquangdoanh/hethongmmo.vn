"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import type { ChatMsg, ChatRoomInfo } from "@/components/shared/ChatWidget";

interface Props {
  room: ChatRoomInfo;
  currentUserId: string;
  initialChatEnded?: boolean;
}

const LABEL_BG: Record<string, string> = {
  Admin: "#7c3aed", Seller: "#f59e0b", "Nhà bán hàng": "#f59e0b",
};

export default function TicketChatPanel({ room, currentUserId, initialChatEnded = false }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(room.messages);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const [chatEnded, setChatEnded] = useState(initialChatEnded);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = setInterval(async () => {
      const last   = messages[messages.length - 1];
      const cursor = last?.createdAt ?? new Date(0).toISOString();
      try {
        const res  = await fetch(`/api/chats/${room.id}/messages?after=${encodeURIComponent(cursor)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: { messages: ChatMsg[]; chatEnded: boolean } };
        if (json.data?.messages?.length) setMessages(prev => [...prev, ...json.data.messages]);
        if (json.data?.chatEnded) setChatEnded(true);
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(id);
  }, [room.id, messages]);

  async function handleSend() {
    if (!input.trim() || chatEnded || sending) return;
    setSending(true);
    setError("");
    try {
      const res  = await fetch(`/api/chats/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = (await res.json()) as { data?: ChatMsg; error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi thất bại"); return; }
      setMessages(prev => [...prev, json.data!]);
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Messages */}
      <div
        className="ht-chat-msgs"
        style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>Chưa có tin nhắn nào.</p>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Hệ thống đang xử lý khiếu nại của bạn...
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
                  🔔 Hệ thống: {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
                marginBottom: "12px",
              }}
            >
              {!isMe && (
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                  <div style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    background: labelBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "800", color: "#fff",
                    flexShrink: 0,
                  }}>
                    {msg.senderName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                      {msg.senderName}
                    </span>
                    {" "}
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>({msg.senderLabel})</span>
                  </div>
                </div>
              )}

              <div style={{
                maxWidth: "78%",
                padding: "9px 14px",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "#2563eb" : "#fff",
                color: isMe ? "#fff" : "#1e293b",
                fontSize: "13px",
                lineHeight: "1.55",
                border: isMe ? "none" : "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>

              <span
                suppressHydrationWarning
                style={{
                  fontSize: "10px", color: "#94a3b8", marginTop: "3px",
                  alignSelf: isMe ? "flex-end" : "flex-start",
                }}
              >
                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!chatEnded ? (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", flexShrink: 0 }}>
          {error && (
            <p style={{ fontSize: "11px", color: "#dc2626", marginBottom: "6px" }}>{error}</p>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Nhập nội dung phản hồi..."
              rows={2}
              maxLength={2000}
              style={{
                flex: 1, padding: "10px 14px",
                borderRadius: "12px", border: "1.5px solid #e2e8f0",
                fontSize: "13px", resize: "none", outline: "none",
                fontFamily: "inherit", lineHeight: "1.5",
                transition: "border-color 0.15s",
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = "#2563eb"; }}
              onBlur={e   => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            <button
              onClick={() => { void handleSend(); }}
              disabled={sending || !input.trim()}
              style={{
                padding: "10px 18px",
                borderRadius: "12px",
                background: sending || !input.trim() ? "#f1f5f9" : "#2563eb",
                color: sending || !input.trim() ? "#94a3b8" : "#fff",
                border: "none",
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: "700",
                display: "flex", alignItems: "center", gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <Send size={13} />
              Gửi phản hồi
            </button>
          </div>
          <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px" }}>
            Nhấn Enter để gửi · Shift+Enter xuống dòng
          </p>
        </div>
      ) : (
        <div style={{
          borderTop: "1px solid #e2e8f0", paddingTop: "10px",
          textAlign: "center", flexShrink: 0,
        }}>
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>
            Cuộc trò chuyện đã kết thúc. Cần hỗ trợ thêm: Zalo 0393.118.789
          </p>
        </div>
      )}
    </div>
  );
}
