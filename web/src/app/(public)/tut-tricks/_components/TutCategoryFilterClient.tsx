"use client";

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
    const targetY = getGridTarget();
    if (targetY !== null) smoothScrollTo(targetY);
    router.push(buildHref(category), { scroll: false });
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-wrap justify-center">
      <button
        onClick={() => handleClick(undefined)}
        className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          !activeCategory
            ? "bg-[#0066ff] text-white shadow-sm"
            : "border border-[#e2e8f0] text-[#64748b] hover:border-[#0066ff] hover:text-[#0066ff]"
        }`}
      >
        Tất cả
      </button>

      {categories.map(({ name, icon }) => (
        <button
          key={name}
          onClick={() => handleClick(name)}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategory === name
              ? "bg-[#0066ff] text-white shadow-sm"
              : "border border-[#e2e8f0] text-[#64748b] hover:border-[#0066ff] hover:text-[#0066ff]"
          }`}
        >
          {icon && (
            <span className={`flex items-center justify-center w-4 h-4 rounded p-0.5 shrink-0 ${activeCategory === name ? "bg-white/20" : "bg-white border border-gray-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon} alt={name} width={12} height={12} loading="lazy" decoding="async" className="w-full h-full object-contain" />
            </span>
          )}
          {name}
        </button>
      ))}
    </div>
  );
}
