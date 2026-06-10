"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";

const PRICE_RANGES = [
  { label: "Dưới 100.000đ",         value: "0-100000"           },
  { label: "100.000đ - 500.000đ",   value: "100000-500000"      },
  { label: "500.000đ - 1.000.000đ", value: "500000-1000000"     },
  { label: "Trên 1.000.000đ",       value: "1000000-9999999999" },
] as const;

export interface CategoryItem {
  name: string;
  count: number;
  iconUrl: string | null;
}

interface FilterSidebarProps {
  categories: CategoryItem[];
  totalCount: number;
}

export function FilterSidebar({ categories, totalCount }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  // eslint-disable-next-line react-hooks/refs
  searchParamsRef.current = searchParams;

  const [isPending, startTransition] = useTransition();

  const activeCategory = searchParams.get("category") ?? "";
  const priceParam     = searchParams.get("price")    ?? "";
  const qParam         = searchParams.get("q")        ?? "";

  const [searchValue, setSearchValue] = useState(qParam);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchValue(qParam); }, [qParam]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const trimmed = searchValue.trim();
      if (trimmed) params.set("q", trimmed); else params.delete("q");
      params.delete("page");
      startTransition(() => {
        router.replace(`/tai-nguyen-mmo?${params.toString()}`, { scroll: false });
      });
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.replace(`/tai-nguyen-mmo?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <aside
      className="w-full lg:w-70 lg:shrink-0 lg:sticky lg:top-24 self-start"
      aria-busy={isPending}
    >
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-light border-b border-border">
          <SlidersHorizontal size={14} className="text-[#64748b]" />
          <span className="text-sm font-bold text-text-dark">Bộ lọc sản phẩm</span>
        </div>

        <div className="divide-y divide-[#f1f5f9]">

          {/* Search */}
          <div className="px-4 py-4">
            <p className="text-[13px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Tìm kiếm</p>
            <div className="relative">
              <Search size={17} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Nhập tên sản phẩm..."
                className="w-full pl-9 pr-6 py-2 text-sm rounded-lg border border-border bg-light text-text-dark placeholder-[#94a3b8] focus:border-[#3b82f6] focus:bg-white focus:outline-none transition-all"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-4">
            <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Danh mục</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!activeCategory}
                  onChange={() => setParam("category", "")}
                  className="w-5 h-5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer shrink-0"
                />
                <span className={`text-lg flex-1 transition-colors ${!activeCategory ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                  Tất cả sản phẩm
                </span>
                <span className="text-base text-[#94a3b8] shrink-0" suppressHydrationWarning>{totalCount.toLocaleString("vi-VN")}</span>
              </label>
              {categories.map(({ name, count, iconUrl }) => (
                <label key={name} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeCategory === name}
                    onChange={() => setParam("category", activeCategory === name ? "" : name)}
                    className="w-5 h-5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer shrink-0"
                  />
                  {iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r2Url(iconUrl)}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                      className="w-5 h-5 rounded object-contain shrink-0"
                    />
                  )}
                  <span className={`text-lg flex-1 truncate transition-colors ${activeCategory === name ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {name}
                  </span>
                  <span className="text-base text-[#94a3b8] shrink-0" suppressHydrationWarning>{count.toLocaleString("vi-VN")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="px-4 py-4">
            <p className="text-[13px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Khoảng giá</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="price"
                  checked={!priceParam}
                  onChange={() => setParam("price", "")}
                  className="w-[18px] h-[18px] border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                />
                <span className={`text-sm transition-colors ${!priceParam ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                  Tất cả mức giá
                </span>
              </label>
              {PRICE_RANGES.map((r) => (
                <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="price"
                    checked={priceParam === r.value}
                    onChange={() => setParam("price", r.value)}
                    className="w-[18px] h-[18px] border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                  />
                  <span className={`text-sm transition-colors ${priceParam === r.value ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>
    </aside>
  );
}
