"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";

interface Props {
  providerSlug: string;
  isLoggedIn: boolean;
  /** Kiểu hiển thị: "full" (nút to trong sidebar) | "chip" (nút nhỏ ở header gian hàng). */
  variant?: "full" | "chip";
  className?: string;
}

export default function PartnerPreSaleButton({ providerSlug, isLoggedIn, variant = "full", className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (!isLoggedIn) { router.push("/dang-nhap"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/partner-support/presale", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerSlug }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Không mở được cuộc trò chuyện."); return; }
      router.push(`/ho-tro?id=ps-${json.data.id}`);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={className ?? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0d9488]/30 bg-[#0d9488]/5 text-[#0d9488] text-xs font-bold hover:bg-[#0d9488]/15 disabled:opacity-60 transition-colors"}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} strokeWidth={2} />}
        Nhắn tin với seller
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-2.5 text-sm font-bold text-text-dark hover:border-[#0d9488] hover:text-[#0d9488] transition-all disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} strokeWidth={1.75} />}
        {loading ? "Đang mở..." : "Nhắn tin với seller"}
      </button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
}
