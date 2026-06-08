"use client";

import { Gem, Gift } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  activeCategory: string | undefined;
  activeTier: string | undefined;
}

export default function TutTierFilterClient({ activeCategory, activeTier }: Props) {
  const router = useRouter();

  function buildHref(tier?: string) {
    const p = new URLSearchParams();
    if (activeCategory) p.set("category", activeCategory);
    if (tier) p.set("tier", tier);
    const qs = p.toString();
    return qs ? `/tut-tricks?${qs}` : "/tut-tricks";
  }

  function handleClick(tier?: string) {
    router.push(buildHref(tier), { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleClick("Có phí")}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          activeTier === "Có phí"
            ? "bg-warning text-white border-warning shadow-sm"
            : "border-border text-text-muted hover:border-warning hover:text-warning"
        }`}
      >
        <Gem size={12} className="shrink-0" /> Có phí
      </button>
      <button
        type="button"
        onClick={() => handleClick("Miễn phí")}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          activeTier === "Miễn phí"
            ? "bg-[#10b981] text-white border-[#10b981] shadow-sm"
            : "border-border text-text-muted hover:border-[#10b981] hover:text-[#10b981]"
        }`}
      >
        <Gift size={12} className="shrink-0" /> Miễn phí
      </button>
    </div>
  );
}
