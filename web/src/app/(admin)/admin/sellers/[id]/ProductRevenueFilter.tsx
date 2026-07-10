"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  requestId: string;
  dateFrom: string;
  dateTo: string;
}

export default function ProductRevenueFilter({ requestId, dateFrom, dateTo }: Props) {
  const router = useRouter();
  const [fromInput, setFromInput] = useState(dateFrom);
  const [toInput, setToInput]     = useState(dateTo);

  function applyFilter() {
    const params = new URLSearchParams();
    if (fromInput) params.set("dateFrom", fromInput);
    if (toInput)   params.set("dateTo", toInput);
    const query = params.toString();
    router.push(`/admin/sellers/${requestId}${query ? `?${query}` : ""}`);
  }

  function clearFilter() {
    setFromInput("");
    setToInput("");
    router.push(`/admin/sellers/${requestId}`);
  }

  const hasFilter = Boolean(dateFrom || dateTo);

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <input
        type="date"
        value={fromInput}
        max={toInput || undefined}
        onChange={(e) => setFromInput(e.target.value)}
        className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-colors"
      />
      <span className="text-gray-400 text-xs">—</span>
      <input
        type="date"
        value={toInput}
        min={fromInput || undefined}
        onChange={(e) => setToInput(e.target.value)}
        className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-colors"
      />
      <button
        type="button"
        onClick={applyFilter}
        disabled={!fromInput || !toInput}
        className="h-9 px-3 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
      >
        Lọc
      </button>
      {hasFilter && (
        <button
          type="button"
          onClick={clearFilter}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors"
        >
          Xóa lọc
        </button>
      )}
    </div>
  );
}
