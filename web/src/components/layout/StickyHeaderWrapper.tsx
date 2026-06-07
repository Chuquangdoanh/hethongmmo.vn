"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function StickyHeaderWrapper({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Re-check scroll position on every navigation (resets stale hdr-scrolled state)
  useEffect(() => {
    setScrolled(window.scrollY > 20);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`hdr-sticky${scrolled ? " hdr-scrolled" : ""}`}>
      {children}
    </div>
  );
}
