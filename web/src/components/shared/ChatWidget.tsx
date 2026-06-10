"use client";

import { useState, useEffect, useRef } from "react";

export type ChatMsg = {
  id: string;
  senderId: string;
  senderName: string;
  senderLabel: string;
  content: string;
  createdAt: string;
};

export type ChatRoomInfo = {
  id: string;
  participants: Array<{ userId: string; label: string; userName: string }>;
  messages: ChatMsg[];
};

interface Props {
  room: ChatRoomInfo;
  currentUserId: string;
  accentColor?: "blue" | "purple";
  initialChatEnded?: boolean;
  endedLabel?: string;
}

export default function ChatWidget({
  room,
  currentUserId,
  accentColor = "blue",
  initialChatEnded = false,
  endedLabel,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(room.messages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatEnded, setChatEnded] = useState(initialChatEnded);
  const bottomRef = useRef<HTMLDivElement>(null);

  const accent = accentColor === "purple"
    ? { bg: "bg-[#7C3AED]", hover: "hover:bg-[#A855F7]", ring: "focus:ring-[#7C3AED]" }
    : { bg: "bg-blue-600", hover: "hover:bg-blue-700", ring: "focus:ring-blue-500" };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages + chatEnded status every 3s
  useEffect(() => {
    const id = setInterval(async () => {
      const last = messages[messages.length - 1];
      const cursor = last?.createdAt ?? new Date(0).toISOString();
      try {
        const res = await fetch(
          `/api/chats/${room.id}/messages?after=${encodeURIComponent(cursor)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          data: { messages: ChatMsg[]; chatEnded: boolean };
        };
        if (json.data?.messages?.length) {
          setMessages((prev) => [...prev, ...json.data.messages]);
        }
        if (json.data?.chatEnded) setChatEnded(true);
      } catch {
        /* ignore polling errors */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [room.id, messages]);

  async function handleSend() {
    if (!input.trim() || chatEnded) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/chats/${room.id}/messages`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = (await res.json()) as { data?: ChatMsg; error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi thất bại"); return; }
      setMessages((prev) => [...prev, json.data!]);
      setInput("");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
      style={{ minHeight: "340px", maxHeight: "520px" }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">💬 Trò chuyện xử lý khiếu nại</h3>
          {chatEnded && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              endedLabel === "Hoàn thành"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : endedLabel === "Từ chối"
                ? "bg-gray-50 text-gray-500 border-gray-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}>
              {endedLabel ?? "Đã kết thúc"}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
          {room.participants.map((p) => `${p.userName} (${p.label})`).join(" · ")}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-center text-gray-400 py-10">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const displayName = msg.senderLabel === "Nhà bán hàng"
            ? `Seller #${msg.senderId.slice(0, 8).toUpperCase()}`
            : msg.senderName;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[10px] text-gray-500 mb-0.5 font-medium">
                  {displayName} · {msg.senderLabel}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                  isMe
                    ? `${accent.bg} text-white rounded-tr-sm`
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!chatEnded ? (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          {error && <p className="text-xs text-red-500 mb-1.5">{error}</p>}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Nhập tin nhắn... (Enter để gửi)"
              rows={2}
              maxLength={2000}
              className={`flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${accent.ring} focus:border-transparent`}
            />
            <button
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
              className={`px-4 py-2.5 rounded-xl ${accent.bg} ${accent.hover} text-white text-sm font-bold disabled:opacity-50 transition-colors whitespace-nowrap`}
            >
              {sending ? "..." : "Gửi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0 text-center">
          <p className="text-xs text-gray-400">Cuộc trò chuyện đã kết thúc. Bạn cần hỗ trợ nhắn tin trực tiếp tới zalo : 0393.118.789 để được hỗ trợ.</p>
        </div>
      )}
    </div>
  );
}
