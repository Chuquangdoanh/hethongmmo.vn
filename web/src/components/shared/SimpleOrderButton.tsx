"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface Props {
  orderType: "COURSE" | "TUTTRICK" | "MMO_PRODUCT" | "SELLER_PRODUCT";
  itemId: string;
  itemName: string;
  price: number;
  isLoggedIn: boolean;
  variant?: "default" | "dark";
}

interface OrderResult {
  orderId: string;
  orderCode: string;
  deliveredContent?: string;
}

function DeliveryModal({
  result,
  onClose,
}: {
  result: OrderResult;
  onClose: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.deliveredContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-gray-800">Nhận hàng thành công!</span>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Icon + title */}
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-base font-bold text-emerald-600">Giao hàng tự động!</p>
            <p className="text-xs text-gray-500 mt-1">
              Sản phẩm của bạn đã được giao thành công. Lưu thông tin bên dưới.
            </p>
          </div>

          {/* Content box */}
          <div className="rounded-xl bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Nội dung nhận được</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Đã chép
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Sao chép
                  </>
                )}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto px-4 py-3">
              <p className="text-sm font-mono text-white break-all leading-relaxed whitespace-pre-wrap">
                {result.deliveredContent}
              </p>
            </div>
          </div>

          {/* Warning note */}
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Vui lòng lưu thông tin này ngay. Bạn có thể xem lại trong mục{" "}
              <span className="font-semibold underline cursor-pointer" onClick={() => router.push("/don-hang")}>
                Lịch sử đơn hàng
              </span>{" "}
              tại trang cá nhân.
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            ✓ Đã lưu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimpleOrderButton({
  orderType,
  itemId,
  itemName: _itemName,
  price,
  isLoggedIn,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  async function handleOrder() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          itemId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json() as { data?: OrderResult; error?: string };
      if (!res.ok || !json.data?.orderId) {
        setError(json.error ?? "Đặt hàng thất bại, thử lại sau.");
        return;
      }
      if (json.data.deliveredContent) {
        setResult(json.data);
      } else {
        router.push("/don-hang");
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const isDark = variant === "dark";

  return (
    <>
      {result?.deliveredContent && (
        <DeliveryModal result={result} onClose={() => setResult(null)} />
      )}

      <div className="space-y-1.5">
        <button
          onClick={handleOrder}
          disabled={loading}
          className={`w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ${
            isDark
              ? "bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.98]"
              : "bg-[#FF4500] text-white hover:bg-[#D03A00]"
          }`}
        >
          {loading
            ? "Đang xử lý..."
            : isLoggedIn
              ? isDark
                ? "MUA NGAY"
                : `Mua ngay · ${formatVnd(price)}`
              : isDark
                ? "🔑 Đăng nhập để mua"
                : "Đăng nhập để mua"}
        </button>
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      </div>
    </>
  );
}
