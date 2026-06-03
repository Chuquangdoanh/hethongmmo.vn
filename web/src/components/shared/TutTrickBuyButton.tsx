"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import SafeHtml from "@/components/shared/SafeHtml";
import {
  X, CheckCircle, Copy, Check, AlertTriangle, Lock,
  Calendar, Tag, Users, Wallet, Shield, Clock, Gem,
  PartyPopper, LogIn,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK:  "https://svgl.app/library/facebook-icon.svg",
  TIKTOK:    "https://svgl.app/library/tiktok-icon-light.svg",
  GOOGLE:    "https://svgl.app/library/google.svg",
  INSTAGRAM: "https://svgl.app/library/instagram-icon.svg",
  YOUTUBE:   "https://svgl.app/library/youtube.svg",
  ICLOUD:    "https://svgl.app/library/icloud.svg",
  ZALO:      "https://svgl.app/library/zalo.svg",
  TELEGRAM:  "https://svgl.app/library/telegram.svg",
  TWITTER:   "https://svgl.app/library/x.svg",
};

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "X (Twitter)", ICLOUD: "iCloud", OTHER: "Khác",
};

export interface TutTrickItem {
  id: string;
  name: string;
  thumbnail: string | null;
  platform: string;
  category: string;
  price: number;
  description: string | null;
  successRate: number;
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

function DeliveryModal({ result, onClose }: { result: OrderResult; onClose: () => void }) {
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

  const driveLink = result.deliveredContent ?? "";
  const docs = result.tutTrickDocs ?? null;

  return (
    <div className="modal-backdrop fixed inset-0 z-1100 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
      <div className="modal-card bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={11} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-semibold text-gray-800">Nhận hàng thành công!</span>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Icon + title */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <PartyPopper size={26} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-emerald-600">Giao hàng tự động!</p>
            <p className="text-xs text-gray-500 mt-1">Sản phẩm đã được giao. Lưu thông tin bên dưới.</p>
          </div>

          {/* Bảng 1: Link Google Drive */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-emerald-200 bg-emerald-100">
              <span className="text-base leading-none">📁</span>
              <span className="text-xs font-semibold text-emerald-800">Link Google Drive</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-3">
              <a
                href={driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-medium leading-snug"
              >
                {driveLink}
              </a>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition-colors whitespace-nowrap"
              >
                {copied ? <><Check size={11} /> Đã chép</> : <><Copy size={11} /> Sao chép</>}
              </button>
            </div>
          </div>

          {/* Bảng 2: Nội dung docs */}
          {docs && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-base leading-none">📄</span>
                <span className="text-xs font-semibold text-gray-700">Nội dung hướng dẫn</span>
              </div>
              <div className="px-3.5 py-3 max-h-28 overflow-y-auto">
                <SafeHtml
                  html={docs}
                  className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1.5"
                />
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Vui lòng lưu ngay. Bạn có thể xem lại trong mục{" "}
              <span className="font-semibold underline cursor-pointer" onClick={() => router.push("/don-hang")}>Lịch sử đơn hàng</span>.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle size={15} /> Đã lưu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyConfirmPopup({
  item, onClose, onConfirm, loading, error,
}: {
  item: TutTrickItem;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const isFree = item.price === 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const INFO_ROWS = [
    item.publishedDate ? { Icon: Calendar, label: "Ngày cập nhật",   value: item.publishedDate,  iconCls: "text-[#718096]"  } : null,
    { Icon: Tag,      label: "Nền tảng",        value: null,                iconCls: "text-[#718096]"  },
    { Icon: Users,    label: "Khách hàng",       value: `${item.totalOrders.toLocaleString("vi-VN")} người`, iconCls: "text-[#718096]"  },
    { Icon: Wallet,   label: "Chi phí",          value: null,                iconCls: "text-amber-500"  },
    item.warrantyPolicy  ? { Icon: Shield, label: "Chế độ bảo hành", value: item.warrantyPolicy,  iconCls: "text-[#319795]"  } : null,
    item.processingTime  ? { Icon: Clock,  label: "Thời gian xử lý", value: item.processingTime,  iconCls: "text-[#718096]"  } : null,
  ].filter(Boolean) as Array<{ Icon: React.ElementType; label: string; value: string | null; iconCls: string }>;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-1100 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.60)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={popupRef}
        className="modal-card bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {PLATFORM_ICONS[item.platform] && (
              <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-md p-1 shrink-0 border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PLATFORM_ICONS[item.platform]} alt="" className="w-full h-full object-contain" />
              </span>
            )}
            <span className="text-sm font-bold text-gray-800">Xác nhận mua Tut & Trick</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* Thumbnail */}
          {item.thumbnail && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Name */}
          <h2 className="text-base font-bold text-gray-800 leading-snug">{item.name}</h2>

          {/* Info grid */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-200">
            {INFO_ROWS.map(({ Icon, label, value, iconCls }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Icon size={13} className={iconCls} /> {label}
                </span>
                {/* Special render for platform and cost */}
                {label === "Nền tảng" ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                    {PLATFORM_ICONS[item.platform] && (
                      <span className="flex items-center justify-center w-4 h-4 bg-white rounded border border-gray-200 p-0.5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={PLATFORM_ICONS[item.platform]} alt="" className="w-full h-full object-contain" />
                      </span>
                    )}
                    {PLATFORM_LABELS[item.platform] ?? item.platform}
                  </span>
                ) : label === "Chi phí" ? (
                  <span className={`font-bold flex items-center gap-1 ${isFree ? "text-[#38A169]" : "text-[#E53E3E]"}`}>
                    {isFree
                      ? <><Tag size={11} /> Miễn phí</>
                      : <><Gem size={11} /> {formatVnd(item.price)}</>
                    }
                  </span>
                ) : (
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
                )}
              </div>
            ))}
          </div>

          {/* Tỉ lệ thành công */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1.5">
                <CheckCircle size={13} className="text-[#319795]" /> Tỉ lệ thành công
              </span>
              <span className="font-bold text-[#319795]">{item.successRate}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#319795] to-[#38A169]"
                style={{ width: `${item.successRate}%` }}
              />
            </div>
          </div>

          {/* Mô tả */}
          {item.description && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mô tả</p>
              <div className="text-xs text-gray-600 leading-relaxed max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                <SafeHtml html={item.description} />
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Nội dung chi tiết sẽ được giao ngay sau khi xác nhận mua. Không hoàn tiền sau khi đã nhận hàng.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-500 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#C53030] text-white text-sm font-bold hover:bg-[#C53030] disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : isFree ? "Nhận miễn phí" : `Mua · ${formatVnd(item.price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  item: TutTrickItem;
  isLoggedIn: boolean;
  variant?: "default" | "dark" | "outline-red" | "solid-red";
  label?: string;
}

export default function TutTrickBuyButton({ item, isLoggedIn, variant = "default", label }: Props) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
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
      {result?.deliveredContent && (
        <DeliveryModal result={result} onClose={() => { setResult(null); router.refresh(); }} />
      )}
      {showPopup && (
        <BuyConfirmPopup
          item={item}
          onClose={() => { if (!loading) setShowPopup(false); }}
          onConfirm={handleConfirm}
          loading={loading}
          error={error}
        />
      )}

      <div className="space-y-1.5">
        <button
          onClick={handleClick}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] ${
            isSolidRed
              ? "bg-[#C53030] text-white hover:bg-[#C53030]"
              : isOutlineRed
                ? "bg-transparent text-[#2B6CB0] border-2 border-[#2B6CB0] hover:bg-[#2B6CB0] hover:text-white"
                : isDark
                  ? "bg-[#0f172a] text-white hover:bg-[#1e293b]"
                  : isFree
                    ? "bg-[#10b981] text-white hover:bg-[#059669]"
                    : "bg-[#C53030] text-white hover:bg-[#C53030]"
          }`}
        >
          {btnLabel}
        </button>
       
      </div>
    </>
  );
}
