"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { subscribeNavProgress } from "@/lib/utils/nav-progress";

type Phase = "idle" | "loading" | "done";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const colorRef = useRef({ color: "", shadow: "" });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevPath = useRef(pathname);
  const isActive = useRef(false);

  useEffect(() => {
    return subscribeNavProgress((color, shadow) => {
      clearTimeout(hideTimer.current);
      clearTimeout(fallbackTimer.current);
      colorRef.current = { color, shadow };
      isActive.current = true;
      setPhase("loading");

      // Auto-complete fallback if pathname never changes (same page click, etc.)
      fallbackTimer.current = setTimeout(() => {
        isActive.current = false;
        setPhase("done");
        hideTimer.current = setTimeout(() => setPhase("idle"), 600);
      }, 3000);
    });
  }, []);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    if (!isActive.current) return;

    clearTimeout(fallbackTimer.current);
    isActive.current = false;
    setPhase("done");
    hideTimer.current = setTimeout(() => setPhase("idle"), 600);
  }, [pathname]);

  if (phase === "idle") return null;

  const { color, shadow } = colorRef.current;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 99999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          background: color,
          boxShadow: `0 0 12px ${shadow}, 0 0 5px ${shadow}`,
          width: phase === "done" ? "100%" : "70%",
          opacity: phase === "done" ? 0 : 1,
          transition:
            phase === "done"
              ? "width 0.25s ease-out, opacity 0.35s ease 0.1s"
              : "width 2.5s cubic-bezier(0.05, 0.85, 0.1, 1)",
          transformOrigin: "left",
        }}
      />
    </div>
  );
}
