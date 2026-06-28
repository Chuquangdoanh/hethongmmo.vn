"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useTransition } from "react";
import { Search, X, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilterConfig {
  paramKey: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
}

export interface AdminFilterBarProps {
  basePath: string;
  search?: {
    placeholder: string;
    paramKey?: string;
  };
  selects?: SelectFilterConfig[];
  dateRange?: {
    fromKey?: string;
    toKey?: string;
    showQuickDates?: boolean;
  };
  advancedSelects?: SelectFilterConfig[];
  className?: string;
  // Extra URL params to preserve when applying filters (e.g., "orderType", "section")
  preserveParams?: string[];
}

function getDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0]!;
}

export default function AdminFilterBar({
  basePath,
  search,
  selects = [],
  dateRange,
  advancedSelects = [],
  className = "",
  preserveParams = [],
}: AdminFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchKey = search?.paramKey ?? "q";
  const fromKey = dateRange?.fromKey ?? "dateFrom";
  const toKey = dateRange?.toKey ?? "dateTo";

  const [searchValue, setSearchValue] = useState(searchParams.get(searchKey) ?? "");
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of [...selects, ...advancedSelects]) {
      initial[s.paramKey] = searchParams.get(s.paramKey) ?? "";
    }
    return initial;
  });
  const [dateFrom, setDateFrom] = useState(searchParams.get(fromKey) ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get(toKey) ?? "");

  function applyFilters() {
    const sp = new URLSearchParams();
    for (const key of preserveParams) {
      const val = searchParams.get(key);
      if (val) sp.set(key, val);
    }
    if (searchValue.trim()) sp.set(searchKey, searchValue.trim());
    for (const [key, val] of Object.entries(selectValues) as [string, string][]) {
      if (val) sp.set(key, val);
    }
    if (dateFrom) sp.set(fromKey, dateFrom);
    if (dateTo) sp.set(toKey, dateTo);
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  function resetFilters() {
    setSearchValue("");
    const reset: Record<string, string> = {};
    for (const s of [...selects, ...advancedSelects]) reset[s.paramKey] = "";
    setSelectValues(reset);
    setDateFrom("");
    setDateTo("");
    if (searchInputRef.current) searchInputRef.current.value = "";
    startTransition(() => {
      router.push(basePath, { scroll: false });
    });
  }

  function setQuickDate(preset: "today" | "7d" | "30d" | "all") {
    const today = getDateStr(0);
    if (preset === "all") { setDateFrom("all"); setDateTo(""); }
    else if (preset === "today") { setDateFrom(today); setDateTo(today); }
    else if (preset === "7d") { setDateFrom(getDateStr(6)); setDateTo(today); }
    else { setDateFrom(getDateStr(29)); setDateTo(today); }
  }

  const today = getDateStr(0);
  const isAll = dateFrom === "all";
  const isToday = !isAll && (dateFrom === today || !dateFrom) && (!dateTo || dateTo === today);
  const is7d = !isAll && dateFrom === getDateStr(6) && (!dateTo || dateTo === today);
  const is30d = !isAll && dateFrom === getDateStr(29) && (!dateTo || dateTo === today);

  const hasActiveAdvanced = advancedSelects.some((s) => selectValues[s.paramKey]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {search && (
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              placeholder={search.placeholder}
              className="w-full h-10 pl-9 pr-8 text-sm border border-gray-200 rounded-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors placeholder:text-gray-400"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  if (searchInputRef.current) searchInputRef.current.value = "";
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {selects.map((s) => (
          <select
            key={s.paramKey}
            value={selectValues[s.paramKey] ?? ""}
            onChange={(e) =>
              setSelectValues((prev) => ({ ...prev, [s.paramKey]: e.target.value }))
            }
            className="h-10 px-3 pr-8 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors cursor-pointer"
          >
            <option value="">{s.placeholder ?? `Tất cả ${s.label.toLowerCase()}`}</option>
            {s.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {dateRange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={isAll ? "" : dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 px-3 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={isAll ? "" : dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 px-3 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors"
            />
          </div>
        )}

        {dateRange?.showQuickDates && (
          <div className="flex items-center gap-1.5">
            {(
              [
                { label: "Hôm nay", key: "today" as const, active: isToday },
                { label: "7 ngày", key: "7d" as const, active: is7d },
                { label: "30 ngày", key: "30d" as const, active: is30d },
                { label: "Tất cả", key: "all" as const, active: isAll },
              ] as const
            ).map(({ label, key, active }) => (
              <button
                key={key}
                type="button"
                onClick={() => setQuickDate(key)}
                className={`h-10 px-3 text-sm font-medium rounded-[10px] transition-colors border ${
                  active
                    ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                    : "border-gray-200 text-gray-600 hover:border-[#7C3AED] hover:text-[#7C3AED] bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="h-10 px-4 text-sm font-semibold rounded-[10px] bg-[#7C3AED] text-white hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            Áp dụng
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 px-3 text-sm font-medium rounded-[10px] border border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Đặt lại
          </button>
          {advancedSelects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`h-10 px-3 text-sm font-medium rounded-[10px] border transition-colors flex items-center gap-1.5 ${
                showAdvanced || hasActiveAdvanced
                  ? "border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5"
                  : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal size={14} strokeWidth={2} />
              Bộ lọc khác
              {showAdvanced ? (
                <ChevronUp size={14} strokeWidth={2} />
              ) : (
                <ChevronDown size={14} strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </div>

      {showAdvanced && advancedSelects.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-end gap-3 flex-wrap">
            {advancedSelects.map((s) => (
              <div key={s.paramKey} className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <select
                  value={selectValues[s.paramKey] ?? ""}
                  onChange={(e) =>
                    setSelectValues((prev) => ({ ...prev, [s.paramKey]: e.target.value }))
                  }
                  className="h-10 px-3 pr-8 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors cursor-pointer"
                >
                  <option value="">{s.placeholder ?? `Tất cả`}</option>
                  {s.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {hasActiveAdvanced && (
              <button
                type="button"
                onClick={() => {
                  setSelectValues((prev) => {
                    const reset = { ...prev };
                    for (const s of advancedSelects) reset[s.paramKey] = "";
                    return reset;
                  });
                }}
                className="h-10 px-3 text-sm text-red-500 hover:text-red-700 flex items-center gap-1.5 border border-red-200 rounded-[10px] hover:bg-red-50 transition-colors"
              >
                <X size={14} strokeWidth={2} />
                Xóa bớt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
