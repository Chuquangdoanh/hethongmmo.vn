"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reviewId: string;
  initRating: number;
  initComment: string | null;
}

export default function ReviewActions({ reviewId, initRating, initComment }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen]   = useState(false);
  const [delOpen, setDelOpen]     = useState(false);
  const [rating, setRating]       = useState(initRating);
  const [comment, setComment]     = useState(initComment ?? "");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Lỗi không xác định");
        return;
      }
      setEditOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Lỗi không xác định");
        return;
      }
      setDelOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setRating(initRating); setComment(initComment ?? ""); setError(""); setEditOpen(true); }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => { setError(""); setDelOpen(true); }}
          className="px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          Xóa
        </button>
      </div>

      {/* ── Edit modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-4">Chỉnh sửa đánh giá</h3>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1.5">Số sao</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`text-2xl transition-colors leading-none ${s <= rating ? "text-amber-400" : "text-gray-200 hover:text-amber-200"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-gray-500 mb-1">Bình luận</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-violet-500 focus:outline-none resize-none"
                placeholder="Để trống nếu không có bình luận"
              />
            </div>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {delOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDelOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-2">Xóa đánh giá?</h3>
            <p className="text-sm text-gray-500 mb-5">Hành động này không thể hoàn tác.</p>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDelOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
