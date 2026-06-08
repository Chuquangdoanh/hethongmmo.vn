"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search, X } from "lucide-react";

export default function OrderSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  function navigate(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      sp.set("q", value.trim());
      sp.delete("page");
    } else {
      sp.delete("q");
      sp.delete("page");
    }
    startTransition(() => {
      router.push(`/admin/orders?${sp.toString()}`, { scroll: false });
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(value), 300);
  }

  function handleClear() {
    const input = document.getElementById("order-search") as HTMLInputElement | null;
    if (input) input.value = "";
    navigate("");
  }

  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={2}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        id="order-search"
        type="text"
        defaultValue={currentQ}
        onChange={handleChange}
        placeholder="Tìm mã đơn / email..."
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors placeholder:text-gray-400"
        style={{ minWidth: 220 }}
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#7C3AED]/40 border-t-[#7C3AED] rounded-full animate-spin" />
      )}
      {!isPending && currentQ && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
