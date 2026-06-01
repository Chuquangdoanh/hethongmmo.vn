"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PendingOrdersBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/orders/pending-count");
        if (res.ok) {
          const json = (await res.json()) as { data?: { count: number } };
          if (typeof json.data?.count === "number") setCount(json.data.count);
        }
      } catch {
        // silently ignore
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/admin/orders"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      <span>📦</span>
      <span>Đơn hàng</span>
      {count > 0 && (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
