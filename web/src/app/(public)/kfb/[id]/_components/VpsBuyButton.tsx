"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Check, CheckCircle, Copy, RotateCcw, AlertTriangle } from "lucide-react";
import { FaReact } from "react-icons/fa";
import { formatVnd } from "@/lib/utils/format";

interface BillingCycleOption {
  key:   string;
  label: string;
  price: number;
}

interface OsOption {
  id:   number;
  name: string;
}

interface Props {
  productId:     string;
  isLoggedIn:    boolean;
  billingCycles: BillingCycleOption[];
  osOptions:     OsOption[];
}

interface PostResult {
  orderId:         string;
  orderCode:       string;
  externalOrderId: string;
  finalPrice:      number;
}

interface CouponResult {
  discountType:    "PERCENT" | "FIXED_AMOUNT";
  discountValue:   number;
  discountedPrice: number;
}

interface OrderDetail {
  orderCode:        string;
  externalOrderId:  string | null;
  deliveredContent: string | null;
  kfbData:          Record<string, unknown> | null;
}

function genKey(): string {
  return `vps-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Refund modal ──────────────────────────────────────────────────────────────

function RefundModal({ onClose }: { reason: string; onClose: () => void }) {
  // Không hiển thị lý do kỹ thuật thật từ VNCloud cho khách (có thể lộ thông tin nội bộ như
  // số dư tài khoản đại lý) — admin vẫn nhận được lý do thật qua Telegram/log ở backend.
  const displayReason = "Đặt hàng thất bại, Vui lòng liên hệ với admin để được hỗ trợ !";

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
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
            <p className="text-xs text-gray-500 mt-1">Không thể khởi tạo VPS. Số tiền đã bị trừ được hoàn lại ngay lập tức.</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Lý do</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-900 leading-relaxed">{displayReason}</p>
            </div>
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

function DeliveryModal({ detail, onClose }: { detail: OrderDetail; onClose: () => void }) {
  const router = useRouter();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const rows: { label: string; value: string }[] = detail.kfbData
    ? Object.entries(detail.kfbData)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => ({
          label: /^\d+$/.test(k) ? `VPS #${Number(k) + 1}` : k,
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        }))
    : [];

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
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
              <Check size={11} className="text-white" strokeWidth={3} />
            </span>
            <span className="text-sm font-semibold text-gray-800">Khởi tạo VPS thành công!</span>
          </div>
          <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <FaReact size={24} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-base font-bold text-emerald-600">VPS đã sẵn sàng!</p>
            <p className="text-xs text-gray-500 mt-1">Lưu lại thông tin bên dưới để đăng nhập VPS.</p>
          </div>

          {rows.map((item, idx) => (
            <div key={idx} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{item.label}</span>
                <button
                  onClick={() => void copyItem(item.value, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                >
                  {copiedIdx === idx ? (<><Check size={11} className="text-emerald-500" /> Đã chép</>) : (<><Copy size={11} /> Sao chép</>)}
                </button>
              </div>
              <div className="min-h-11 max-h-36 overflow-y-auto px-4 py-3">
                <p className="text-sm font-mono text-gray-900 break-all leading-relaxed whitespace-pre-wrap">{item.value}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Xem lại thông tin VPS bất kỳ lúc nào tại{" "}
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

// ── Main component ────────────────────────────────────────────────────────────

export function VpsBuyButton({ productId, isLoggedIn, billingCycles, osOptions }: Props) {
  const router = useRouter();
  const [cycle,       setCycle]       = useState<string>("");
  const [os,          setOs]          = useState<string>("");
  const [loading,     setLoading]     = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [refundMsg,   setRefundMsg]   = useState<string | null>(null);
  const [couponCode,     setCouponCode]     = useState("");
  const [couponResult,   setCouponResult]   = useState<CouponResult | null>(null);
  const [couponError,    setCouponError]    = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  const selectedCycle = billingCycles.find((c) => c.key === cycle);
  const canBuy = !!cycle && !!os;
  const totalPrice = couponResult ? couponResult.discountedPrice : selectedCycle?.price ?? 0;

  function resetCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  }

  function handleCycleChange(key: string) {
    setCycle(key);
    resetCoupon();
  }

  async function handleApplyCoupon() {
    if (!selectedCycle) return;
    setCouponError("");
    setCouponChecking(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        credentials: "include",
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          orderType: "VPS_PRODUCT",
          productId,
          orderValue: selectedCycle.price,
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

  async function handleBuy() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    if (!canBuy) return;

    setLoading(true);
    setError(null);
    setRefundMsg(null);
    try {
      const res = await fetch("/api/orders/vps", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          externalProductId: productId,
          billingCycle:      cycle,
          os:                Number(os),
          quantity:          1,
          idempotencyKey:    genKey(),
          ...(couponResult ? { couponCode } : {}),
        }),
      });
      const json = await res.json() as { data?: PostResult; error?: string; code?: string };
      if (!res.ok || !json.data) {
        if (json.code === "VPS_FULFILL_ERROR") {
          setRefundMsg(json.error ?? "Đặt hàng thất bại, tiền đã được hoàn vào ví.");
        } else {
          setError(json.error ?? "Đặt hàng thất bại, vui lòng thử lại.");
        }
        return;
      }

      const { orderId } = json.data;
      const detailRes  = await fetch(`/api/orders/${orderId}`);
      const detailJson = await detailRes.json() as { data?: OrderDetail };
      const detail: OrderDetail = detailJson.data ?? {
        orderCode:        json.data.orderCode,
        externalOrderId:  json.data.externalOrderId,
        deliveredContent: null,
        kfbData:          null,
      };

      setOrderDetail(detail);
      resetCoupon();
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {orderDetail && <DeliveryModal detail={orderDetail} onClose={() => setOrderDetail(null)} />}
      {refundMsg && <RefundModal reason={refundMsg} onClose={() => setRefundMsg(null)} />}

      <div className="space-y-3">
        {/* Chu kỳ thuê — dạng card chọn gói */}
        {billingCycles.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-semibold">Chu kỳ thuê *</label>
            <div className="grid grid-cols-1 gap-2">
              {billingCycles.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleCycleChange(c.key)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-left transition-all duration-150 ${
                    cycle === c.key
                      ? "border-[#C53030] bg-red-50/60"
                      : "border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/20"
                  }`}
                >
                  <span className={`text-sm font-semibold ${cycle === c.key ? "text-[#C53030]" : "text-gray-900"}`}>{c.label}</span>
                  <span className={`text-sm font-bold ${cycle === c.key ? "text-[#C53030]" : "text-gray-700"}`}>
                    {formatVnd(c.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hệ điều hành — dropdown */}
        {osOptions.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Hệ điều hành <span className="text-red-500">*</span></label>
            <select
              value={os}
              onChange={(e) => setOs(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none border-gray-200 bg-gray-50 focus:border-[#C53030] transition-colors"
            >
              <option value="">— Chọn hệ điều hành —</option>
              {osOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Mã giảm giá — chỉ áp dụng được sau khi đã chọn chu kỳ thuê (cần giá để tính) */}
        {selectedCycle && (
          couponResult ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
              <span className="text-xs font-semibold text-emerald-700">
                Đã áp dụng mã &quot;{couponCode}&quot; {couponResult.discountType === "PERCENT" ? `(-${couponResult.discountValue}%)` : `(-${formatVnd(couponResult.discountValue)})`}
              </span>
              <button type="button" onClick={resetCoupon} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800">
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
          )
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={() => void handleBuy()}
          disabled={loading || (isLoggedIn && !canBuy)}
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
              {!isLoggedIn ? "Đăng nhập để mua" : selectedCycle ? `Mua ngay — ${formatVnd(totalPrice)}` : "Chọn chu kỳ thuê và hệ điều hành"}
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
