"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Các cặp pathname chuyển qua lại không scroll lên top (tab navigation giữa cùng 1 section)
const PRESERVE_SCROLL_PAIRS: [string, string][] = [
  ["/tai-nguyen-mmo", "/tai-nguyen-mmo/gian-hang"],
];

function isPreservedTransition(from: string, to: string): boolean {
  return PRESERVE_SCROLL_PAIRS.some(
    ([a, b]) => (from === a && to === b) || (from === b && to === a)
  );
}

// Scroll lên top khi đổi pathname (chuyển trang), nhưng không scroll khi chỉ đổi searchParams (filter)
// hoặc khi chuyển giữa các tab cùng section (PRESERVE_SCROLL_PAIRS)
export default function ScrollRestorer() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;
    if (isPreservedTransition(prev, pathname)) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
