"use client";

import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";

interface Props {
  categories: { name: string; icon: string }[];
  activeCategory: string | undefined;
  activeTier: string | undefined;
}

export default function TutCategoryFilterClient({ categories, activeCategory, activeTier }: Props) {
  const router = useRouter();

  function buildHref(category?: string) {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (activeTier) p.set("tier", activeTier);
    const qs = p.toString();
    return qs ? `/tut-tricks?${qs}` : "/tut-tricks";
  }

  function handleClick(category?: string) {
    router.push(buildHref(category), { scroll: false });
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-wrap justify-center">
      <button
        type="button"
        onClick={() => handleClick(undefined)}
        className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          !activeCategory
            ? "bg-primary text-white shadow-sm"
            : "border border-border text-text-muted hover:border-primary hover:text-primary"
        }`}
      >
        Tất cả
      </button>

      {categories.map(({ name, icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => handleClick(name)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategory === name
              ? "bg-primary text-white shadow-sm"
              : "border border-border text-text-muted hover:border-primary hover:text-primary"
          }`}
        >
          {icon && (
            <span className={`flex items-center justify-center w-4 h-4 rounded p-0.5 shrink-0 ${activeCategory === name ? "bg-white/20" : "bg-white border border-gray-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(icon)} alt={name} width={12} height={12} loading="lazy" decoding="async" className="w-full h-full object-contain" />
            </span>
          )}
          {name}
        </button>
      ))}
    </div>
  );
}
