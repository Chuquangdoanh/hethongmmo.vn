"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error.digest ?? "no-digest");
    } else {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 h-16 w-16 rounded-full bg-[#1F1F2E] border border-[#2A2A38] flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-7 w-7 text-[#EF4444]"
        >
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          <path d="M12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-[#F4F4F5] mb-2">Có lỗi xảy ra</h1>
      <p className="text-[#71717A] text-sm mb-1 max-w-sm">
        Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.
      </p>
      {error.digest && (
        <p className="text-[#3F3F4E] text-xs mb-6 font-mono">ID: {error.digest}</p>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-md bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors"
        >
          Thử lại
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-[#2A2A38] text-[#A1A1AA] text-sm hover:border-[#7C3AED] hover:text-[#F4F4F5] transition-colors"
        >
          Trang chủ
        </Link>
      </div>
    </div>
  );
}
