"use client";

import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";

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
    router.push(href, { scroll: false });
  }

  return (
    <div
      className="flex items-center gap-2"
      style={{ overflowX: "auto", scrollbarWidth: "none", maxWidth: "100%", paddingBottom: "4px" }}
    >
      <button
        type="button"
        onClick={() => handleClick("/khoa-hoc")}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
        style={!activeCategory ? ACTIVE_STYLE : INACTIVE_STYLE}
      >
        Tất cả
      </button>

      {categories.map(({ name, icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => handleClick(`/khoa-hoc?category=${encodeURIComponent(name)}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
          style={activeCategory === name ? ACTIVE_STYLE : INACTIVE_STYLE}
        >
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2Url(icon)}
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
