"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const SORT_OPTIONS = [
  { id: "noi-bat",  label: "Nổi Bật"  },
  { id: "ban-chay", label: "Bán Chạy" },
  { id: "moi-nhat", label: "Mới Nhất" },
  { id: "gia-cao",  label: "Giá Cao"  },
  { id: "gia-thap", label: "Giá Thấp" },
] as const;

export function SortSelect({ basePath = "/tai-nguyen-mmo" }: { basePath?: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeSort   = searchParams.get("sort") ?? "noi-bat";
  const [, startTransition] = useTransition();

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "noi-bat") params.set("sort", value);
    else params.delete("sort");
    params.delete("page");
    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-xl border border-border p-0.5 sm:p-1 w-full sm:w-max overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
      {SORT_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setSort(id)}
          className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeSort === id
              ? "bg-primary text-white"
              : "text-text-muted hover:text-primary hover:bg-[#f1f5f9]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
