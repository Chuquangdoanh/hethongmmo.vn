"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FolderOpen } from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";

export interface FilterSubCategory {
  id: string;
  name: string;
  count: number;
}

export interface FilterCategory {
  name: string;
  iconUrl: string | null;
  count: number;
  subCategories: FilterSubCategory[];
}

interface Props {
  categories: FilterCategory[];
  basePath: string;
}

export function CategoryFilter({ categories, basePath }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedCat = sp.get("category") ?? "";
  const subcatParam = sp.get("subcategory") ?? "";
  const selectedSubcats = subcatParam ? subcatParam.split(",").filter(Boolean) : [];

  const activeCatData = categories.find((c) => c.name === selectedCat);
  const subcats = activeCatData?.subCategories ?? [];

  function sidebarParams(): URLSearchParams {
    const p = new URLSearchParams();
    const sort = sp.get("sort");
    const q = sp.get("q");
    const price = sp.get("price");
    const rating = sp.get("rating");
    if (sort) p.set("sort", sort);
    if (q) p.set("q", q);
    if (price) p.set("price", price);
    if (rating) p.set("rating", rating);
    return p;
  }

  function go(params: URLSearchParams) {
    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  function selectCategory(name: string) {
    const p = sidebarParams();
    if (selectedCat !== name) p.set("category", name);
    // switching category always resets subcategory
    go(p);
  }

  function clearAll() {
    go(sidebarParams());
  }

  function clearSubcats() {
    const p = sidebarParams();
    if (selectedCat) p.set("category", selectedCat);
    go(p);
  }

  function toggleSubcat(name: string) {
    const p = sidebarParams();
    if (selectedCat) p.set("category", selectedCat);
    const next = selectedSubcats.includes(name)
      ? selectedSubcats.filter((n) => n !== name)
      : [...selectedSubcats, name];
    if (next.length > 0) p.set("subcategory", next.join(","));
    go(p);
  }

  const noCat = !selectedCat;

  return (
    <div className={`flex flex-col gap-3 transition-opacity duration-150 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

      {/* ── Hàng danh mục cha ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-1">
          <p className="text-[13px] font-bold text-[#1e293b] tracking-wide uppercase opacity-50">Danh mục</p>
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-3 sm:pb-3.5">

          {/* Tất cả */}
          <button
            type="button"
            onClick={clearAll}
            className={`flex shrink-0 items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border text-[12px] sm:text-[13px] font-semibold transition-all ${
              noCat
                ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8] shadow-sm"
                : "border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]/50 hover:bg-[#eff6ff]/50 hover:text-[#1d4ed8]"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${noCat ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
              ✦
            </span>
            Tất cả
          </button>

          {categories.map((cat) => {
            const isActive = selectedCat === cat.name;
            return (
              <button
                type="button"
                key={cat.name}
                onClick={() => selectCategory(cat.name)}
                className={`flex shrink-0 items-center gap-1.5 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border text-[12px] sm:text-[13px] font-semibold transition-all group ${
                  isActive
                    ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8] shadow-sm"
                    : "border-[#e2e8f0] text-[#374151] hover:border-[#3b82f6]/50 hover:bg-[#eff6ff]/50 hover:text-[#1d4ed8]"
                }`}
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 overflow-hidden ${isActive ? "bg-[#dbeafe]" : "bg-[#f1f5f9] group-hover:bg-[#dbeafe]/60"} transition-colors`}>
                  {cat.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <FolderOpen size={13} className={isActive ? "text-[#3b82f6]" : "text-[#94a3b8] group-hover:text-[#3b82f6]"} />
                  )}
                </span>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Hàng danh mục con (chỉ hiển thị khi chọn danh mục cha có con) ── */}
      {subcats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#3b82f6]/20 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1d4ed8] tracking-wide uppercase opacity-70">
              {selectedCat}
            </span>
            <span className="text-[11px] text-[#94a3b8]">/ Danh mục con</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:pb-3.5">

            {/* Tất cả subcategory */}
            <button
              type="button"
              onClick={clearSubcats}
              className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-all ${
                selectedSubcats.length === 0
                  ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]"
                  : "border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]/40 hover:bg-[#eff6ff]/40 hover:text-[#1d4ed8]"
              }`}
            >
              <FolderOpen size={11} className={selectedSubcats.length === 0 ? "text-[#3b82f6]" : "text-[#94a3b8]"} />
              Tất cả
            </button>

            {subcats.map((sub) => {
              const isActive = selectedSubcats.includes(sub.name);
              return (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => toggleSubcat(sub.name)}
                  className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-all group ${
                    isActive
                      ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8] shadow-sm"
                      : "border-[#e2e8f0] text-[#374151] hover:border-[#3b82f6]/40 hover:bg-[#eff6ff]/40 hover:text-[#1d4ed8]"
                  }`}
                >
                  <FolderOpen size={11} className={isActive ? "text-[#3b82f6]" : "text-[#94a3b8] group-hover:text-[#3b82f6]"} />
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
