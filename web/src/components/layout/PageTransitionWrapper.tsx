"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";

/**
 * Re-triggers a fade-up entrance animation on every client-side route change.
 * First render is skipped — body pageFadeIn handles initial hard load.
 */
export default function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // Skip first mount — hard-load entrance handled by body { animation: pageFadeIn }
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Force reflow before re-adding class so browser re-runs the animation
    el.classList.remove("page-entering");
    void el.offsetHeight;
    el.classList.add("page-entering");

    const timer = setTimeout(() => el.classList.remove("page-entering"), 620);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div ref={ref} style={{ minHeight: "100%", display: "contents" }}>
      {children}
    </div>
  );
}
