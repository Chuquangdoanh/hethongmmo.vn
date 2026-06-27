"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { Shield, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 2_000_000];

interface Props {
  currentEscrow: number;
  userBalance: number;
  escrowMinimum: number;
}

export default function EscrowDepositForm({ currentEscrow, userBalance, escrowMinimum }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const numAmount  = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const remaining  = Math.max(0, escrowMinimum - currentEscrow);
  const afterEscrow = currentEscrow + numAmount;
  const isEligible = afterEscrow >= escrowMinimum;
  const canSubmit  = numAmount >= 10_000 && numAmount <= userBalance && !loading;

  function handleQuick(val: number) {
    setAmount(val.toString());
    setError("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(raw);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/seller/escrow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Nạp ký quỹ thất bại. Vui lòng thử lại.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={24} className="text-emerald-600" />
        </div>
        <p className="text-emerald-700 font-semibold">Nạp ký quỹ thành công!</p>
        <p className="text-xs text-emerald-600 mt-1">Số tiền ký quỹ đã được cập nhật.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Remaining notice */}
      {remaining > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Cần nạp thêm tối thiểu <span className="font-semibold">{formatVnd(remaining)}</span> để đủ điều kiện rút tiền bán hàng.
          </p>
        </div>
      )}

      {/* Quick amounts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleQuick(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              numAmount === val
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            {formatVnd(val)}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
          onChange={handleChange}
          placeholder="Nhập số tiền ký quỹ"
          className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">đ</span>
      </div>

      {/* Balance check */}
      {numAmount > userBalance && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle size={12} /> Số dư ví không đủ. Hiện tại: {formatVnd(userBalance)}
        </p>
      )}

      {/* Preview after deposit */}
      {numAmount >= 10_000 && numAmount <= userBalance && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Ký quỹ hiện tại</span>
            <span className="font-medium text-gray-700">{formatVnd(currentEscrow)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Nạp thêm</span>
            <span className="font-medium text-violet-600">+{formatVnd(numAmount)}</span>
          </div>
          <div className="pt-1.5 border-t border-gray-200 flex justify-between font-semibold">
            <span className="text-gray-700">Sau khi nạp</span>
            <span className={isEligible ? "text-emerald-600" : "text-amber-600"}>
              {formatVnd(afterEscrow)} {isEligible ? "✓ Đủ điều kiện" : `(thiếu ${formatVnd(escrowMinimum - afterEscrow)})`}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <Shield size={15} />
        {loading ? "Đang xử lý..." : `Nạp ký quỹ${numAmount >= 10_000 ? ` ${formatVnd(numAmount)}` : ""}`}
        {!loading && <ArrowRight size={14} />}
      </button>

      <p className="text-[11px] text-gray-400 text-center">
        Tiền ký quỹ được giữ để đảm bảo hoạt động bán hàng và không thể rút lại.
      </p>
    </form>
  );
}
