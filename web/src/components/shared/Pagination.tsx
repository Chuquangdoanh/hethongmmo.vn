"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** For URL-based navigation (server pages). Provide basePath OR onPageChange. */
  basePath?: string;
  searchParams?: Record<string, string>;
  /** For client-side navigation (client pages). */
  onPageChange?: (page: number) => void;
}

function buildHref(basePath: string, page: number, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...extra, page: String(page) });
  return `${basePath}?${params.toString()}`;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  function PageItem({ page }: { page: number | "..." }) {
    if (page === "...") {
      return <span className="px-2 text-[#71717A] select-none">…</span>;
    }
    const isActive = page === currentPage;
    const cls = `min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:bg-[#1F1F2E] hover:text-[#F4F4F5]"
    }`;

    if (basePath) {
      return (
        <Link href={buildHref(basePath, page, searchParams)} className={cls} aria-current={isActive ? "page" : undefined}>
          {page}
        </Link>
      );
    }
    return (
      <button onClick={() => onPageChange?.(page)} className={cls} aria-current={isActive ? "page" : undefined}>
        {page}
      </button>
    );
  }

  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages;

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-1 py-4">
      {/* Mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage - 1, searchParams)}
            aria-disabled={prevDisabled}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm text-[#A1A1AA] transition-colors ${prevDisabled ? "opacity-40 pointer-events-none" : "hover:bg-[#1F1F2E]"}`}
          >
            <ChevronLeft size={14} /> Trước
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={prevDisabled}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm text-[#A1A1AA] disabled:opacity-40 enabled:hover:bg-[#1F1F2E] transition-colors"
          >
            <ChevronLeft size={14} /> Trước
          </button>
        )}
        <span className="text-sm text-[#A1A1AA]">{currentPage}/{totalPages}</span>
        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage + 1, searchParams)}
            aria-disabled={nextDisabled}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm text-[#A1A1AA] transition-colors ${nextDisabled ? "opacity-40 pointer-events-none" : "hover:bg-[#1F1F2E]"}`}
          >
            Tiếp <ChevronRight size={14} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={nextDisabled}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm text-[#A1A1AA] disabled:opacity-40 enabled:hover:bg-[#1F1F2E] transition-colors"
          >
            Tiếp <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-1">
        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage - 1, searchParams)}
            aria-disabled={prevDisabled}
            className={`p-2 rounded-md text-[#A1A1AA] transition-colors ${prevDisabled ? "opacity-40 pointer-events-none" : "hover:bg-[#1F1F2E]"}`}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={prevDisabled}
            className="p-2 rounded-md text-[#A1A1AA] disabled:opacity-40 enabled:hover:bg-[#1F1F2E] transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {getPages().map((page, i) => (
          <PageItem key={page === "..." ? `e-${i}` : page} page={page} />
        ))}

        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage + 1, searchParams)}
            aria-disabled={nextDisabled}
            className={`p-2 rounded-md text-[#A1A1AA] transition-colors ${nextDisabled ? "opacity-40 pointer-events-none" : "hover:bg-[#1F1F2E]"}`}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={nextDisabled}
            className="p-2 rounded-md text-[#A1A1AA] disabled:opacity-40 enabled:hover:bg-[#1F1F2E] transition-colors"
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </nav>
  );
}
