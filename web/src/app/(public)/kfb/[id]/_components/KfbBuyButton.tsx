"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";
import QuantitySelector from "@/components/shared/QuantitySelector";

interface Props {
  productId:   string;
  productName: string;
  price:       number;
  isLoggedIn:  boolean;
}

interface BuyResult {
  orderId:         string;
  orderCode:       string;
  externalOrderId: string;
  finalPrice:      number;
}

function genKey(): string {
  return `kfb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function KfbBuyButton({ productId, productName: _productName, price, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<BuyResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [qty,     setQty]     = useState(1);

  async function handleBuy() {
    if (!isLoggedIn) {
      router.push("/dang-nhap");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/kfb", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          khuongfbProductId: productId,
          quantity:          qty,
          idempotencyKey:    genKey(),
        }),
      });
      const json = await res.json() as { data?: BuyResult; error?: string };
      if (!res.ok || !json.data) {
        setError(json.error ?? "Đặt hàng thất bại, vui lòng thử lại.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-green-700 font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Đặt hàng thành công!
        </div>
        <div className="space-y-1 text-sm text-gray-700">
          <p>Mã đơn hàng: <strong>{result.orderCode}</strong></p>
          <p>Mã đơn ngoài: <strong>{result.externalOrderId}</strong></p>
          <p>Tổng tiền: <strong className="text-[#C53030]">{formatVnd(result.finalPrice)}</strong></p>
        </div>
        <p className="text-xs text-gray-500">Sản phẩm sẽ được xử lý và giao trong thời gian sớm nhất.</p>
        <button
          onClick={() => router.push("/lich-su-don-hang")}
          className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
        >
          Xem lịch sử đơn hàng
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quantity selector — same layout as ProductBuyButton */}
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-sm font-medium text-gray-700">Số lượng</span>
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={1}
          max={100}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Buy button — identical styling to ProductBuyButton */}
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
            {isLoggedIn ? `Mua ngay — ${formatVnd(price * qty)}` : "Đăng nhập để mua"}
          </>
        )}
      </button>

      {!isLoggedIn && (
        <p className="text-center text-xs text-gray-400">Bạn cần đăng nhập và có đủ số dư trong ví</p>
      )}
    </div>
  );
}
