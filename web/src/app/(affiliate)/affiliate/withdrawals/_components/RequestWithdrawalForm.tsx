"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface QualifyingCommission {
  id: string;
  amount: number;
  customerName: string;
}

interface Props {
  commissions: QualifyingCommission[];
  feePercent: number;
  minAmount: number;
  hasBankInfo: boolean;
}

export default function RequestWithdrawalForm({ commissions, feePercent, minAmount, hasBankInfo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = commissions.reduce((sum, c) => sum + c.amount, 0);
  const feeAmount = Math.floor((total * feePercent) / 100);
  const netTotal = total - feeAmount;
  const belowMinimum = total < minAmount;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/withdrawals", { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  if (commissions.length === 0) {
    return <p className="text-sm text-gray-400">Không có hoa hồng nào đủ điều kiện rút.</p>;
  }

  const disabledReason = !hasBankInfo
    ? "Vui lòng đăng ký thông tin ngân hàng trước khi rút hoa hồng"
    : belowMinimum
      ? `Số tiền chưa đạt mức tối thiểu ${formatVnd(minAmount)}`
      : null;

  return (
    <div className="space-y-3">
      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {commissions.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{c.customerName}</span>
            <span className="font-medium text-violet-600">{formatVnd(c.amount)}</span>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {disabledReason && <p className="text-sm text-amber-600">{disabledReason}</p>}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>Tổng: <strong>{formatVnd(total)}</strong></p>
          {feePercent > 0 && (
            <p className="text-xs text-gray-400">
              Phí {feePercent}% (-{formatVnd(feeAmount)}) → Thực nhận <strong>{formatVnd(netTotal)}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={loading || !!disabledReason}
          onClick={handleSubmit}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Đang gửi..." : "Yêu cầu rút toàn bộ"}
        </button>
      </div>
    </div>
  );
}
