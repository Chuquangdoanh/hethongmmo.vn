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

function getCardTarget() {
  const grid = document.getElementById("khoa-hoc-grid");
  if (!grid) return null;
  const firstCard = grid.querySelector<HTMLElement>("a[href*='/khoa-hoc/']");
  const target = firstCard ?? grid;
  return target.getBoundingClientRect().top + window.scrollY - 72;
}

const ACTIVE_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #e11d48, #be123c)",
  color: "#fff",
  boxShadow: "0 2px 8px rgba(225,29,72,0.35)",
};
const INACTIVE_STYLE: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid #e2e8f0",
  color: "#475569",
};

interface Props {
  categories: { name: string; icon: string }[];
  activeCategory: string | undefined;
}

export default function CategoryFilterClient({ categories, activeCategory }: Props) {
  const router = useRouter();

  function handleClick(href: string) {
    const targetY = getCardTarget();
    if (targetY !== null) smoothScrollTo(targetY);
    router.push(href, { scroll: false });
  }

  return (
    <div
      className="flex items-center gap-2"
      style={{ overflowX: "auto", scrollbarWidth: "none", maxWidth: "100%", paddingBottom: "4px" }}
    >
      <button
        onClick={() => handleClick("/khoa-hoc")}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
        style={!activeCategory ? ACTIVE_STYLE : INACTIVE_STYLE}
      >
        Tất cả
      </button>

      {categories.map(({ name, icon }) => (
        <button
          key={name}
          onClick={() => handleClick(`/khoa-hoc?category=${encodeURIComponent(name)}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
          style={activeCategory === name ? ACTIVE_STYLE : INACTIVE_STYLE}
        >
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt={name}
              width={16}
              height={16}
              loading="lazy"
              decoding="async"
              className="w-4 h-4 object-contain shrink-0"
            />
          )}
          {name}
        </button>
      ))}
    </div>
  );
}
