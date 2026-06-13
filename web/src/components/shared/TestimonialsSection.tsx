"use client";

import { useState, useMemo } from "react";
import { r2Url } from "@/lib/utils/image-url";

type FilterId = "newest" | "oldest" | "all" | 1 | 2 | 3 | 4 | 5;

export interface TestimonialItem {
  id: string;
  category:         string | null;
  reviewerName:     string;
  reviewerRole:     string | null;
  reviewerAvatar:   string | null;
  reviewerInitials: string | null;
  reviewerColor:    string | null;
  content:          string;
  rating:           number;
  createdAt:        Date | string;
}

interface Props {
  items: TestimonialItem[];
  title?: string;
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "newest", label: "Mới nhất" },
  { id: "oldest", label: "Cũ nhất"  },
  { id: "all",    label: "Tất cả"   },
  { id: 5,        label: "5 ★"      },
  { id: 4,        label: "4 ★"      },
  { id: 3,        label: "3 ★"      },
  { id: 2,        label: "2 ★"      },
  { id: 1,        label: "1 ★"      },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= rating ? "text-[#f59e0b]" : "text-[#d1d5db]"}`}>★</span>
      ))}
    </div>
  );
}

export default function TestimonialsSection({ items, title = "Đánh giá trải nghiệm khách hàng" }: Props) {
  const [filter, setFilter] = useState<FilterId>("newest");

  const visible = useMemo(() => {
    let result = [...items];
    if (typeof filter === "number") {
      result = result.filter((t) => t.rating === filter);
    } else if (filter === "newest") {
      result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filter === "oldest") {
      result = result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return result;
  }, [items, filter]);

  if (items.length === 0) return null;

  return (
    <div>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
          <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={String(id)}
                onClick={() => setFilter(id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  active
                    ? { background: "#f59e0b", color: "#fff" }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review cards */}
      {visible.length === 0 ? (
        <p className="text-sm text-[#94a3b8] py-8 text-center">Chưa có đánh giá cho bộ lọc này.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {t.reviewerAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r2Url(t.reviewerAvatar)}
                      alt={t.reviewerName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: t.reviewerColor ?? "#0066ff" }}
                    >
                      {t.reviewerInitials ?? t.reviewerName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#0f172a]">{t.reviewerName}</p>
                      {t.reviewerRole && (
                        <span className="text-[10px] text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                          {t.reviewerRole}
                        </span>
                      )}
                    </div>
                    <StarRow rating={t.rating} />
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {t.category && (
                    <p className="text-[10px] text-[#7c3aed] font-medium mb-0.5">{t.category}</p>
                  )}
                  <span className="text-[11px] text-[#94a3b8]">
                    {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed pl-[52px]">{t.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
