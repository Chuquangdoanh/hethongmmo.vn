"use client";

import { Gem, Gift } from "lucide-react";
import { useRouter } from "next/navigation";

function smoothScrollTo(targetY: number, duration = 900) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 8) return;
  let startTime: number | null = null;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const animate = (now: number) => {
    if (startTime === null) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function getGridTarget() {
  const grid = document.getElementById("tut-tricks-grid");
  if (!grid) return null;
  return grid.getBoundingClientRect().top + window.scrollY - 72;
}

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
    const targetY = getGridTarget();
    if (targetY !== null) smoothScrollTo(targetY);
    router.push(buildHref(tier), { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleClick("Có phí")}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          activeTier === "Có phí"
            ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-sm"
            : "border-[#e2e8f0] text-[#64748b] hover:border-[#f59e0b] hover:text-[#f59e0b]"
        }`}
      >
        <Gem size={12} className="shrink-0" /> Có phí
      </button>
      <button
        onClick={() => handleClick("Miễn phí")}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
          activeTier === "Miễn phí"
            ? "bg-[#10b981] text-white border-[#10b981] shadow-sm"
            : "border-[#e2e8f0] text-[#64748b] hover:border-[#10b981] hover:text-[#10b981]"
        }`}
      >
        <Gift size={12} className="shrink-0" /> Miễn phí
      </button>
    </div>
  );
}
