"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommissionActionButtons({ commissionId, status }: { commissionId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "APPROVE" | "VOID") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate-commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status !== "PENDING") return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction("APPROVE")}
        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        Duyệt
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction("VOID")}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        Hủy
      </button>
    </div>
  );
}
