"use client";

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

export default function DashboardCharts({ data, rawFrom, rawTo, isSingleDay }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const periodLabel = rawFrom === rawTo
    ? `Ngày ${fmtDate(rawFrom)}`
    : `${fmtDate(rawFrom)} — ${fmtDate(rawTo)}`;

  const placeholder = <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-5">

      {/* ── Charts 2 cột ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Nạp tiền & Doanh thu
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
            Người dùng mới & Đơn hàng
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
