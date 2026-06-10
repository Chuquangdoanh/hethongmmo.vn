"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShopLockAdminButton({
  requestId,
  locked,
}: {
  requestId: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sellers/${requestId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: locked ? "unlock_shop" : "lock_shop" }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Thao tác thất bại");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
        locked ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${locked ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`}></span>
        {locked ? "Đang bị khóa" : "Đang hoạt động"}
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
          locked
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
      >
        {loading ? "Đang xử lý..." : locked ? "🔓 Mở khóa shop" : "🔒 Khóa shop"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
