"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to always read latest searchParams inside the timer without adding it to deps
  const searchParamsRef = useRef(searchParams);
  // eslint-disable-next-line react-hooks/purity
  // eslint-disable-next-line react-hooks/refs
  searchParamsRef.current = searchParams;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const trimmed = value.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      router.push(`/tai-nguyen-mmo?${params.toString()}`, { scroll: false });
    }, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, router]);

  return (
    <div className="relative flex items-center shrink-0">
      <Search
        size={14}
        strokeWidth={1.75}
        className="absolute left-2.5 text-[#94a3b8] pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm tên sản phẩm..."
        className="pl-8 pr-7 py-1.5 text-sm rounded-lg border-2 border-[#e2e8f0] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0066ff] focus:outline-none w-44 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 text-[#94a3b8] hover:text-[#475569] transition-colors"
        >
          <X size={12} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
