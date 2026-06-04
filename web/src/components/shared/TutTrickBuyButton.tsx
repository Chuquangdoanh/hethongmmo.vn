"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import SafeHtml from "@/components/shared/SafeHtml";
import {
  X, CheckCircle, Copy, Check, AlertTriangle,
  PartyPopper, LogIn, Star,
} from "lucide-react";

export interface TutTrickItem {
  id: string;
  name: string;
  thumbnail: string | null;
  platform: string;
  category: string;
  price: number;
  description: string | null;
  successRate: number;
  rating: number;
  totalOrders: number;
  publishedDate: string | null;
  warrantyPolicy?: string | null;
  processingTime?: string | null;
}

interface OrderResult {
  orderId: string;
  orderCode: string;
  deliveredContent?: string;
  tutTrickDocs?: string | null;
}

// ─── DeliveryModal ────────────────────────────────────────────────────────────
function DeliveryModal({ result, onClose }: { result: OrderResult; onClose: () => void }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.deliveredContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() { onClose(); router.refresh(); }

  const driveLink = result.deliveredContent ?? "";
  const docs = result.tutTrickDocs ?? null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.60)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: "90dvh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={11} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-semibold text-gray-800">Nhận hàng thành công!</span>
          </div>
          <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <PartyPopper size={26} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-emerald-600">Giao hàng tự động!</p>
            <p className="text-xs text-gray-500 mt-1">Sản phẩm đã được giao. Lưu thông tin bên dưới.</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-emerald-200 bg-emerald-100">
              <span className="text-base leading-none">📁</span>
              <span className="text-xs font-semibold text-emerald-800">Link Google Drive</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-3">
              <a href={driveLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-600 hover:underline break-all font-medium leading-snug">
                {driveLink}
              </a>
              <button onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition-colors whitespace-nowrap">
                {copied ? <><Check size={11} /> Đã chép</> : <><Copy size={11} /> Sao chép</>}
              </button>
            </div>
          </div>

          {docs && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-base leading-none">📄</span>
                <span className="text-xs font-semibold text-gray-700">Nội dung hướng dẫn</span>
              </div>
              <div className="px-3.5 py-3 max-h-28 overflow-y-auto">
                <SafeHtml html={docs} className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1.5" />
              </div>
            </div>
          )}

          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Vui lòng lưu ngay. Bạn có thể xem lại trong mục{" "}
              <span className="font-semibold underline cursor-pointer" onClick={() => router.push("/don-hang")}>Lịch sử đơn hàng</span>.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={handleClose}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
            <CheckCircle size={15} /> Đã lưu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BuyConfirmPopup ──────────────────────────────────────────────────────────
function BuyConfirmPopup({
  item, onClose, onConfirm, loading, error,
}: {
  item: TutTrickItem;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
}) {
  const isFree = item.price === 0;
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch số dư khi popup mở
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: { data?: { balance?: string | number } }) => {
        const b = d?.data?.balance;
        if (b !== undefined) setBalance(Number(b));
      })
      .catch(() => {});
  }, []);

  // Scroll lock + ESC (overflow trên html — không dùng position:fixed để tránh phá fixed elements)
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const remaining = !isFree && balance !== null ? balance - item.price : null;
  const isInsufficient = !isFree && remaining !== null && remaining < 0;

  // Dòng chi tiết dịch vụ (không bao gồm rating/khách hàng — đã đưa lên stats bar)
  const rows: Array<{ label: string; value: React.ReactNode; variant?: "emerald" | "red" }> = [
    { label: "Dịch vụ", value: item.name },
    ...(item.warrantyPolicy ? [{ label: "Chính Sách Bảo Hành", value: item.warrantyPolicy } as const] : []),
    { label: "Tỉ lệ thành công", value: `${item.successRate}%` },
    ...(item.processingTime ? [{ label: "Thời gian xử lý", value: item.processingTime } as const] : []),
    ...(item.publishedDate ? [{ label: "Thời gian cập nhật", value: item.publishedDate } as const] : []),
    ...(balance !== null
      ? [{ label: "Số dư hiện tại", value: formatVnd(balance), variant: "emerald" as const }]
      : []),
    {
      label: "Chi phí",
      value: isFree ? "Miễn phí" : formatVnd(item.price),
      variant: isFree ? "emerald" as const : "red" as const,
    },
    ...(remaining !== null
      ? [{ label: "Số dư còn lại", value: formatVnd(remaining), variant: remaining < 0 ? "red" as const : undefined }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header (teal) — title + subtitle + stats ── */}
        <div
          className="relative px-5 pt-4 pb-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)" }}
        >
          {/* Nút X */}
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            style={{ touchAction: "manipulation" }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/35 transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>

          {/* Title + subtitle */}
          <h3 className="text-white font-bold text-[16px] leading-tight tracking-wide uppercase pr-9">
            XÁC NHẬN MUA TUT
          </h3>
          <p className="text-white/70 text-[11px] mt-0.5 mb-3">
            Vui lòng kiểm tra thông tin trước khi xác nhận
          </p>

          {/* Stats: khách hàng + sao — nằm trong header */}
          <div className="flex items-center justify-between rounded-xl bg-white/15 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-white/90 shrink-0" />
              <span className="text-white text-[13px] font-semibold">
                {item.totalOrders.toLocaleString("vi-VN")} khách hàng
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={13}
                  className={s <= Math.round(item.rating)
                    ? "text-amber-300 fill-amber-300"
                    : "text-white/30 fill-white/20"}
                />
              ))}
              <span className="ml-1 text-white text-[13px] font-bold">{item.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* ── Body — chi tiết dịch vụ ── */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-5 py-3">
              <span className="text-[13px] text-gray-500 shrink-0 pt-px leading-snug">{row.label}</span>
              <span className={`text-[13px] font-semibold text-right leading-snug ${
                row.variant === "emerald" ? "text-emerald-600" :
                row.variant === "red"     ? "text-red-500"     :
                "text-gray-800"
              }`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Cảnh báo số dư không đủ */}
        {isInsufficient && (
          <div className="px-5 py-2.5 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600 font-medium">Số dư không đủ. Vui lòng nạp thêm tiền.</p>
          </div>
        )}

        {/* Lỗi server */}
        {error && (
          <div className="px-5 py-2.5 bg-red-50 border-t border-red-100">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            style={{ touchAction: "manipulation" }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || isInsufficient}
            style={{ touchAction: "manipulation" }}
            className="flex-1 py-3 rounded-xl bg-[#C53030] hover:bg-[#C53030] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Xác nhận mua"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TutTrickBuyButton ────────────────────────────────────────────────────────
interface Props {
  item: TutTrickItem;
  isLoggedIn: boolean;
  variant?: "default" | "dark" | "outline-red" | "solid-red";
  label?: string;
}

export default function TutTrickBuyButton({ item, isLoggedIn, variant = "default", label }: Props) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState<OrderResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  function handleClick() {
    if (!isLoggedIn) { router.push("/dang-nhap"); return; }
    if (showPopup) return;
    setError("");
    setShowPopup(true);
  }

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType: "TUTTRICK", itemId: item.id, idempotencyKey: crypto.randomUUID() }),
      });
      const json = await res.json() as { data?: OrderResult; error?: string };
      if (!res.ok || !json.data?.orderId) {
        setError(json.error ?? "Đặt hàng thất bại. Thử lại sau.");
        return;
      }
      setShowPopup(false);
      if (json.data.deliveredContent) {
        setResult(json.data);
      } else {
        router.push("/don-hang");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const isDark       = variant === "dark";
  const isOutlineRed = variant === "outline-red";
  const isSolidRed   = variant === "solid-red";
  const isFree       = item.price === 0;

  const btnLabel = label ?? (
    isLoggedIn
      ? (isDark || isOutlineRed || isSolidRed) ? "MUA NGAY" : `Mua ngay · ${formatVnd(item.price)}`
      : (isDark || isOutlineRed || isSolidRed)
        ? <span className="flex items-center justify-center gap-1.5"><LogIn size={13} /> Đăng nhập</span>
        : "Đăng nhập để mua"
  );

  return (
    <>
      {/* Render portal ra ngoài DOM tree của card để tránh bị ảnh hưởng bởi overflow/transform */}
      {isMounted && result?.deliveredContent && createPortal(
        <DeliveryModal result={result} onClose={() => { setResult(null); router.refresh(); }} />,
        document.body,
      )}
      {isMounted && showPopup && createPortal(
        <BuyConfirmPopup
          item={item}
          onClose={() => { if (!loading) setShowPopup(false); }}
          onConfirm={handleConfirm}
          loading={loading}
          error={error}
        />,
        document.body,
      )}

      <div className="space-y-1.5">
        <button
          onClick={handleClick}
          style={{ touchAction: "manipulation" }}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] ${
            isSolidRed
              ? "bg-[#C53030] text-white hover:bg-[#9B1C1C]"
              : isOutlineRed
                ? "bg-transparent text-[#2B6CB0] border-2 border-[#2B6CB0] hover:bg-[#2B6CB0] hover:text-white"
                : isDark
                  ? "bg-text-dark text-white hover:bg-[#1e293b]"
                  : isFree
                    ? "bg-[#10b981] text-white hover:bg-[#059669]"
                    : "bg-[#C53030] text-white hover:bg-[#9B1C1C]"
          }`}
        >
          {btnLabel}
        </button>
      </div>
    </>
  );
}
