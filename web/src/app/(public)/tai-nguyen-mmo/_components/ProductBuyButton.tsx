"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import {
  X, Store, Package, ShoppingCart,
  AlertTriangle, CheckCircle, Copy, Check, Zap, ShieldCheck,
} from "lucide-react";
import { FaReact } from "react-icons/fa";
import QuantitySelector from "@/components/shared/QuantitySelector";

export interface ProductVariant {
  id: string;
  variantName?: string | null;
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
  /** % giảm giá preview (Tài nguyên MMO/Kho nguyên liệu — Đại lý hoặc tier). Không truyền = không hiển thị (SELLER_PRODUCT không áp dụng). */
  discountPct?: number;
}

/** Giá hiển thị sau khi áp discount preview — chỉ để hiển thị, giá thật luôn tính lại ở server khi checkout. */
function applyDiscountPreview(price: number, pct: number): number {
  return pct > 0 ? Math.round(price * (1 - pct / 100)) : price;
}

interface OrderResult {
  orderId: string;
  orderCode: string;
  deliveredContent?: string;
  deliveredContents?: string[];
  quantity?: number;
}

interface CouponResult {
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  discountedPrice: number;
}

// ── Star row for confirm popup ────────────────────────────────────────────────

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

// ── Delivery modal — handles single or multiple items ─────────────────────────

function DeliveryModal({ result, onClose }: { result: OrderResult; onClose: () => void }) {
  const router = useRouter();
  const [copiedIndex, setCopiedIndex] = useState<number | "all" | null>(null);

  const items = result.deliveredContents ?? (result.deliveredContent ? [result.deliveredContent] : []);
  const isBatch = items.length > 1;

  async function copyItem(text: string, index: number | "all") {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleCopyAll() {
    const allText = items
      .map((content, i) => `--- Sản phẩm ${i + 1}/${items.length} ---\n${content}`)
      .join("\n\n");
    void copyItem(allText, "all");
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
              <Check size={11} className="text-white" strokeWidth={3} />
            </span>
            <span className="text-sm font-semibold text-gray-800">
              {isBatch ? `Nhận hàng thành công — ${items.length} sản phẩm!` : "Nhận hàng thành công!"}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Icon + title */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <FaReact size={24} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-base font-bold text-emerald-600">Giao hàng tự động!</p>
            <p className="text-xs text-gray-500 mt-1">
              {isBatch
                ? `${items.length} sản phẩm đã được giao thành công. Lưu thông tin bên dưới.`
                : "Sản phẩm của bạn đã được giao thành công. Lưu thông tin bên dưới."}
            </p>
          </div>

          {/* Copy all button (batch only) */}
          {isBatch && (
            <button
              onClick={handleCopyAll}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              {copiedIndex === "all" ? (
                <><Check size={13} className="text-emerald-600" /> Đã sao chép tất cả!</>
              ) : (
                <><Copy size={13} /> Sao chép tất cả {items.length} sản phẩm</>
              )}
            </button>
          )}

          {/* Content items */}
          {items.map((content, idx) => (
            <div key={idx} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                  {isBatch ? `Sản phẩm ${idx + 1} / ${items.length}` : "Nội dung nhận được"}
                </span>
                <button
                  onClick={() => void copyItem(content, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                >
                  {copiedIndex === idx ? (
                    <><Check size={11} className="text-emerald-500" /> Đã chép</>
                  ) : (
                    <><Copy size={11} /> Sao chép</>
                  )}
                </button>
              </div>
              <div className="min-h-11 max-h-36 overflow-y-auto px-4 py-3">
                <p className="text-sm font-mono text-gray-900 break-all leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </div>
            </div>
          ))}

          {/* Warning */}
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-800 leading-relaxed">
              TRUY CẬP ĐỂ KHIẾU NẠI ĐƠN HÀNG ĐỂ ĐƯỢC HỖ TRỢ {"  "}
              <span
                className="font-semibold underline cursor-pointer"
                onClick={() => router.push("/don-hang")}
              >
              "LỊCH SỬ ĐƠN HÀNG "
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

// ── Confirm popup ─────────────────────────────────────────────────────────────

function BuyConfirmPopup({
  props,
  selectedVariant,
  quantity,
  onConfirm,
  onClose,
  loading,
  error,
  couponCode,
  couponResult,
}: {
  props: ProductBuyButtonProps;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string;
  couponCode: string;
  couponResult: CouponResult | null;
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

  const discountPct = props.discountPct ?? 0;
  const catalogUnitPrice = selectedVariant ? selectedVariant.variantPrice : props.price;
  const tierDiscountedUnitPrice = applyDiscountPreview(catalogUnitPrice, discountPct);
  const canUseCoupon = quantity === 1;
  const unitPrice = canUseCoupon && couponResult ? couponResult.discountedPrice : tierDiscountedUnitPrice;
  const totalPrice = unitPrice * quantity;

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

        {/* Price breakdown */}
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1.5">
            {discountPct > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Giá gốc</span>
                <span className="text-[11px] text-gray-400 line-through">{formatVnd(catalogUnitPrice * quantity)}</span>
              </div>
            )}
            {quantity > 1 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Đơn giá</span>
                  <span className="text-sm text-gray-700">{formatVnd(unitPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Số lượng</span>
                  <span className="text-sm font-semibold text-gray-700">× {quantity}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-1">
                  <span className="text-xs font-semibold text-gray-600">
                    Thành tiền
                    {discountPct > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-600">-{discountPct}%</span>
                    )}
                  </span>
                  <span className="text-xl font-bold text-[#E53E3E]">{formatVnd(totalPrice)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Giá thanh toán
                  {discountPct > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-emerald-600">-{discountPct}%</span>
                  )}
                </span>
                <span className="text-xl font-bold text-[#E53E3E]">{formatVnd(unitPrice)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Coupon applied (đã áp trên trang sản phẩm) — chỉ hiển thị, không nhập lại ở đây */}
        {canUseCoupon && couponResult && (
          <div className="px-5 pb-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
              <span className="text-xs font-semibold text-emerald-700">
                Đã áp dụng mã &quot;{couponCode}&quot; {couponResult.discountType === "PERCENT" ? `(-${couponResult.discountValue}%)` : `(-${formatVnd(couponResult.discountValue)})`}
              </span>
            </div>
          </div>
        )}

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

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductBuyButton(props: ProductBuyButtonProps) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  function resetCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  }

  const discountPct = props.discountPct ?? 0;
  const activeVariants = (props.variants ?? []).filter((v) => v.isActive);
  const hasVariants = activeVariants.length > 0;
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;

  const minVariantPrice = hasVariants ? Math.min(...activeVariants.map((v) => v.variantPrice)) : null;
  const unitPrice = selectedVariant ? selectedVariant.variantPrice : (minVariantPrice ?? props.price);
  const canUseCoupon = quantity === 1 && (!hasVariants || !!selectedVariantId);
  const tierDiscountedUnitPrice = applyDiscountPreview(unitPrice, discountPct);
  const displayUnitPrice = canUseCoupon && couponResult ? couponResult.discountedPrice : tierDiscountedUnitPrice;
  const priceLabel = selectedVariant
    ? formatVnd(displayUnitPrice * quantity)
    : hasVariants
      ? `Từ ${formatVnd(applyDiscountPreview(minVariantPrice!, discountPct))}`
      : formatVnd(displayUnitPrice * quantity);

  // Quantity is only meaningful when there are items in stock to buy
  const maxQuantity = Math.min(props.available, 100);
  const showQuantitySelector = props.available > 1;

  function handleQuantityChange(newQty: number) {
    setQuantity(newQty);
    if (newQty !== 1) resetCoupon();
  }

  function handleSelectVariant(variantId: string | null) {
    setSelectedVariantId(variantId);
    setError("");
    resetCoupon();
  }

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

  async function handleApplyCoupon() {
    setCouponError("");
    setCouponChecking(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          orderType: props.orderType,
          productId: props.itemId,
          orderValue: tierDiscountedUnitPrice,
          quantity: 1,
        }),
      });
      const json = await res.json() as { data?: CouponResult; error?: string };
      if (!res.ok || !json.data) {
        setCouponError(json.error ?? "Mã giảm giá không hợp lệ.");
        return;
      }
      setCouponResult(json.data);
    } catch {
      setCouponError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setCouponChecking(false);
    }
  }

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        orderType: props.orderType,
        itemId: props.itemId,
        idempotencyKey: crypto.randomUUID(),
        quantity,
      };
      if (selectedVariantId) body.variantId = selectedVariantId;
      if (canUseCoupon && couponResult) body.couponCode = couponCode;

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
      resetCoupon();
      if (json.data.deliveredContent ?? json.data.deliveredContents?.length) {
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
      {mounted && result && (result.deliveredContent ?? result.deliveredContents?.length) && createPortal(
        <DeliveryModal result={result} onClose={() => setResult(null)} />,
        document.body
      )}

      {mounted && showPopup && createPortal(
        <BuyConfirmPopup
          props={{ ...props, price: unitPrice }}
          selectedVariant={selectedVariant}
          quantity={quantity}
          onConfirm={handleConfirm}
          onClose={() => { if (!loading) setShowPopup(false); }}
          loading={loading}
          error={error}
          couponCode={couponCode}
          couponResult={couponResult}
        />,
        document.body
      )}

      <div className="space-y-3">
        {/* Variant selector */}
        {hasVariants && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Chọn gói</p>
              {selectedVariantId && (
                <button
                  type="button"
                  onClick={() => handleSelectVariant(null)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={11} /> Hủy chọn
                </button>
              )}
            </div>
            <div className="space-y-2">
              {activeVariants.map((v, i) => {
                const isSelected = selectedVariantId === v.id;
                const label = v.variantName?.trim() || `Gói ${i + 1}`;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariant(v.id)}
                    className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all duration-150 ${
                      isSelected
                        ? "border-[#C53030] bg-red-50/60"
                        : "border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                        isSelected ? "bg-[#C53030]/10" : "bg-red-50"
                      }`}>
                        <ShieldCheck size={18} className={isSelected ? "text-[#C53030]" : "text-red-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-[#C53030]" : "text-gray-900"}`}>
                          {label}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{v.warranty}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {discountPct > 0 && (
                          <p className="text-[9px] text-gray-400 line-through leading-none mb-0.5">{formatVnd(v.variantPrice)}</p>
                        )}
                        <p className={`text-sm font-bold ${isSelected ? "text-[#C53030]" : "text-gray-700"}`}>
                          {formatVnd(applyDiscountPreview(v.variantPrice, discountPct))}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity selector */}
        {showQuantitySelector && (
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-sm font-medium text-gray-700">Số lượng</span>
            <QuantitySelector
              value={quantity}
              onChange={handleQuantityChange}
              min={1}
              max={maxQuantity}
            />
          </div>
        )}

        {/* Coupon code — nhập ngay trên trang sản phẩm, không cần mở popup mua */}
        {!props.compact && props.isLoggedIn && canUseCoupon && (
          <div className="space-y-1.5">
            {couponResult ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
                <span className="text-xs font-semibold text-emerald-700">
                  Đã áp dụng mã &quot;{couponCode}&quot; {couponResult.discountType === "PERCENT" ? `(-${couponResult.discountValue}%)` : `(-${formatVnd(couponResult.discountValue)})`}
                </span>
                <button type="button" onClick={resetCoupon} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800">
                  Hủy
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Mã giảm giá (nếu có)"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={couponChecking || !couponCode.trim()}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {couponChecking ? "..." : "Áp dụng"}
                </button>
              </div>
            )}
            {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}
          </div>
        )}

        {/* Price summary */}
        {hasVariants && (
          <div className="rounded-xl bg-gray-50 px-4 py-2.5">
            {selectedVariant ? (
              <div className="space-y-1">
                {discountPct > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Giá gốc</span>
                    <span className="text-[11px] text-gray-400 line-through">{formatVnd(selectedVariant.variantPrice * quantity)}</span>
                  </div>
                )}
                {quantity > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Đơn giá</span>
                    <span className="text-sm text-gray-600">{formatVnd(displayUnitPrice)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {quantity > 1 ? `Thành tiền (×${quantity})` : "Giá thanh toán"}
                    {canUseCoupon && couponResult ? (
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-600">Đã áp mã</span>
                    ) : discountPct > 0 ? (
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-600">-{discountPct}%</span>
                    ) : null}
                  </span>
                  <span className="text-lg font-bold text-[#E53E3E]">
                    {formatVnd(displayUnitPrice * quantity)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Giá</span>
                <span className="text-lg font-bold text-gray-400">Chọn gói để xem giá</span>
              </div>
            )}
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
          {!props.compact && <ShoppingCart size={16} />}
          {props.compact
            ? (props.isLoggedIn ? "MUA NGAY" : "ĐĂNG NHẬP")
            : (props.isLoggedIn
                ? (hasVariants && !selectedVariantId
                    ? "Chọn gói để mua"
                    : `Mua ngay — ${priceLabel}`)
                : "Đăng nhập để mua")}
        </button>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    </>
  );
}
