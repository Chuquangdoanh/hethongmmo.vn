"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { emitNavProgress } from "@/lib/utils/nav-progress";

interface NavLink {
  href: string;
  label: string;
  color: string;
  shadow: string;
}

interface NavLinksProps {
  links: NavLink[];
}

export default function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Defer active-path đến sau hydration — tránh server/client style mismatch.
  // Server render: activePath = "" → tất cả link inactive (nhất quán).
  // Sau mount: activePath = pathname → link đúng được highlight.
  const [activePath, setActivePath] = useState("");
  useEffect(() => { setActivePath(pathname); }, [pathname]);

  const activeLink = links.find((l) =>
    l.href === "/" ? activePath === "/" : activePath.startsWith(l.href),
  );

  function moveIndicatorTo(el: HTMLElement, color: string, shadow: string) {
    const indicator = indicatorRef.current;
    const list = listRef.current;
    if (!indicator || !list) return;

    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    indicator.style.left = `${elRect.left - listRect.left}px`;
    indicator.style.top = `${elRect.top - listRect.top}px`;
    indicator.style.width = `${elRect.width}px`;
    indicator.style.height = `${elRect.height}px`;
    indicator.style.background = color;
    indicator.style.boxShadow = `0 4px 15px ${shadow}`;
    indicator.style.opacity = "1";
  }

  function hideIndicator() {
    if (indicatorRef.current) indicatorRef.current.style.opacity = "0";
  }

  /* Position indicator on active link after mount and on pathname change */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const list = listRef.current;
    if (!list || !activeLink) {
      hideIndicator();
      return;
    }
    const el = list.querySelector<HTMLElement>(`a[data-href="${activeLink.href}"]`);
    if (el) moveIndicatorTo(el, activeLink.color, activeLink.shadow);
  }, [pathname, mounted, activeLink]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ul
      ref={listRef}
      className="hidden md:flex items-center gap-0.5 relative"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "999px",
        padding: "4px 5px",
        boxShadow:
          "inset 1px 1px 4px rgba(255,255,255,0.4),inset -1px -1px 6px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04)",
        listStyle: "none",
        margin: 0,
      }}
    >
      {/* Sliding indicator */}
      <div
        ref={indicatorRef}
        style={{
          position: "absolute",
          borderRadius: "999px",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0,
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.35)",
          transition:
            "left 0.5s cubic-bezier(0.37,1.95,0.66,0.56),top 0.38s cubic-bezier(0.4,0,0.2,1),width 0.38s cubic-bezier(0.4,0,0.2,1),height 0.38s cubic-bezier(0.4,0,0.2,1),background 0.4s ease-in-out,box-shadow 0.4s ease-in-out,opacity 0.2s ease",
        }}
      />

      {links.map((link) => {
        const isActive = link.href === "/"
          ? activePath === "/"
          : activePath.startsWith(link.href);

        return (
          <li key={link.href} style={{ position: "relative", zIndex: 1 }}>
            <Link
              href={link.href}
              data-href={link.href}
              style={{
                display: "block",
                padding: "7px 15px",
                borderRadius: "999px",
                fontSize: "13.5px",
                fontWeight: isActive ? "700" : "600",
                color: isActive ? "#ffffff" : "#475569",
                textDecoration: "none",
                whiteSpace: "nowrap",
                position: "relative",
                zIndex: 1,
                background: "transparent",
                transition: "color 0.3s ease-in-out",
              }}
              onClick={() => {
                if (!isActive) emitNavProgress(link.color, link.shadow);
              }}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
