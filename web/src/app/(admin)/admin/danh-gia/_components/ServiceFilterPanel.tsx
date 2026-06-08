"use client";

import { useState, useMemo } from "react";

export interface ServiceStat {
  id: string;
  name: string;
  category: string;
  reviewCount: number;
  averageRating: number;
}

type QuickFilter = "all" | "has_reviews" | "no_reviews" | "most_reviews";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all",          label: "Tất cả" },
  { id: "has_reviews",  label: "Đã có đánh giá" },
  { id: "no_reviews",   label: "Chưa có đánh giá" },
  { id: "most_reviews", label: "Nhiều đánh giá nhất" },
];

export default function ServiceFilterPanel({
  services,
  selectedId,
  totalServiceCount,
  onSelect,
  title = "Lọc theo dịch vụ",
}: {
  services: ServiceStat[];
  selectedId: string | null;
  totalServiceCount: number;
  onSelect: (id: string | null) => void;
  title?: string;
}) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const hasReviewsCount = useMemo(() => services.filter((s) => s.reviewCount > 0).length, [services]);
  const noReviewsCount  = useMemo(() => services.filter((s) => s.reviewCount === 0).length, [services]);

  const displayedServices = useMemo(() => {
    let list = [...services];
    if (quickFilter === "has_reviews")  list = list.filter((s) => s.reviewCount > 0);
    if (quickFilter === "no_reviews")   list = list.filter((s) => s.reviewCount === 0);
    if (quickFilter === "most_reviews") list = [...list].sort((a, b) => b.reviewCount - a.reviewCount);
    return list;
  }, [services, quickFilter]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {hasReviewsCount}/{services.length} có đánh giá
        </span>
      </div>

      {/* Quick filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_FILTERS.map(({ id, label }) => {
          const count = id === "has_reviews" ? hasReviewsCount : id === "no_reviews" ? noReviewsCount : null;
          return (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                quickFilter === id
                  ? "bg-[#7C3AED] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}{count !== null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Service list */}
      <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
        {/* All services option */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
            selectedId === null
              ? "bg-[#7C3AED]/10 text-[#7C3AED] font-medium"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="text-xs w-4 text-center">🔵</span>
          <span className="flex-1 text-left">Tất cả dịch vụ</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
            {totalServiceCount}
          </span>
        </button>

        {/* Individual services */}
        {displayedServices.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(selectedId === s.id ? null : s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
              selectedId === s.id
                ? "bg-[#7C3AED]/10 text-[#7C3AED] font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="text-xs w-4 text-center shrink-0">
              {s.reviewCount > 0 ? "🟢" : "⚪"}
            </span>
            <span className="flex-1 truncate text-left" title={s.name}>
              {s.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {s.reviewCount > 0 && (
                <span className="text-[10px] text-amber-500 font-medium">
                  ★{s.averageRating.toFixed(1)}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.reviewCount > 0
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {s.reviewCount}
              </span>
            </div>
          </button>
        ))}

        {displayedServices.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Không có dịch vụ nào</p>
        )}
      </div>
    </div>
  );
}
