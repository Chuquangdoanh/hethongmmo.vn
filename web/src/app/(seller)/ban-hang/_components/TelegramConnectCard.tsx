"use client";

import { useState } from "react";
import { Send, CheckCircle2, Loader2, Unplug } from "lucide-react";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~60s

type Props = { initialConnected: boolean };

export default function TelegramConnectCard({ initialConnected }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setError("");
    setIsWaiting(true);
    try {
      const res = await fetch("/api/seller/telegram", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.data?.deepLink) {
        setError(json.error ?? "Không tạo được liên kết. Thử lại sau.");
        setIsWaiting(false);
        return;
      }
      window.open(json.data.deepLink, "_blank", "noopener,noreferrer");
      pollStatus();
    } catch {
      setError("Có lỗi xảy ra. Thử lại sau.");
      setIsWaiting(false);
    }
  }

  function pollStatus() {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/seller/telegram");
        const json = await res.json();
        if (json.data?.connected) {
          clearInterval(timer);
          setConnected(true);
          setIsWaiting(false);
        }
      } catch {
        // bỏ qua — thử lại ở nhịp sau
      }
      if (attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        setIsWaiting(false);
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleDisconnect() {
    setError("");
    try {
      const res = await fetch("/api/seller/telegram", { method: "DELETE" });
      if (res.ok) setConnected(false);
      else setError("Không ngắt được kết nối. Thử lại sau.");
    } catch {
      setError("Có lỗi xảy ra. Thử lại sau.");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Thông báo Telegram
      </h3>

      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${connected ? "bg-emerald-50" : "bg-sky-50"}`}>
          <Send size={16} className={connected ? "text-emerald-600" : "text-sky-500"} />
        </div>
        <div>
          <p className={`text-sm font-bold ${connected ? "text-emerald-700" : "text-gray-800"}`}>
            {connected ? "Đã kết nối" : "Chưa kết nối"}
          </p>
          <p className="text-[11px] text-gray-400">
            {connected ? "Bạn sẽ nhận thông báo khi có đơn mới" : "Kết nối để nhận thông báo đơn hàng"}
          </p>
        </div>
      </div>

      {connected ? (
        <button
          onClick={handleDisconnect}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          <Unplug size={13} /> Ngắt kết nối
        </button>
      ) : isWaiting ? (
        <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-sky-50 text-sky-600 text-xs font-semibold">
          <Loader2 size={13} className="animate-spin" /> Đang chờ bạn bấm Start trong Telegram…
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-[#0052cc] transition-colors"
        >
          <Send size={13} /> Kết nối Telegram
        </button>
      )}

      {connected && (
        <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
          <CheckCircle2 size={11} /> Bot sẽ nhắn cho bạn mỗi khi có đơn hàng mới.
        </p>
      )}
      {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
