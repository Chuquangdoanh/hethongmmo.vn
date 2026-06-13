"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export interface ChartPoint {
  label: string;
  deposits: number;
  orderRevenue: number;
  newUsers: number;
  orders: number;
}

interface Props {
  data: ChartPoint[];
  rawFrom: string;
  rawTo: string;
  isSingleDay: boolean;
  periodDepositTotal: number;
}

function shortVnd(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
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

export default function DashboardCharts({ data, rawFrom, rawTo, isSingleDay, periodDepositTotal }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [fromInput, setFromInput] = useState(rawFrom);
  const [toInput, setToInput] = useState(rawTo);

  useEffect(() => setMounted(true), []);
  useEffect(() => { setFromInput(rawFrom); setToInput(rawTo); }, [rawFrom, rawTo]);

  function go(from: string, to: string) {
    const f = from <= to ? from : to;
    const t = from <= to ? to   : from;
    router.push(`/admin/dashboard?dateFrom=${f}&dateTo=${t}`);
  }

  function goPreset(preset: "today" | "7d" | "30d" | "month" | "prev-month") {
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
      const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      return go(fmt(firstPrev), fmt(lastPrev));
    }
  }

  // Active preset detection
  const today = todayISO();
  const d = new Date();
  const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const presetActive = (() => {
    if (rawFrom === today && rawTo === today)             return "today";
    if (rawFrom === shiftDays(today, -6) && rawTo === today)  return "7d";
    if (rawFrom === shiftDays(today, -29) && rawTo === today) return "30d";
    if (rawFrom === firstOfMonth && rawTo === today)      return "month";
    return null;
  })();

  const periodLabel = rawFrom === rawTo
    ? `Ngày ${fmtDate(rawFrom)}`
    : `${fmtDate(rawFrom)} — ${fmtDate(rawTo)}`;

  const placeholder = <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />;

  const PRESETS: { key: "today" | "7d" | "30d" | "month" | "prev-month"; label: string }[] = [
    { key: "today",      label: "Hôm nay" },
    { key: "7d",         label: "7 ngày" },
    { key: "30d",        label: "30 ngày" },
    { key: "month",      label: "Tháng này" },
    { key: "prev-month", label: "Tháng trước" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">

        {/* Row 1: tổng nạp + preset buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-40">
            <p className="text-[10px] text-gray-400 mb-0.5">Tổng nạp tiền — {periodLabel}</p>
            <p className="text-xl font-bold text-emerald-600">
              <span suppressHydrationWarning>{periodDepositTotal.toLocaleString("vi-VN")}đ</span>
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100 hidden md:block" />

          {/* Preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => goPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  presetActive === key
                    ? "bg-violet-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-violet-400 hover:text-violet-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: custom date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Từ ngày</span>
          <input
            type="date"
            value={fromInput}
            max={toInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
          />
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500 font-medium">đến ngày</span>
          <input
            type="date"
            value={toInput}
            min={fromInput}
            max={todayISO()}
            onChange={(e) => setToInput(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={!fromInput || !toInput}
            onClick={() => go(fromInput, toInput)}
            className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            Lọc
          </button>
        </div>
      </div>

      {/* ── Charts 2 cột ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Nạp tiền & Doanh thu — {periodLabel}
          </h3>
          {!mounted ? placeholder : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={isSingleDay ? 1 : "preserveStartEnd"} />
                <YAxis tickFormatter={shortVnd} tick={{ fontSize: 10, fill: "#9ca3af" }} width={44} />
                <Tooltip
                  labelFormatter={(l) => isSingleDay ? `${String(l)} — ${fmtDate(rawFrom)}` : String(l)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="deposits"     name="Nạp tiền"      fill="#7C3AED" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="orderRevenue" name="Tổng doanh thu" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Người dùng mới & Đơn hàng — {periodLabel}
          </h3>
          {!mounted ? placeholder : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={isSingleDay ? 1 : "preserveStartEnd"} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} width={32} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(l) => isSingleDay ? `${String(l)} — ${fmtDate(rawFrom)}` : String(l)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="newUsers" name="Người dùng mới" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="orders"   name="Đơn hàng"       stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
