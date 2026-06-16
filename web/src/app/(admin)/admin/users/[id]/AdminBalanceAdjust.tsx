"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface Props {
  userId: string;
  balance: number;
}

export default function AdminBalanceAdjust({ userId, balance }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function adjustBalance() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) { setError("Số tiền không hợp lệ."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adjust_balance", amount: parsed, note: note.trim() || undefined }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <p className="text-xs text-gray-500 font-medium">
        Điều chỉnh số dư (hiện tại: <span className="font-medium text-gray-700">{formatVnd(balance)}</span>)
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="VD: 50000 hoặc -50000"
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
        />
        <button
          onClick={adjustBalance}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-[#7C3AED] text-white text-xs hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
        >
          {loading ? "..." : "Áp dụng"}
        </button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú (bắt buộc)"
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
      />
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}
