"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

interface Props {
  defaultValue: string;
  basePath: string;
}

export function BannerSearchInput({ defaultValue, basePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParamsRef = useRef(searchParams);
  // eslint-disable-next-line react-hooks/refs
  searchParamsRef.current = searchParams;
  // Skip debounce on initial mount — chỉ chạy khi user thực sự gõ
  const isMounted = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setValue(defaultValue); }, [defaultValue]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed); else params.delete("q");
      params.delete("page");
      startTransition(() => {
        router.replace(`${basePath}?${params.toString()}`, { scroll: false });
      });
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, basePath]);

  return (
    <div className="flex gap-2 mt-4 max-w-lg">
      <div className="flex-1 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/35 text-sm focus:outline-none focus:bg-white/20 focus:border-white/30 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
