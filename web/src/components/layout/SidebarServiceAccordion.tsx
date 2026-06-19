"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";

export interface SvcCategory {
  name: string;
  iconUrl: string | null;
}

export default function SidebarServiceAccordion({ categories }: { categories: SvcCategory[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Tự mở khi đang ở trang dịch vụ
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (pathname.startsWith("/dich-vu")) setIsOpen(true);
  }, [pathname]);

  const isActive = pathname.startsWith("/dich-vu");

  return (
    <div className="sb-group">
      <p className="sb-group-title sb-label">DỊCH VỤ MẠNG XÃ HỘI</p>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`sb-link sb-svc-toggle${isActive ? " sb-active" : ""}`}
      >
        <span className="sb-link-icon">
          <span className="sb-icon-badge" style={{ background: "#ede9fe" }}>
            <Wrench size={15} strokeWidth={1.75} style={{ color: "#7c3aed" }} />
          </span>
        </span>
        <span className="sb-label sb-link-text">DỊCH VỤ</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          aria-hidden
          className="sb-label sb-svc-chevron"
          style={{
            color: "#94a3b8",
            marginLeft: "auto",
            flexShrink: 0,
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div className="sb-svc-items">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/dich-vu?category=${encodeURIComponent(c.name)}`}
              prefetch={false}
              className="sb-link sb-svc-sub"
            >
              {c.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r2Url(c.iconUrl)}
                  alt=""
                  className="sb-cat-icon"
                  width={18}
                  height={18}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span style={{ width: 18, height: 18, flexShrink: 0, display: "block" }} />
              )}
              <span className="sb-label sb-link-text">{c.name}</span>
            </Link>
          ))}
          <Link href="/dich-vu" prefetch={false} className="sb-link sb-svc-sub sb-svc-all">
            <span className="sb-label sb-link-text">Xem tất cả dịch vụ →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
