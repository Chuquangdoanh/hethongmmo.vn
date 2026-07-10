"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  productName: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export default function ApprovalButton({ productId, productName, approvalStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function submit(status: "APPROVED" | "REJECTED") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/seller-products/${productId}/approval`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "REJECTED" ? { status, rejectReason: reason } : { status }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Lỗi không xác định");
        return;
      }
      setShowReject(false);
      setReason("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {approvalStatus !== "APPROVED" && (
          <button
            type="button"
            onClick={() => submit("APPROVED")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "..." : "✓ Duyệt"}
          </button>
        )}
        {approvalStatus !== "REJECTED" && (
          <button
            type="button"
            onClick={() => { setError(""); setShowReject(true); }}
            className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            ✕ Từ chối
          </button>
        )}
      </div>

      {showReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowReject(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-gray-800 mb-1">Từ chối sản phẩm</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">&quot;{productName}&quot;</p>
            <div className="mb-4">
              <label className="text-[11px] font-medium text-gray-500 block mb-1">Lý do từ chối</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Nội dung không phù hợp, thiếu thông tin bảo hành..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-400 focus:outline-none resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={() => submit("REJECTED")}
                disabled={loading || !reason.trim()}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
