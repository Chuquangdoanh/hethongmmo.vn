"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { Phone, User, Tag, ChevronRight, AlertTriangle } from "lucide-react";

interface Props {
  courseId: string;
  courseName: string;
  price: number;
  originalPrice: number;
  isOnSale: boolean;
  isLoggedIn: boolean;
  userName?: string;
}

export default function CourseOrderForm({
  courseId,
  courseName: _courseName,
  price,
  originalPrice,
  isOnSale,
  isLoggedIn,
  userName = "",
}: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState(userName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) { router.push("/dang-nhap"); return; }
    setError("");
    setLoading(true);
    try {
      const customerNote = JSON.stringify({
        phone: phone.trim() || undefined,
        name: name.trim() || undefined,
      });
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "COURSE",
          itemId: courseId,
          customerNote,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json() as { data?: { orderId?: string }; error?: string };
      if (!res.ok || !json.data?.orderId) {
        setError(json.error ?? "Đặt hàng thất bại, thử lại sau.");
        return;
      }
      router.push("/don-hang");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-1.5">
            <Phone size={13} strokeWidth={1.75} style={{ color: "#718096" }} />
            Số điện thoại
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại / Zalo liên lạc *"
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0066ff] focus:ring-2 focus:ring-[#0066ff]/20 focus:outline-none transition-all"
          />
        </div>

        {/* Full name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-1.5">
            <User size={13} strokeWidth={1.75} style={{ color: "#718096" }} />
            Họ và tên
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Họ và tên của bạn *"
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0066ff] focus:ring-2 focus:ring-[#0066ff]/20 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Price display — yellow box */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#92400e]">
          <Tag size={13} strokeWidth={1.75} style={{ color: "#d97706" }} />
          Giá ưu đãi
        </span>
        <div className="flex items-center gap-2">
          {isOnSale && (
            <span className="text-xs text-[#92400e]/60 line-through">{formatVnd(originalPrice)}</span>
          )}
          <span className="text-sm font-extrabold text-[#E53E3E]">{formatVnd(price)}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
        >
          <AlertTriangle size={14} strokeWidth={2} style={{ color: "#ef4444", flexShrink: 0, marginTop: "1px" }} />
          <span className="text-xs text-[#ef4444]">{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "#C53030" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang xử lý...
          </>
        ) : isLoggedIn ? (
          <>
            ĐĂNG KÝ NGAY
            <ChevronRight size={16} strokeWidth={2.5} />
          </>
        ) : (
          <>
            Đăng nhập để đăng ký
            <ChevronRight size={16} strokeWidth={2.5} />
          </>
        )}
      </button>

      {!isLoggedIn && (
        <p className="text-[10px] text-[#94a3b8] text-center">
          Bạn cần đăng nhập để thực hiện đăng ký
        </p>
      )}
    </form>
  );
}
