"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GrantAffiliateForm() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!userId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra");
      setUserId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID cần cấp quyền Affiliate"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Đang xử lý..." : "Cấp quyền"}
      </button>
    </div>
  );
}
