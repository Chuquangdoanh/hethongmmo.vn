"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface Props {
  userId: string;
  sellerEscrow: number;
  sellerEscrowRequired: number;
}

export default function AdminEscrowRequiredForm({ userId, sellerEscrow, sellerEscrowRequired }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(sellerEscrowRequired));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const gap = Math.max(0, Number(amount || 0) - sellerEscrow);

  async function applyRequirement() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) { setError("Số tiền không hợp lệ."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_escrow_required", amount: parsed, note: note.trim() || undefined }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
      <p className="text-xs text-gray-500 font-medium">
        Mức ký quỹ yêu cầu (hiện tại: <span className="font-medium text-gray-700">{formatVnd(sellerEscrowRequired)}</span>)
      </p>
      <p className="text-[11px] text-gray-400">
        Nâng mức này KHÔNG tự cộng tiền — seller phải tự nạp thêm từ ví để đủ điều kiện rút tiền.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="VD: 2000000"
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
        />
        <button
          onClick={applyRequirement}
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
        placeholder="Ghi chú (tùy chọn)"
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
      />
      {gap > 0 && (
        <p className="text-[11px] text-amber-600">
          Seller sẽ cần nạp thêm {formatVnd(gap)} để đủ điều kiện rút tiền sau khi áp dụng.
        </p>
      )}
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}
