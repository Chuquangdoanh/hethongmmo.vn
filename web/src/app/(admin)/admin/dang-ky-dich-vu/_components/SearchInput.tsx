"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search, X } from "lucide-react";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  function navigate(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      sp.set("q", value.trim());
    } else {
      sp.delete("q");
    }
    sp.delete("page");
    startTransition(() => {
      router.push(`/admin/dang-ky-dich-vu?${sp.toString()}`);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(value), 300);
  }

  function handleClear() {
    const input = document.getElementById("dv-search") as HTMLInputElement | null;
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
        id="dv-search"
        type="text"
        defaultValue={currentQ}
        onChange={handleChange}
        placeholder="Tìm tên / SĐT..."
        className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors placeholder:text-gray-400"
        style={{ minWidth: 200 }}
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
      )}
      {!isPending && currentQ && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
