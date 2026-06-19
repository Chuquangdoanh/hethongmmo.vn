"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, ChevronDown } from "lucide-react";

export interface PlatformItem { name: string; count: number; }
export interface TypeItem { id: string; name: string; count: number; }

interface Props {
  platforms: PlatformItem[];
  resourceTypes: TypeItem[];
}

const PRICE_RANGES = [
  { label: "Dưới 100.000đ",         value: "0-100000"           },
  { label: "100k – 500k",            value: "100000-500000"      },
  { label: "500k – 1.000.000đ",      value: "500000-1000000"     },
  { label: "Trên 1.000.000đ",        value: "1000000-9999999999" },
] as const;

export function KhoFilterSidebar({ platforms, resourceTypes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  const [selPlatforms, setSelPlatforms] = useState<Set<string>>(
    () => new Set(searchParams.get("category")?.split(",").filter(Boolean) ?? [])
  );
  const [selTypes, setSelTypes] = useState<Set<string>>(
    () => new Set(searchParams.get("subcategory")?.split(",").filter(Boolean) ?? [])
  );
  const [selPrice, setSelPrice] = useState(searchParams.get("price") ?? "");

  function apply() {
    const p = new URLSearchParams();
    if (selPlatforms.size) p.set("category", [...selPlatforms].join(","));
    if (selTypes.size)     p.set("subcategory", [...selTypes].join(","));
    if (selPrice)          p.set("price", selPrice);
    const q = searchParams.get("q");
    if (q) p.set("q", q);
    p.delete("page");
    startTransition(() => router.replace(`/kho-tai-nguyen?${p.toString()}`, { scroll: false }));
  }

  function reset() {
    setSelPlatforms(new Set());
    setSelTypes(new Set());
    setSelPrice("");
    startTransition(() => router.replace("/kho-tai-nguyen", { scroll: false }));
  }

  function togglePlatform(name: string) {
    const s = new Set(selPlatforms);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelPlatforms(s);
  }
  function toggleType(name: string) {
    const s = new Set(selTypes);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelTypes(s);
  }

  const dp = showMorePlatforms ? platforms : platforms.slice(0, 6);
  const dt = showMoreTypes ? resourceTypes : resourceTypes.slice(0, 6);

  return (
    <aside className="w-[210px] shrink-0 self-start sticky top-24">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
          <span className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase">BỘ LỌC TÌM KIẾM</span>
          <button onClick={reset} className="flex items-center gap-1 text-[11px] text-[#3b82f6] font-bold hover:text-[#1d4ed8] transition-colors">
            <RotateCcw size={10} strokeWidth={2.5} />
            Đặt lại
          </button>
        </div>

        <div className="divide-y divide-[#f1f5f9] max-h-[calc(100vh-200px)] overflow-y-auto">

          {/* Nền tảng */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Nền tảng</p>
            <div className="space-y-2.5">
              {dp.map((p) => (
                <label key={p.name} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selPlatforms.has(p.name)}
                    onChange={() => togglePlatform(p.name)}
                    className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer shrink-0"
                  />
                  <span className={`flex-1 text-[13px] min-w-0 truncate transition-colors ${selPlatforms.has(p.name) ? "font-bold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {p.name}
                  </span>
                  <span className="text-[11px] text-[#94a3b8] shrink-0">{p.count.toLocaleString("vi-VN")}</span>
                </label>
              ))}
            </div>
            {platforms.length > 6 && (
              <button
                onClick={() => setShowMorePlatforms(!showMorePlatforms)}
                className="mt-2.5 flex items-center gap-1 text-[11px] text-[#3b82f6] font-bold hover:underline"
              >
                {showMorePlatforms ? "Ẩn bớt" : "Xem thêm"}
                <ChevronDown size={10} className={showMorePlatforms ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
            )}
          </div>

          {/* Loại tài nguyên */}
          {resourceTypes.length > 0 && (
            <div className="px-4 py-4">
              <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Loại tài nguyên</p>
              <div className="space-y-2.5">
                {dt.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selTypes.has(t.name)}
                      onChange={() => toggleType(t.name)}
                      className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#3b82f6] cursor-pointer shrink-0"
                    />
                    <span className={`flex-1 text-[13px] min-w-0 truncate transition-colors ${selTypes.has(t.name) ? "font-bold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                      {t.name}
                    </span>
                    <span className="text-[11px] text-[#94a3b8] shrink-0">{t.count.toLocaleString("vi-VN")}</span>
                  </label>
                ))}
              </div>
              {resourceTypes.length > 6 && (
                <button
                  onClick={() => setShowMoreTypes(!showMoreTypes)}
                  className="mt-2.5 flex items-center gap-1 text-[11px] text-[#3b82f6] font-bold hover:underline"
                >
                  {showMoreTypes ? "Ẩn bớt" : "Xem thêm"}
                  <ChevronDown size={10} className={showMoreTypes ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
              )}
            </div>
          )}

          {/* Giá */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Giá</p>
            <div className="space-y-2.5">
              {PRICE_RANGES.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="kho-price"
                    checked={selPrice === r.value}
                    onChange={() => setSelPrice(selPrice === r.value ? "" : r.value)}
                    className="w-3.5 h-3.5 border-[#d1d5db] accent-[#3b82f6] cursor-pointer shrink-0"
                  />
                  <span className={`text-[13px] transition-colors ${selPrice === r.value ? "font-bold text-[#2563eb]" : "text-[#374151] group-hover:text-[#2563eb]"}`}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Apply button */}
        <div className="px-4 py-3 border-t border-[#e2e8f0]">
          <button
            onClick={apply}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white text-[13px] font-bold py-2.5 rounded-xl transition-colors"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </aside>
  );
}
