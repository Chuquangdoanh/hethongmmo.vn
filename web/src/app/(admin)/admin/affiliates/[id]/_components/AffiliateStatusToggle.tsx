"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AffiliateStatusToggle({ affiliateId, status }: { affiliateId: string; status: "ACTIVE" | "LOCKED" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const nextStatus = status === "ACTIVE" ? "LOCKED" : "ACTIVE";
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateStatus: nextStatus }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleToggle}
      className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
        status === "ACTIVE" ? "bg-red-600" : "bg-green-600"
      }`}
    >
      {loading ? "Đang xử lý..." : status === "ACTIVE" ? "Khóa Affiliate" : "Mở khóa Affiliate"}
    </button>
  );
}
