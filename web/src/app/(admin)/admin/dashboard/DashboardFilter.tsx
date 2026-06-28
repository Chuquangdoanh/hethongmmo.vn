"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  rawFrom: string;
  rawTo: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDays(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PRESETS = [
  { key: "today",      label: "Hôm nay" },
  { key: "7d",         label: "7 ngày" },
  { key: "30d",        label: "30 ngày" },
  { key: "month",      label: "Tháng này" },
  { key: "prev-month", label: "Tháng trước" },
] as const;

type PresetKey = typeof PRESETS[number]["key"];

export default function DashboardFilter({ rawFrom, rawTo }: Props) {
  const router = useRouter();
  const [fromInput, setFromInput] = useState(rawFrom);
  const [toInput, setToInput]     = useState(rawTo);

  useEffect(() => { setFromInput(rawFrom); setToInput(rawTo); }, [rawFrom, rawTo]);

  function go(from: string, to: string) {
    const f = from <= to ? from : to;
    const t = from <= to ? to   : from;
    router.push(`/admin/dashboard?dateFrom=${f}&dateTo=${t}`);
  }

  function goPreset(preset: PresetKey) {
    const today = todayISO();
    if (preset === "today")  return go(today, today);
    if (preset === "7d")     return go(shiftDays(today, -6), today);
    if (preset === "30d")    return go(shiftDays(today, -29), today);
    if (preset === "month") {
      const d = new Date();
      const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return go(first, today);
    }
    if (preset === "prev-month") {
      const d = new Date();
      const firstPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastPrev  = new Date(d.getFullYear(), d.getMonth(), 0);
      const fmt = (x: Date) =>
        `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      return go(fmt(firstPrev), fmt(lastPrev));
    }
  }

  const today = todayISO();
  const d = new Date();
  const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const presetActive = (() => {
    if (rawFrom === today && rawTo === today)                  return "today";
    if (rawFrom === shiftDays(today, -6) && rawTo === today)   return "7d";
    if (rawFrom === shiftDays(today, -29) && rawTo === today)  return "30d";
    if (rawFrom === firstOfMonth && rawTo === today)           return "month";
    return null;
  })();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => goPreset(key)}
            className={`h-10 px-3 text-sm font-medium rounded-[10px] transition-colors border ${
              presetActive === key
                ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                : "border-gray-200 text-gray-600 hover:border-[#7C3AED] hover:text-[#7C3AED] bg-white"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <input
          type="date"
          value={fromInput}
          max={toInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={toInput}
          min={fromInput}
          max={todayISO()}
          onChange={(e) => setToInput(e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-[10px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors"
        />
        <button
          type="button"
          disabled={!fromInput || !toInput}
          onClick={() => go(fromInput, toInput)}
          className="h-10 px-4 text-sm font-semibold rounded-[10px] bg-[#7C3AED] text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}
