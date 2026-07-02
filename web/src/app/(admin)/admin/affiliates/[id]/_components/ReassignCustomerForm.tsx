"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReassignCustomerForm({ affiliateId }: { affiliateId: string }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [newAffiliateId, setNewAffiliateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!customerId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/reassign-customer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId.trim(), newAffiliateId: newAffiliateId.trim() || null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra");
      setCustomerId("");
      setNewAffiliateId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Chuyển khách hàng sang Affiliate khác hoặc gỡ liên kết (để trống Affiliate mới = gỡ liên kết).
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="Customer User ID"
          className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={newAffiliateId}
          onChange={(e) => setNewAffiliateId(e.target.value)}
          placeholder="Affiliate ID mới (để trống = gỡ)"
          className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Cập nhật liên kết"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
