"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * Đặt component này bên trong layout, bọc {children} (page content).
 * KHÔNG đặt ở root layout — sẽ bọc cả Header/Footer gây nháy.
 *
 * useLayoutEffect: fire SAU React commit DOM nhưng TRƯỚC browser paint.
 * animation-fill-mode:both: opacity:0 áp dụng ngay trước frame đầu tiên
 * → không còn white flash giữa các trang.
 */
export default function PageTransitionWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    // Bỏ qua mount đầu tiên — hard-load handled by body { animation } in globals.css
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Remove → force reflow → re-add → animation restart
    el.classList.remove("page-entering");
    void el.offsetHeight;
    el.classList.add("page-entering");

    const timer = setTimeout(() => el.classList.remove("page-entering"), 450);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {children}
    </div>
  );
}
