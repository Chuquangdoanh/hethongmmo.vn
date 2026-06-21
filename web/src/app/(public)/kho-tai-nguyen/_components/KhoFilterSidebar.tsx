"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";

export interface PlatformItem { name: string; count: number; }
export interface TypeItem { id: string; name: string; count: number; }

interface Props {
  platforms: PlatformItem[];
  resourceTypes: TypeItem[];
}

const MIN_SLIDER_MIN = 10_000;
const MIN_SLIDER_MAX = 500_000;
const MIN_SLIDER_STEP = 10_000;
const MIN_SLIDER_DEFAULT = 10_000;

// Non-linear max price: 100k→1tr step 100k (60% of track), 1tr→10tr step 2tr (40% of track)
const MAX_PRICE_VALUES = [
  100_000, 200_000, 300_000, 400_000, 500_000,
  600_000, 700_000, 800_000, 900_000, 1_000_000,   // indices 0-9  → 64% of track at 1tr
  3_000_000, 5_000_000, 7_000_000, 9_000_000, 10_000_000, // indices 10-14 → 36% of track
] as const;

const MAX_PRICE_LAST_IDX = MAX_PRICE_VALUES.length - 1; // 14

function findNearestMaxIdx(price: number): number {
  let nearest = MAX_PRICE_LAST_IDX;
  let minDiff = Infinity;
  MAX_PRICE_VALUES.forEach((v, i) => {
    const diff = Math.abs(v - price);
    if (diff < minDiff) { minDiff = diff; nearest = i; }
  });
  return nearest;
}

const DEBOUNCE_MS = 400;

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${n % 1_000_000 === 0 ? n / 1_000_000 : (n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000) return `${n % 1_000 === 0 ? n / 1_000 : (n / 1_000).toFixed(0)}k`;
  return `${n}đ`;
}

function StarRow({ filled }: { filled: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= filled ? "text-[#f59e0b]" : "text-[#d1d5db]"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function KhoFilterSidebar(_props: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMounted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spRef = useRef(sp);
  spRef.current = sp;

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [minPrice, setMinPrice] = useState(() => {
    const p = sp.get("price");
    if (!p) return MIN_SLIDER_DEFAULT;
    const v = Number(p.split("-")[0]);
    if (isNaN(v) || v < MIN_SLIDER_MIN) return MIN_SLIDER_DEFAULT;
    return Math.min(v, MIN_SLIDER_MAX);
  });
  const [maxPriceIdx, setMaxPriceIdx] = useState(() => {
    const p = sp.get("price");
    if (!p) return MAX_PRICE_LAST_IDX;
    const parts = p.split("-");
    const v = Number(parts[1]);
    if (isNaN(v) || v >= 9_999_999_999) return MAX_PRICE_LAST_IDX;
    return findNearestMaxIdx(v);
  });
  const [rating, setRating] = useState(() => {
    const r = sp.get("rating");
    return r ? Math.max(1, Math.min(5, Number(r))) : 0;
  });

  const maxPrice = MAX_PRICE_VALUES[maxPriceIdx] ?? MAX_PRICE_VALUES[MAX_PRICE_LAST_IDX]!;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      const sort = spRef.current.get("sort");
      const category = spRef.current.get("category");
      const subcategory = spRef.current.get("subcategory");
      if (sort) params.set("sort", sort);
      if (category) params.set("category", category);
      if (subcategory) params.set("subcategory", subcategory);
      if (q.trim()) params.set("q", q.trim());
      const isMinActive = minPrice > MIN_SLIDER_DEFAULT;
      const isMaxActive = maxPriceIdx < MAX_PRICE_LAST_IDX;
      if (isMinActive || isMaxActive) params.set("price", `${minPrice}-${maxPrice}`);
      if (rating > 0) params.set("rating", String(rating));
      startTransition(() => router.replace(`/kho-tai-nguyen?${params.toString()}`, { scroll: false }));
    }, DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q, minPrice, maxPriceIdx, rating]);

  function reset() {
    setQ("");
    setMinPrice(MIN_SLIDER_DEFAULT);
    setMaxPriceIdx(MAX_PRICE_LAST_IDX);
    setRating(0);
  }

  const minPct = ((minPrice - MIN_SLIDER_MIN) / (MIN_SLIDER_MAX - MIN_SLIDER_MIN)) * 100;
  const maxPct = (maxPriceIdx / MAX_PRICE_LAST_IDX) * 100;

  const inputCls =
    "w-full px-3 py-[9px] border border-[#e5e7eb] rounded-lg text-sm text-[#374151] placeholder-[#9ca3af] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/10 transition-colors bg-[#f9fafb]";

  return (
    <aside className="hidden lg:block lg:w-72 shrink-0 self-start lg:sticky lg:top-24">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">

        {/* Header — tappable on mobile to toggle */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3.5 bg-[#f8fafc] border-b border-[#e5e7eb] lg:cursor-default"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[#64748b]" />
            <span className="text-sm font-semibold text-[#0f172a]">Bộ lọc</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-[#64748b] transition-transform duration-200 lg:hidden ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Body — ẩn trên mobile khi chưa mở, luôn hiện trên lg */}
        <div className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
        <div className="px-4 py-4 space-y-5">

          {/* Tìm kiếm realtime */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Tìm kiếm</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên sản phẩm..."
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          {/* Khoảng giá */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-3">Khoảng giá</p>

            {/* Min slider — 10k đến 500k, step 10k */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-[#64748b]">Tối thiểu</span>
                <span className="text-xs font-bold text-[#0f172a] bg-[#f1f5f9] px-1.5 py-0.5 rounded-md">{fmtShort(minPrice)}</span>
              </div>
              <input
                type="range"
                min={MIN_SLIDER_MIN}
                max={MIN_SLIDER_MAX}
                step={MIN_SLIDER_STEP}
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#6366f1]"
                style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${minPct}%, #e2e8f0 ${minPct}%, #e2e8f0 100%)` }}
              />
              <div className="flex justify-between text-[10px] text-[#9ca3af] mt-1">
                <span>10k</span><span>500k</span>
              </div>
            </div>

            {/* Max slider — 100k→1tr (step 100k) + 1tr→10tr (step 2tr), non-linear */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-[#64748b]">Tối đa</span>
                <span className="text-xs font-bold text-[#0f172a] bg-[#f1f5f9] px-1.5 py-0.5 rounded-md">
                  {maxPriceIdx >= MAX_PRICE_LAST_IDX ? "Không giới hạn" : fmtShort(maxPrice)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MAX_PRICE_LAST_IDX}
                step={1}
                value={maxPriceIdx}
                onChange={(e) => setMaxPriceIdx(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#6366f1]"
                style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${maxPct}%, #e2e8f0 ${maxPct}%, #e2e8f0 100%)` }}
              />
              <div className="flex justify-between text-[10px] text-[#9ca3af] mt-1">
                <span>100k</span><span>10tr</span>
              </div>
            </div>
          </div>

          {/* Đánh giá */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-2">Đánh giá</p>
            <div className="space-y-1">
              {([5, 4, 3, 2, 1] as const).map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left border ${
                    rating === star
                      ? "bg-[#fef9c3] border-[#fde047]"
                      : "border-transparent hover:bg-[#f8fafc] hover:border-[#e5e7eb]"
                  }`}
                >
                  <StarRow filled={star} />
                  <span className="text-[12px] text-[#374151] leading-none">
                    {star === 5 ? "5 sao" : `${star} sao trở lên`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Đặt lại */}
          <button
            onClick={reset}
            className="w-full text-sm text-[#64748b] hover:text-[#374151] text-center transition-colors py-1 border border-[#e5e7eb] rounded-lg hover:border-[#9ca3af]"
          >
            Đặt lại bộ lọc
          </button>

        </div>
        </div>{/* end collapsible body */}
      </div>
    </aside>
  );
}
