"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import {
  X, Store, Package, ShoppingCart, PartyPopper,
  AlertTriangle, CheckCircle, Copy, Check, Zap, ShieldCheck,
} from "lucide-react";

export interface ProductVariant {
  id: string;
  variantPrice: number;
  warranty: string;
  isActive: boolean;
}

interface ProductBuyButtonProps {
  itemId: string;
  orderType: "MMO_PRODUCT" | "SELLER_PRODUCT";
  itemName: string;
  price: number;
  isLoggedIn: boolean;
  avgRating: number;
  reviewCount: number;
  available: number;
  totalSold: number;
  sellerName?: string;
  compact?: boolean;
  showCartButton?: boolean;
  variants?: ProductVariant[];
}

interface OrderResult {
  orderId: string;
  orderCode: string;
  deliveredContent?: string;
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="rounded-xl bg-amber-50 py-3 px-2 text-center">
      <div className="flex items-center justify-center gap-0.5 mb-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            className={`w-3 h-3 ${s <= Math.round(rating) ? "text-amber-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm font-bold text-gray-800">{count > 0 ? rating.toFixed(1) : "—"}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">Đánh giá</p>
    </div>
  );
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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
              <Check size={11} className="text-white" strokeWidth={3} />
            </span>
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
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <PartyPopper size={24} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-base font-bold text-emerald-600">Giao hàng tự động!</p>
            <p className="text-xs text-gray-500 mt-1">Sản phẩm của bạn đã được giao thành công. Lưu thông tin bên dưới.</p>
          </div>
          <div className="rounded-xl bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Nội dung nhận được</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    Đã chép
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    Sao chép
                  </>
                )}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto px-4 py-3">
              <p className="text-sm font-mono text-white break-all leading-relaxed whitespace-pre-wrap">{result.deliveredContent}</p>
            </div>
          </div>
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Vui lòng lưu thông tin này ngay. Bạn có thể xem lại trong mục{" "}
              <span className="font-semibold underline cursor-pointer" onClick={() => router.push("/don-hang")}>
                Lịch sử đơn hàng
              </span>.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={15} /> Đã lưu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyConfirmPopup({
  props,
  selectedVariant,
  onConfirm,
  onClose,
  loading,
  error,
}: {
  props: ProductBuyButtonProps;
  selectedVariant: ProductVariant | null;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const displayPrice = selectedVariant ? selectedVariant.variantPrice : props.price;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Xác nhận mua hàng</p>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{props.itemName}</h3>
            {props.sellerName && (
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-medium text-blue-600">
                <Store size={10} /> {props.sellerName}
              </span>
            )}
            {selectedVariant && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                <ShieldCheck size={12} />
                <span>Bảo hành: <strong>{selectedVariant.warranty}</strong></span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 grid grid-cols-3 gap-2.5">
          <StarRow rating={props.avgRating} count={props.reviewCount} />

          <div className="rounded-xl bg-emerald-50 py-3 px-2 text-center">
            <div className="flex justify-center mb-1">
              <Package size={18} className="text-[#319795]" />
            </div>
            <p className="text-sm font-bold text-gray-800">{props.available.toLocaleString("vi-VN")}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Kho hàng</p>
          </div>

          <div className="rounded-xl bg-purple-50 py-3 px-2 text-center">
            <div className="flex justify-center mb-1">
              <ShoppingCart size={18} className="text-[#718096]" />
            </div>
            <p className="text-sm font-bold text-gray-800">{props.totalSold.toLocaleString("vi-VN")}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Đã bán</p>
          </div>
        </div>

        {/* Price */}
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Giá thanh toán</span>
            <span className="text-xl font-bold text-[#E53E3E]">{formatVnd(displayPrice)}</span>
          </div>
        </div>

        {error && (
          <div className="px-5 pb-3">
            <p className="text-xs text-red-500 text-center">{error}</p>
          </div>
        )}

        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="py-3 rounded-xl bg-[#C53030] text-white text-sm font-bold hover:bg-[#9B2C2C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Đang xử lý..." : "Xác nhận mua"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductBuyButton(props: ProductBuyButtonProps) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  const activeVariants = (props.variants ?? []).filter((v) => v.isActive);
  const hasVariants = activeVariants.length > 0;
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;

  // Displayed price: variant price if selected, else min variant price, else product price
  const minVariantPrice = hasVariants ? Math.min(...activeVariants.map((v) => v.variantPrice)) : null;
  const displayPrice = selectedVariant ? selectedVariant.variantPrice : (minVariantPrice ?? props.price);
  const priceLabel = selectedVariant
    ? formatVnd(selectedVariant.variantPrice)
    : hasVariants
      ? `Từ ${formatVnd(minVariantPrice!)}`
      : formatVnd(props.price);

  function handleClick() {
    if (!props.isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    if (hasVariants && !selectedVariantId) {
      setError("Vui lòng chọn một gói trước khi mua.");
      return;
    }
    setError("");
    setShowPopup(true);
  }

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        orderType: props.orderType,
        itemId: props.itemId,
        idempotencyKey: crypto.randomUUID(),
      };
      if (selectedVariantId) body.variantId = selectedVariantId;

      const res = await fetch("/api/orders", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { data?: OrderResult; error?: string };
      if (!res.ok || !json.data?.orderId) {
        setError(json.error ?? "Đặt hàng thất bại, thử lại sau.");
        return;
      }
      setShowPopup(false);
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

  return (
    <>
      {mounted && result?.deliveredContent && createPortal(
        <DeliveryModal result={result} onClose={() => setResult(null)} />,
        document.body
      )}

      {mounted && showPopup && createPortal(
        <BuyConfirmPopup
          props={{ ...props, price: displayPrice }}
          selectedVariant={selectedVariant}
          onConfirm={handleConfirm}
          onClose={() => { if (!loading) setShowPopup(false); }}
          loading={loading}
          error={error}
        />,
        document.body
      )}

      <div className="space-y-3">
        {/* Variant selector */}
        {hasVariants && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Chọn gói</p>
            <div className="space-y-2">
              {activeVariants.map((v, i) => {
                const isSelected = selectedVariantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setSelectedVariantId(v.id); setError(""); }}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150 ${
                      isSelected
                        ? "border-[#C53030] bg-red-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          isSelected ? "border-[#C53030] bg-[#C53030]" : "border-gray-300"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">Gói {i + 1}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={10} className="text-emerald-600" />
                            <p className="text-[10px] text-emerald-700 font-medium">Bảo hành: {v.warranty}</p>
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${isSelected ? "text-[#C53030]" : "text-gray-800"}`}>
                        {formatVnd(v.variantPrice)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price summary */}
        {hasVariants && (
          <div className="rounded-xl bg-gray-50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {selectedVariant ? "Giá thanh toán" : "Giá"}
            </span>
            <span className={`text-lg font-bold ${selectedVariant ? "text-[#E53E3E]" : "text-gray-400"}`}>
              {selectedVariant ? formatVnd(selectedVariant.variantPrice) : "Chọn gói để xem giá"}
            </span>
          </div>
        )}

        {/* Buy button */}
        <button
          onClick={handleClick}
          className={`w-full rounded-xl font-bold active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 ${
            props.compact
              ? "py-2 text-sm bg-[#C53030] hover:bg-[#9B2C2C] text-white"
              : "py-3.5 text-sm bg-[#C53030] hover:bg-[#9B2C2C] text-white shadow-md"
          }`}
        >
          {!props.compact && <Zap size={16} />}
          {props.compact
            ? (props.isLoggedIn ? "MUA NGAY" : "ĐĂNG NHẬP")
            : (props.isLoggedIn
                ? (hasVariants && !selectedVariantId ? "Chọn gói để mua" : `Mua ngay — ${priceLabel}`)
                : "Đăng nhập để mua")}
        </button>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    </>
  );
}
