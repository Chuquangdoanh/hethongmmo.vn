"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const SORT_OPTIONS = [
  { id: "pho-bien",  label: "Phổ Biến"     },
  { id: "ban-chay",  label: "Bán Chạy"     },
  { id: "danh-gia",  label: "Đánh Giá Cao" },
  { id: "moi-nhat",  label: "Mới Nhất"     },
] as const;

export function SellerSortSelect({ basePath = "/tai-nguyen-mmo/gian-hang" }: { basePath?: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeSort   = searchParams.get("sort") ?? "pho-bien";
  const [, startTransition] = useTransition();

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "pho-bien") params.set("sort", value);
    else params.delete("sort");
    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-xl border border-border p-1 w-max">
      {SORT_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setSort(id)}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
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
