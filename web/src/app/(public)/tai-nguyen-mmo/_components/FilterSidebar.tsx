"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";

export interface SubCategoryItem {
  id: string;
  name: string;
  count?: number;
}

export interface CategoryItem {
  name: string;
  count: number;
  iconUrl: string | null;
  subCategories: SubCategoryItem[];
}

interface FilterSidebarProps {
  categories: CategoryItem[];
  totalCount: number;
  basePath?: string;
}

const HOT_TAGS = [
  "facebook", "tiktok", "chatgpt", "account",
  "proxy", "netflix", "adobe", "capcut",
];

export function FilterSidebar({ categories, basePath = "/tai-nguyen-mmo" }: FilterSidebarProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [subcategory, setSubcategory] = useState(sp.get("subcategory") ?? "");
  const [tag, setTag] = useState(sp.get("tag") ?? "");
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
  const [currency, setCurrency] = useState(sp.get("currency") ?? "");

  const selectedCat = categories.find((c) => c.name === category);

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tag.trim()) params.set("tag", tag.trim());
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (minPrice || maxPrice) {
      const min = Math.max(0, Number(minPrice) || 0);
      const max = Number(maxPrice) || 9_999_999_999;
      params.set("price", `${min}-${max}`);
    }
    if (currency) params.set("currency", currency);
    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  function reset() {
    setQ(""); setTag(""); setCategory(""); setSubcategory(""); setMinPrice(""); setMaxPrice(""); setCurrency("");
    startTransition(() => router.replace(basePath, { scroll: false }));
  }

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
                placeholder="raspberry pi, account, boost"
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          {/* Danh mục */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Danh mục</p>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}
                className={`${inputCls} pr-9 appearance-none cursor-pointer`}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </div>

          {/* Danh mục con (conditional) */}
          {selectedCat && selectedCat.subCategories.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#374151] mb-1.5">Danh mục con</p>
              <div className="relative">
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className={`${inputCls} pr-9 appearance-none cursor-pointer`}
                >
                  <option value="">Tất cả</option>
                  {selectedCat.subCategories.map((sub) => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Thẻ */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Thẻ</p>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="raid"
              className={inputCls}
            />
          </div>

          {/* Số tiền tối thiểu */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Số tiền tối thiểu</p>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              min="0"
              className={inputCls}
            />
          </div>

          {/* Số tiền tối đa */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Số tiền tối đa</p>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Không giới hạn"
              min="0"
              className={inputCls}
            />
          </div>

          {/* Tiền tệ */}
          <div>
            <p className="text-sm font-medium text-[#374151] mb-1.5">Tiền tệ</p>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${inputCls} pr-9 appearance-none cursor-pointer`}
              >
                <option value="">Tất cả tiền tệ</option>
                <option value="VND">VNĐ (đ)</option>
                <option value="USD">USD ($)</option>
              </select>
              <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </div>

          {/* Chỉ còn hàng */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-[#d1d5db] accent-[#6366f1] cursor-pointer"
            />
            <span className="text-sm text-[#374151]">Chỉ còn hàng</span>
          </label>

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

        {/* Thẻ đang hot */}
        <div className="px-4 pb-4 border-t border-[#f1f5f9] pt-4">
          <p className="text-sm font-semibold text-[#0f172a] mb-2.5">Thẻ đang hot</p>
          <div className="flex flex-wrap gap-2">
            {HOT_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className="px-2.5 py-1 text-[13px] bg-[#f1f5f9] border border-[#e2e8f0] rounded-full text-[#334155] hover:bg-[#e2e8f0] transition-colors"
              >
                #{t}
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}
