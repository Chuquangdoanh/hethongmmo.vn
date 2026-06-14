"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  initialFrom: string;
  initialTo: string;
  status?: string;
}

export function DateRangeFilter({ initialFrom, initialTo, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function apply() {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const str = qs.toString();
    startTransition(() => router.push(`/admin/withdrawals${str ? `?${str}` : ""}`));
  }

  function clear() {
    setFrom("");
    setTo("");
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    const str = qs.toString();
    startTransition(() => router.push(`/admin/withdrawals${str ? `?${str}` : ""}`));
  }

  const hasActiveRange = Boolean(initialFrom || initialTo);

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[#A855F7]/20">
      <div className="flex items-center gap-1.5 bg-white border border-[#A855F7]/25 rounded-lg px-2.5 py-1.5">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="text-[11px] text-gray-700 outline-none bg-transparent w-28"
        />
        <span className="text-gray-300 text-[10px] font-bold select-none">→</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="text-[11px] text-gray-700 outline-none bg-transparent w-28"
        />
      </div>
      <button
        onClick={apply}
        disabled={isPending || (!from && !to)}
        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#A855F7] text-white hover:bg-[#9333EA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "…" : "Lọc"}
      </button>
      {hasActiveRange && (
        <button
          onClick={clear}
          disabled={isPending}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
