"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Check, CheckCircle, Copy, RotateCcw, AlertTriangle } from "lucide-react";
import { FaReact } from "react-icons/fa";
import { formatVnd } from "@/lib/utils/format";
import QuantitySelector from "@/components/shared/QuantitySelector";

interface Props {
  productId:   string;
  productName: string;
  price:       number;
  isLoggedIn:  boolean;
}

// Giá `price` truyền vào component này đã là giá cuối cùng sau discount (tính ở page.tsx server-side).

interface PostResult {
  orderId:         string;
  orderCode:       string;
  externalOrderId: string;
  finalPrice:      number;
}

interface CouponResult {
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  discountedPrice: number;
}

interface OrderDetail {
  orderCode:        string;
  externalOrderId:  string | null;
  deliveredContent: string | null;
  kfbData:          Record<string, unknown> | null;
}

function genKey(): string {
  return `kfb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Refund modal ──────────────────────────────────────────────────────────────

function RefundModal({ reason, onClose }: { reason: string; onClose: () => void }) {
  const router = useRouter();
  const PREFIX = "Đặt hàng thất bại, tiền đã được hoàn vào ví: ";
  const displayReason = reason.startsWith(PREFIX) ? reason.slice(PREFIX.length) : reason;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-100 bg-amber-50">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400">
              <RotateCcw size={10} className="text-white" strokeWidth={3} />
            </span>
            <span className="text-sm font-semibold text-amber-800">Đặt hàng thất bại — Đã hoàn tiền</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <RotateCcw size={24} className="text-amber-500" />
              </div>
            </div>
            <p className="text-base font-bold text-amber-600">Tiền đã được hoàn vào ví!</p>
            <p className="text-xs text-gray-500 mt-1">Đơn hàng không thể hoàn tất. Số tiền đã bị trừ được hoàn lại ngay lập tức.</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Lý do từ Khuongfb</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-900 leading-relaxed">{displayReason}</p>
            </div>
          </div>
          <div className="flex gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3">
            <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Số dư ví đã được khôi phục. Kiểm tra{" "}
              <span className="font-semibold underline cursor-pointer" onClick={() => router.push("/lich-su-don-hang")}>
                lịch sử đơn hàng
              </span>{" "}để xem chi tiết giao dịch hoàn tiền.
            </p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <CheckCircle size={15} /> Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delivery modal ────────────────────────────────────────────────────────────

function DeliveryModal({ detail, onClose }: { detail: OrderDetail; finalPrice: number; onClose: () => void }) {
  const router = useRouter();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const numericEntries = detail.kfbData
    ? Object.entries(detail.kfbData).filter(([k, v]) => /^\d+$/.test(k) && v != null && v !== "")
    : [];
  const kfbRows: { label: string; value: string }[] = detail.kfbData
    ? Object.entries(detail.kfbData)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => ({
          label: /^\d+$/.test(k)
            ? numericEntries.length > 1
              ? `Nội dung nhận được #${Number(k) + 1}`
              : "Nội dung nhận được"
            : k,
          value: String(v),
        }))
    : [];

  const items = [
    ...(detail.deliveredContent ? [{ label: "Nội dung nhận được", value: detail.deliveredContent }] : []),
    ...kfbRows,
  ];

  async function copyItem(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleClose() {
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* Header */}
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
              Sản phẩm của bạn đã được giao thành công. Lưu thông tin bên dưới.
            </p>
          </div>

          {/* Content items */}
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                  {item.label}
                </span>
                <button
                  onClick={() => void copyItem(item.value, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                >
                  {copiedIdx === idx ? (
                    <><Check size={11} className="text-emerald-500" /> Đã chép</>
                  ) : (
                    <><Copy size={11} /> Sao chép</>
                  )}
                </button>
              </div>
              <div className="min-h-11 max-h-36 overflow-y-auto px-4 py-3">
                <p className="text-sm font-mono text-gray-900 break-all leading-relaxed whitespace-pre-wrap">
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          {/* Warning */}
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
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

// ── Main component ────────────────────────────────────────────────────────────

export function KfbBuyButton({ productId, productName: _productName, price, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading,    setLoading]    = useState(false);
  const [orderDetail, setOrderDetail] = useState<{ detail: OrderDetail; finalPrice: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [refundMsg,  setRefundMsg]  = useState<string | null>(null);
  const [qty,        setQty]        = useState(1);
  const [couponCode,     setCouponCode]     = useState("");
  const [couponResult,   setCouponResult]   = useState<CouponResult | null>(null);
  const [couponError,    setCouponError]    = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  function resetCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  }

  async function handleApplyCoupon() {
    setCouponError("");
    setCouponChecking(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        credentials: "include",
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          orderType: "KHUONGFB_PRODUCT",
          productId,
          orderValue: price * qty,
          quantity: qty,
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

  const totalBeforeCoupon = price * qty;
  const totalPrice = couponResult ? couponResult.discountedPrice : totalBeforeCoupon;

  async function handleBuy() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    setLoading(true);
    setError(null);
    setRefundMsg(null);
    try {
      // Bước 1: đặt hàng
      const res = await fetch("/api/orders/kfb", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          externalProductId: productId,
          quantity:          qty,
          idempotencyKey:    genKey(),
          ...(couponResult ? { couponCode } : {}),
        }),
      });
      const json = await res.json() as { data?: PostResult; error?: string; code?: string };
      if (!res.ok || !json.data) {
        if (json.code === "KHUONGFB_FULFILL_ERROR") {
          setRefundMsg(json.error ?? "Đặt hàng thất bại, tiền đã được hoàn vào ví.");
        } else {
          setError(json.error ?? "Đặt hàng thất bại, vui lòng thử lại.");
        }
        return;
      }

      const { orderId, finalPrice } = json.data;

      // Bước 2: lấy chi tiết đơn hàng từ API
      const detailRes = await fetch(`/api/orders/${orderId}`);
      const detailJson = await detailRes.json() as { data?: OrderDetail };
      const detail: OrderDetail = detailJson.data ?? {
        orderCode:        json.data.orderCode,
        externalOrderId:  json.data.externalOrderId,
        deliveredContent: null,
        kfbData:          null,
      };

      setOrderDetail({ detail, finalPrice });
      resetCoupon();
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {orderDetail && (
        <DeliveryModal
          detail={orderDetail.detail}
          finalPrice={orderDetail.finalPrice}
          onClose={() => setOrderDetail(null)}
        />
      )}
      {refundMsg && <RefundModal reason={refundMsg} onClose={() => setRefundMsg(null)} />}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-sm font-medium text-gray-700">Số lượng</span>
          <QuantitySelector value={qty} onChange={(v) => { setQty(v); resetCoupon(); }} min={1} max={100} />
        </div>

        {couponResult ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-emerald-700">
              Đã áp dụng mã &quot;{couponCode}&quot; {couponResult.discountType === "PERCENT" ? `(-${couponResult.discountValue}%)` : `(-${formatVnd(couponResult.discountValue)})`}
            </span>
            <button
              type="button"
              onClick={resetCoupon}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800"
            >
              Hủy
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
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
            {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={() => void handleBuy()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#C53030] hover:bg-[#9B2C2C] text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang xử lý...
            </span>
          ) : (
            <>
              <ShoppingCart size={16} />
              {isLoggedIn ? `Mua ngay — ${formatVnd(totalPrice)}` : "Đăng nhập để mua"}
            </>
          )}
        </button>

        {!isLoggedIn && (
          <p className="text-center text-xs text-gray-400">Bạn cần đăng nhập và có đủ số dư trong ví</p>
        )}
      </div>
    </>
  );
}
