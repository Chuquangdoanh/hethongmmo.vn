"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubCategoryItem {
  id: string;
  name: string;
  categoryName: string;
}

interface Props {
  requestId: string;
  category: string;
  subCategories?: SubCategoryItem[];
}

export default function SellerApproveForm({ requestId, category, subCategories = [] }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [approvedCategory, setApprovedCategory] = useState(category);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    if (action === "reject" && !rejectReason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sellers/${requestId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve"
            ? { action: "approve", approvedCategory }
            : { action: "reject", rejectReason: rejectReason.trim() },
        ),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.push("/admin/sellers");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Xử lý yêu cầu</h2>

      {/* Sub-categories requested */}
      {subCategories.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Danh mục con đăng ký</p>
          <div className="flex flex-wrap gap-1.5">
            {subCategories.map((sub) => (
              <span
                key={sub.id}
                className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium px-2.5 py-0.5"
              >
                {sub.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAction("approve")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            action === "approve"
              ? "bg-[#10B981] text-white"
              : "border border-gray-200 text-gray-500 hover:border-[#10B981] hover:text-[#10B981]"
          }`}
        >
          ✅ Phê duyệt
        </button>
        <button
          type="button"
          onClick={() => setAction("reject")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            action === "reject"
              ? "bg-[#EF4444] text-white"
              : "border border-gray-200 text-gray-500 hover:border-[#EF4444] hover:text-[#EF4444]"
          }`}
        >
          ❌ Từ chối
        </button>
      </div>

      {action === "approve" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Danh mục phê duyệt</label>
            <input
              type="text"
              value={approvedCategory}
              onChange={(e) => setApprovedCategory(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-[#EF4444]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#10B981] text-white text-sm font-semibold hover:bg-green-500 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : "Xác nhận phê duyệt"}
          </button>
        </form>
      )}

      {action === "reject" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Lý do từ chối *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none resize-none"
              placeholder="Nhập lý do từ chối..."
            />
          </div>
          {error && <p className="text-xs text-[#EF4444]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </form>
      )}
    </div>
  );
}
