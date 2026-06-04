"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
  searchParams?: Record<string, string>;
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

  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages;

  const arrowBase =
    "inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-150 select-none";
  const arrowEnabled =
    "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 shadow-sm";
  const arrowDisabled =
    "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed pointer-events-none";

  function PageItem({ page }: { page: number | "..." }) {
    if (page === "...") {
      return (
        <span className="inline-flex items-center justify-center w-9 h-9 text-sm text-slate-400 select-none">
          ···
        </span>
      );
    }

    const isActive = page === currentPage;
    const itemBase = "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-150 select-none border";
    const itemActive = "bg-[#0066ff] border-[#0066ff] text-white shadow-[0_2px_8px_rgba(0,102,255,0.28)]";
    const itemIdle = "bg-white border-slate-200 text-slate-600 hover:border-[#0066ff] hover:text-[#0066ff] hover:bg-blue-50 shadow-sm";

    const cls = `${itemBase} ${isActive ? itemActive : itemIdle}`;

    if (basePath) {
      return (
        <Link
          href={buildHref(basePath, page, searchParams)}
          className={cls}
          aria-current={isActive ? "page" : undefined}
        >
          {page}
        </Link>
      );
    }
    return (
      <button
        onClick={() => onPageChange?.(page)}
        className={cls}
        aria-current={isActive ? "page" : undefined}
      >
        {page}
      </button>
    );
  }

  return (
    <nav aria-label="Phân trang" className="flex flex-col items-center gap-3 py-4">

      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-1.5">
        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage - 1, searchParams)}
            aria-disabled={prevDisabled}
            aria-label="Trang trước"
            className={`${arrowBase} ${prevDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={prevDisabled}
            aria-label="Trang trước"
            className={`${arrowBase} ${prevDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
        )}

        <div className="flex items-center gap-1">
          {getPages().map((page, i) => (
            <PageItem key={page === "..." ? `e-${i}` : page} page={page} />
          ))}
        </div>

        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage + 1, searchParams)}
            aria-disabled={nextDisabled}
            aria-label="Trang sau"
            className={`${arrowBase} ${nextDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={nextDisabled}
            aria-label="Trang sau"
            className={`${arrowBase} ${nextDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden items-center gap-3">
        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage - 1, searchParams)}
            aria-disabled={prevDisabled}
            className={`${arrowBase} gap-1 px-3 w-auto text-sm font-medium ${prevDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Trước
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={prevDisabled}
            className={`${arrowBase} gap-1 px-3 w-auto text-sm font-medium ${prevDisabled ? arrowDisabled : arrowEnabled}`}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Trước
          </button>
        )}

        <span className="text-sm font-semibold text-slate-500 tabular-nums">
          {currentPage} <span className="text-slate-300">/</span> {totalPages}
        </span>

        {basePath ? (
          <Link
            href={buildHref(basePath, currentPage + 1, searchParams)}
            aria-disabled={nextDisabled}
            className={`${arrowBase} gap-1 px-3 w-auto text-sm font-medium ${nextDisabled ? arrowDisabled : arrowEnabled}`}
          >
            Tiếp
            <ChevronRight size={14} strokeWidth={2} />
          </Link>
        ) : (
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={nextDisabled}
            className={`${arrowBase} gap-1 px-3 w-auto text-sm font-medium ${nextDisabled ? arrowDisabled : arrowEnabled}`}
          >
            Tiếp
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Page indicator */}
      <p className="text-xs text-slate-400 tabular-nums">
        Trang <span className="font-semibold text-slate-500">{currentPage}</span> / {totalPages}
      </p>

    </nav>
  );
}
