"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: "Tất cả",    min: null,       max: null },
  { label: "< 100k",    min: null,       max: 100_000 },
  { label: "100k–1tr",  min: 100_000,    max: 1_000_000 },
  { label: "1tr–10tr",  min: 1_000_000,  max: 10_000_000 },
  { label: "10tr–50tr", min: 10_000_000, max: 50_000_000 },
  { label: "50tr+",     min: 50_000_000, max: null },
];

export default function DepositFilter() {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const depositMin = sp.get("depositMin");
  const depositMax = sp.get("depositMax");

  const [minInput, setMinInput] = useState(depositMin ?? "");
  const [maxInput, setMaxInput] = useState(depositMax ?? "");

  function navigate(min: number | null, max: number | null) {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    if (min !== null) next.set("depositMin", String(min)); else next.delete("depositMin");
    if (max !== null) next.set("depositMax", String(max)); else next.delete("depositMax");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function applyCustom() {
    const min = minInput ? parseInt(minInput, 10) : null;
    const max = maxInput ? parseInt(maxInput, 10) : null;
    navigate(min, max);
  }

  function isActive(min: number | null, max: number | null) {
    const currMin = depositMin ? parseInt(depositMin, 10) : null;
    const currMax = depositMax ? parseInt(depositMax, 10) : null;
    return currMin === min && currMax === max;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 font-medium">Tổng nạp:</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => {
            setMinInput(p.min !== null ? String(p.min) : "");
            setMaxInput(p.max !== null ? String(p.max) : "");
            navigate(p.min, p.max);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            isActive(p.min, p.max)
              ? "bg-[#7C3AED] text-white"
              : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="number"
          min={0}
          placeholder="Từ (đ)"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          className="w-24 border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
        />
        <span className="text-xs text-gray-400">—</span>
        <input
          type="number"
          min={0}
          placeholder="Đến (đ)"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="w-24 border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
        />
        <button
          type="button"
          onClick={applyCustom}
          className="px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-violet-700 transition-colors"
        >
          Lọc
        </button>
      </div>
    </div>
  );
}
