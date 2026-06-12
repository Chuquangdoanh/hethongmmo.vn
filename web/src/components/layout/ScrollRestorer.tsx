"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Scroll lên top khi đổi pathname (chuyển trang), nhưng không scroll khi chỉ đổi searchParams (filter)
export default function ScrollRestorer() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
