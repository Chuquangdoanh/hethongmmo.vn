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
  selectedYear: number;
  selectedMonth: number;
  filterDate: string | null;
  periodDepositTotal: number;
}

function shortVnd(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: `Tháng ${i + 1}` }));
const YEARS  = Array.from({ length: 4  }, (_, i) => new Date().getFullYear() - i);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardCharts({
  data, selectedYear, selectedMonth, filterDate, periodDepositTotal,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dateInput, setDateInput] = useState(filterDate ?? todayStr());
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const mode: "day" | "month" = filterDate ? "day" : "month";

  function goDay(d: string)       { router.push(`/admin/dashboard?date=${d}`); }
  function goMonth(y: number, m: number) { router.push(`/admin/dashboard?year=${y}&month=${m}`); }

  const placeholder = <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />;
  const periodLabel = filterDate
    ? `Ngày ${filterDate.split("-").reverse().join("/")}`
    : `Tháng ${selectedMonth}/${selectedYear}`;

  return (
    <div className="space-y-5">

      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">

        {/* Tổng nạp tiền kỳ đã lọc */}
        <div className="flex-1 min-w-[180px]">
          <p className="text-[10px] text-gray-400 mb-0.5">Tổng nạp tiền — {periodLabel}</p>
          <p className="text-2xl font-bold text-emerald-600">
            <span suppressHydrationWarning>{periodDepositTotal.toLocaleString("vi-VN")}đ</span>
          </p>
        </div>

        <div className="h-10 w-px bg-gray-100 hidden md:block" />

        {/* Mode tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => goMonth(selectedYear, selectedMonth)}
            className={`px-3 py-2 transition-colors ${mode === "month" ? "bg-violet-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            Theo tháng
          </button>
          <button
            type="button"
            onClick={() => goDay(dateInput)}
            className={`px-3 py-2 transition-colors border-l border-gray-200 ${mode === "day" ? "bg-violet-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            Theo ngày
          </button>
        </div>

        {/* Month filter */}
        {mode === "month" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => goMonth(selectedYear, Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none cursor-pointer"
            >
              {MONTHS.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => goMonth(Number(e.target.value), selectedMonth)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none cursor-pointer"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Day filter */}
        {mode === "day" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => dateInput && goDay(dateInput)}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Lọc
            </button>
          </div>
        )}
      </div>

      {/* ── Charts 2 cột 5:5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bar chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Nạp tiền & Doanh thu — {periodLabel}
          </h3>
          {!mounted ? placeholder : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={mode === "day" ? 1 : 1} />
                <YAxis tickFormatter={shortVnd} tick={{ fontSize: 10, fill: "#9ca3af" }} width={44} />
                <Tooltip
                  labelFormatter={(l) => mode === "day" ? `${l} — ${filterDate}` : `Ngày ${l}/${selectedMonth}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="deposits"     name="Nạp tiền"      fill="#7C3AED" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="orderRevenue" name="Tổng doanh thu" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Người dùng mới & Đơn hàng — {periodLabel}
          </h3>
          {!mounted ? placeholder : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={mode === "day" ? 1 : 1} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} width={32} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(l) => mode === "day" ? `${l} — ${filterDate}` : `Ngày ${l}/${selectedMonth}`}
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
