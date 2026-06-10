"use client";

import { useState } from "react";

interface ReviewStat {
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: string;
}

interface Props {
  productType: "MMO_PRODUCT" | "SELLER_PRODUCT";
  productId: string;
  orderId: string | null;  // null = user hasn't purchased this product
  avgRating: number;
  reviewCount: number;
  recentReviews: ReviewStat[];
  myReview: { rating: number; comment: string | null } | null;
}

function StarPicker({
  value,
  onChange,
  readonly,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const dims = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-7 h-7" : "w-5 h-5";

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${dims} transition-colors ${s <= active ? "text-[#f59e0b]" : "text-[#d1d5db]"} ${!readonly ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHovered(s)}
          onMouseLeave={() => !readonly && setHovered(0)}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời"];

export default function ReviewSection({
  productType: _productType,
  productId: _productId,
  orderId,
  avgRating,
  reviewCount,
  recentReviews,
  myReview,
}: Props) {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(!!myReview);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Vui lòng chọn số sao."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/reviews", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment: comment.trim() || undefined }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi đánh giá thất bại."); return; }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0f172a]">Đánh giá sản phẩm</h2>
        {reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarPicker value={Math.round(avgRating)} readonly size="sm" />
            <span className="text-sm font-bold text-[#0f172a]">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-[#64748b]">({reviewCount} đánh giá)</span>
          </div>
        )}
      </div>

      {/* Rating form */}
      {orderId && (
        <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
          {submitted ? (
            <div className="flex items-center gap-3">
              <StarPicker value={rating} readonly size="md" />
              <span className="text-sm text-[#16a34a] font-medium">
                ✅ Cảm ơn bạn đã đánh giá!
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs font-medium text-[#475569]">Bạn đã mua sản phẩm này — hãy để lại đánh giá:</p>
              <div className="flex items-center gap-3">
                <StarPicker value={rating} onChange={setRating} size="lg" />
                {rating > 0 && (
                  <span className="text-sm font-medium text-[#f59e0b]">{STAR_LABELS[rating]}</span>
                )}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Nhận xét về sản phẩm (không bắt buộc)..."
                className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0d9488] focus:outline-none resize-none"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="px-4 py-2 rounded-lg bg-[#0d9488] text-white text-xs font-semibold hover:bg-[#0f766e] disabled:opacity-50 transition-colors"
              >
                {loading ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          )}
        </div>
      )}

      {!orderId && (
        <p className="text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-4 py-3 border border-[#e2e8f0]">
          Chỉ người đã mua sản phẩm mới có thể đánh giá.
        </p>
      )}

      {/* Review list */}
      {recentReviews.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Nhận xét gần đây</p>
          {recentReviews.map((r, i) => (
            <div key={i} className="flex gap-3 py-3 border-t border-[#f1f5f9]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0284c7] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {r.userName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#0f172a]">{r.userName}</span>
                  <StarPicker value={r.rating} readonly size="sm" />
                  <span className="text-[10px] text-[#94a3b8]">{r.createdAt}</span>
                </div>
                {r.comment && (
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed">{r.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewCount === 0 && !orderId && (
        <p className="text-xs text-[#94a3b8] text-center py-2">Chưa có đánh giá nào.</p>
      )}
    </div>
  );
}
