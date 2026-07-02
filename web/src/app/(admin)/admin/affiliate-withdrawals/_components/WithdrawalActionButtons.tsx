"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalActionButtons({ withdrawalId, status }: { withdrawalId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "APPROVE" | "REJECT" | "COMPLETE") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate-withdrawals/${withdrawalId}`, {
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

  if (status === "PENDING") {
    return (
      <div className="flex gap-2">
        <button type="button" disabled={loading} onClick={() => handleAction("APPROVE")} className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Duyệt</button>
        <button type="button" disabled={loading} onClick={() => handleAction("REJECT")} className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Từ chối</button>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <button type="button" disabled={loading} onClick={() => handleAction("COMPLETE")} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Xác nhận đã chuyển</button>
    );
  }
  return <span className="text-xs text-gray-400">—</span>;
}
