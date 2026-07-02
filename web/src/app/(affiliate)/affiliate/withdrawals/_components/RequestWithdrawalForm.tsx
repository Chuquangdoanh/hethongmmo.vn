"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface QualifyingCommission {
  id: string;
  amount: number;
  customerName: string;
}

export default function RequestWithdrawalForm({ commissions }: { commissions: QualifyingCommission[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = commissions.reduce((sum, c) => sum + c.amount, 0);

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
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Tổng: <strong>{formatVnd(total)}</strong></span>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Đang gửi..." : "Yêu cầu rút toàn bộ"}
        </button>
      </div>
    </div>
  );
}
