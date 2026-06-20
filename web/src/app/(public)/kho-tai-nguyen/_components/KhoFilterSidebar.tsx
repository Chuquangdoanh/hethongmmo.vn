"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";

export interface PlatformItem { name: string; count: number; }
export interface TypeItem { id: string; name: string; count: number; }

// Props kept for page compatibility
interface Props {
  platforms: PlatformItem[];
  resourceTypes: TypeItem[];
}

const MIN_PRICES = [
  { value: "", label: "Tối thiểu" },
  { value: "0", label: "0đ" },
  { value: "1000", label: "1.000đ" },
  { value: "5000", label: "5.000đ" },
  { value: "10000", label: "10.000đ" },
  { value: "50000", label: "50.000đ" },
  { value: "100000", label: "100.000đ" },
  { value: "200000", label: "200.000đ" },
  { value: "500000", label: "500.000đ" },
];

const MAX_PRICES = [
  { value: "", label: "Không giới hạn" },
  { value: "5000", label: "5.000đ" },
  { value: "10000", label: "10.000đ" },
  { value: "50000", label: "50.000đ" },
  { value: "100000", label: "100.000đ" },
  { value: "200000", label: "200.000đ" },
  { value: "500000", label: "500.000đ" },
  { value: "1000000", label: "1.000.000đ" },
  { value: "5000000", label: "5.000.000đ" },
];

export function KhoFilterSidebar(_props: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [minPrice, setMinPrice] = useState(() => {
    const p = sp.get("price");
    if (!p) return "";
    return p.split("-")[0] ?? "";
  });
  const [maxPrice, setMaxPrice] = useState(() => {
    const p = sp.get("price");
    if (!p) return "";
    const parts = p.split("-");
    return (parts[1] && Number(parts[1]) < 9_999_999_999) ? parts[1] : "";
  });

  function apply() {
    const params = new URLSearchParams();
    const sort = sp.get("sort");
    if (sort) params.set("sort", sort);
    if (q.trim()) params.set("q", q.trim());
    if (minPrice || maxPrice) {
      const min = Number(minPrice) || 0;
      const max = Number(maxPrice) || 9_999_999_999;
      params.set("price", `${min}-${max}`);
    }
    startTransition(() => {
      router.replace(`/kho-tai-nguyen?${params.toString()}`, { scroll: false });
    });
  }

  function reset() {
    setQ(""); setMinPrice(""); setMaxPrice("");
    startTransition(() => router.replace("/kho-tai-nguyen", { scroll: false }));
  }

  const selectCls =
    "w-full px-3 py-[9px] pr-9 border border-[#e5e7eb] rounded-lg text-sm text-[#374151] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/10 appearance-none bg-[#f9fafb] cursor-pointer transition-colors";
  const inputCls =
    "w-full px-3 py-[9px] border border-[#e5e7eb] rounded-lg text-sm text-[#374151] placeholder-[#9ca3af] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/10 transition-colors bg-[#f9fafb]";

  return (
    <aside className="w-72 shrink-0 self-start sticky top-24">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3.5 bg-[#f8fafc] border-b border-[#e5e7eb]">
          <SlidersHorizontal size={15} className="text-[#64748b]" />
          <span className="text-sm font-semibold text-[#0f172a]">Bộ lọc</span>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* Tìm kiếm */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Tìm kiếm</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                placeholder="Tìm theo tên sản phẩm..."
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          {/* Số tiền tối thiểu */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Số tiền tối thiểu</p>
            <div className="relative">
              <select
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className={selectCls}
              >
                {MIN_PRICES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </div>

          {/* Số tiền tối đa */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Số tiền tối đa</p>
            <div className="relative">
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={selectCls}
              >
                {MAX_PRICES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </div>

          {/* Tìm kiếm button */}
          <button
            onClick={apply}
            className="w-full flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#0d1117] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Search size={14} />
            Tìm kiếm
          </button>

          {/* Đặt lại */}
          <button
            onClick={reset}
            className="w-full text-sm text-[#64748b] hover:text-[#374151] text-center transition-colors py-0.5"
          >
            Đặt lại bộ lọc
          </button>

        </div>
      </div>
    </aside>
  );
}
