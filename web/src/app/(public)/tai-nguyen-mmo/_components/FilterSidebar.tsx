"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

const PRICE_RANGES = [
  { label: "Dưới 100.000đ",         value: "0-100000"           },
  { label: "100.000đ - 500.000đ",   value: "100000-500000"      },
  { label: "500.000đ - 1.000.000đ", value: "500000-1000000"     },
  { label: "Trên 1.000.000đ",       value: "1000000-9999999999" },
] as const;

const SORT_OPTIONS = [
  { id: "noi-bat",  label: "Nổi Bật"  },
  { id: "ban-chay", label: "Bán Chạy" },
  { id: "moi-nhat", label: "Mới Nhất" },
  { id: "gia-cao",  label: "Giá Cao"  },
  { id: "gia-thap", label: "Giá Thấp" },
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
  searchParamsRef.current = searchParams;

  const activeCategory = searchParams.get("category") ?? "";
  const priceParam     = searchParams.get("price")    ?? "";
  const activeSort     = searchParams.get("sort")     ?? "noi-bat";
  const qParam         = searchParams.get("q")        ?? "";

  const [searchValue, setSearchValue] = useState(qParam);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearchValue(qParam); }, [qParam]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const trimmed = searchValue.trim();
      if (trimmed) params.set("q", trimmed); else params.delete("q");
      router.push(`/tai-nguyen-mmo?${params.toString()}`, { scroll: false });
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchValue, router]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/tai-nguyen-mmo?${params.toString()}`, { scroll: false });
  }

  return (
    <aside className="w-full lg:w-52 lg:shrink-0 lg:sticky lg:top-24 self-start">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-light border-b border-border">
          <SlidersHorizontal size={14} className="text-[#64748b]" />
          <span className="text-sm font-bold text-text-dark">Bộ lọc sản phẩm</span>
        </div>

        <div className="divide-y divide-[#f1f5f9]">

          {/* Search */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Tìm kiếm</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Nhập tên sản phẩm..."
                className="w-full pl-8 pr-6 py-2 text-xs rounded-lg border border-border bg-light text-text-dark placeholder-[#94a3b8] focus:border-[#3b82f6] focus:bg-white focus:outline-none transition-all"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Danh mục</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!activeCategory}
                  onChange={() => setParam("category", "")}
                  className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                />
                <span className={`text-xs flex-1 transition-colors ${!activeCategory ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                  Tất cả sản phẩm
                </span>
                <span className="text-[10px] text-[#94a3b8] shrink-0" suppressHydrationWarning>{totalCount.toLocaleString("vi-VN")}</span>
              </label>
              {categories.map(({ name, count, iconUrl }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeCategory === name}
                    onChange={() => setParam("category", activeCategory === name ? "" : name)}
                    className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                  />
                  {iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconUrl}
                      alt=""
                      width={14}
                      height={14}
                      loading="lazy"
                      decoding="async"
                      className="w-3.5 h-3.5 rounded object-contain shrink-0"
                    />
                  )}
                  <span className={`text-xs flex-1 truncate transition-colors ${activeCategory === name ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {name}
                  </span>
                  <span className="text-[10px] text-[#94a3b8] shrink-0" suppressHydrationWarning>{count.toLocaleString("vi-VN")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Khoảng giá</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="price"
                  checked={!priceParam}
                  onChange={() => setParam("price", "")}
                  className="w-3.5 h-3.5 border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                />
                <span className={`text-xs transition-colors ${!priceParam ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                  Tất cả mức giá
                </span>
              </label>
              {PRICE_RANGES.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="price"
                    checked={priceParam === r.value}
                    onChange={() => setParam("price", r.value)}
                    className="w-3.5 h-3.5 border-[#d1d5db] accent-[#3b82f6] cursor-pointer"
                  />
                  <span className={`text-xs transition-colors ${priceParam === r.value ? "font-semibold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Sắp xếp</p>
            <select
              value={activeSort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-light text-[#374151] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </aside>
  );
}
