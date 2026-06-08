"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { Package, ArrowDownToLine, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface QualifyingOrder {
  id: string;
  orderCode: string;
  itemName: string;
  price: number;
  createdAt: string;
}

interface Props {
  qualifyingOrders: QualifyingOrder[];
  feePercent: number;
  minAmount: number;
  holdDays: number;
  hasBankInfo: boolean;
}

export default function WithdrawalForm({
  qualifyingOrders,
  feePercent,
  minAmount,
  holdDays,
  hasBankInfo,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const total = qualifyingOrders.reduce((s, o) => s + o.price, 0);
  const fee = Math.floor(total * feePercent / 100);
  const net = total - fee;
  const canWithdraw = hasBankInfo && total >= minAmount && qualifyingOrders.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWithdraw) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/seller/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: qualifyingOrders.map((o) => o.id) }),
      });
      const json = await res.json() as { data?: unknown; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gửi yêu cầu thất bại.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!hasBankInfo) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-700">Chưa có thông tin ngân hàng</p>
          <p className="text-xs text-amber-600 mt-0.5">Vui lòng liên hệ admin để cập nhật thông tin ngân hàng trước khi rút tiền.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={24} className="text-emerald-600" />
        </div>
        <p className="text-emerald-700 font-semibold">Gửi yêu cầu rút tiền thành công!</p>
        <p className="text-xs text-emerald-600 mt-1">Chúng tôi sẽ xử lý và chuyển khoản cho bạn trong 1-2 ngày làm việc.</p>
      </div>
    );
  }

  if (qualifyingOrders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Package size={22} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">Chưa có đơn hàng đủ điều kiện</p>
        <p className="text-xs text-gray-400 mt-1">
          Đơn hàng cần: hoàn thành (DONE) · chưa rút · đủ {holdDays} ngày giữ đơn
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Order list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Clock size={13} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Đơn hàng đủ điều kiện ({qualifyingOrders.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
          {qualifyingOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{o.itemName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{o.orderCode} · {o.createdAt}</p>
              </div>
              <p className="text-sm font-semibold text-gray-800 ml-4 shrink-0" suppressHydrationWarning>{formatVnd(o.price)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fee summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2" suppressHydrationWarning>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tổng doanh thu</span>
          <span className="font-medium text-gray-800" suppressHydrationWarning>{formatVnd(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Phí dịch vụ ({feePercent}%)</span>
          <span className="text-red-500" suppressHydrationWarning>-{formatVnd(fee)}</span>
        </div>
        <div className="pt-2 border-t border-gray-200 flex justify-between">
          <span className="text-sm font-semibold text-gray-700">Thực nhận</span>
          <span className="text-base font-bold text-emerald-600" suppressHydrationWarning>{formatVnd(net)}</span>
        </div>
      </div>

      {total < minAmount && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" suppressHydrationWarning>
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-600">
            Chưa đủ số tiền tối thiểu {formatVnd(minAmount)} để rút
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={loading || !canWithdraw}
          suppressHydrationWarning
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDownToLine size={15} />
          {loading ? "Đang gửi..." : `Gửi yêu cầu rút ${formatVnd(net)}`}
        </button>
      </form>

      <p className="text-[10px] text-gray-400 text-center">
        Hệ Thống sẽ xác nhận và chuyển khoản thủ công sau 1-2 ngày làm việc
      </p>
    </div>
  );
}
