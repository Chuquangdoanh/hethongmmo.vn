"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  productName: string;
  isRestricted: boolean;
}

export default function RestrictButton({ productId, productName, isRestricted }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");

  async function handleToggle() {
    setLoading(true);
    try {
      const body = isRestricted
        ? { isRestricted: false }
        : { isRestricted: true, restrictReason: reason };

      const res = await fetch(`/api/admin/seller-products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowConfirm(false);
        setReason("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (isRestricted) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? "..." : "✓ Bỏ hạn chế"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
      >
        🚫 Hạn chế
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-gray-800 mb-1">Hạn chế sản phẩm</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">&quot;{productName}&quot;</p>
            <div className="mb-4">
              <label className="text-[11px] font-medium text-gray-500 block mb-1">Lý do (tuỳ chọn)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Vi phạm quy định, nội dung không phù hợp..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleToggle}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Đang xử lý..." : "Xác nhận hạn chế"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
