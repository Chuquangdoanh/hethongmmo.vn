"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

interface Props {
  sellerId: string;
  isLoggedIn: boolean;
  isOwnProduct: boolean;
}

export default function MessageSellerButton({ sellerId, isLoggedIn, isOwnProduct }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isOwnProduct) return null;

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/presale-chats", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok || !json.data) {
        setError(json.error ?? "Không thể mở cuộc trò chuyện, thử lại sau.");
        return;
      }
      router.push(`/ho-tro?id=pc-${json.data.id}`);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-2.5 text-sm font-bold text-text-dark hover:border-primary hover:text-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <MessageCircle size={16} strokeWidth={1.75} />
        {loading ? "Đang mở..." : "Nhắn tin với seller"}
      </button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
}
