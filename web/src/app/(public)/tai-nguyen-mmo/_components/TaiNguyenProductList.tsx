"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, LayoutList, ShoppingBag, Package,
  ShoppingCart, Pencil, CheckCircle,
} from "lucide-react";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { SortSelect } from "./SortSelect";

export type TaiNguyenProductItem = {
  id: string;
  kind: "mmo" | "seller" | "kfb";
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  salesCount: number;
  available: number;
  isNew: boolean;
  isHot: boolean;
  href: string;
  sellerName: string;
  purchasedByMe: boolean;
  reviewedByMe: boolean;
  category: string;
  favoriteCount: number;
  isFavorite: boolean;
};

function StarBar({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? "text-warning" : "text-white/30"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function GridCard({ p }: { p: TaiNguyenProductItem }) {
  return (
    <div className="relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col">
      <Link href={p.href} className="absolute inset-0 z-1" aria-label={`Xem chi tiết ${p.name}`} />

      <div className="block relative shrink-0">
        <div className="aspect-video bg-[#f1f5f9] overflow-hidden" style={{ position: "relative" }}>
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2Url(p.imageUrl)}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {p.kind === "seller" ? (
                <ShoppingBag size={36} strokeWidth={1.25} className="text-[#94a3b8]" />
              ) : (
                <Package size={36} strokeWidth={1.25} className="text-[#94a3b8]" />
              )}
            </div>
          )}

          {p.isHot ? (
            <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-danger text-white uppercase tracking-wide shadow">
              HOT
            </span>
          ) : p.isNew ? (
            <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#22c55e] text-white uppercase tracking-wide shadow">
              NEW
            </span>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/65 to-transparent px-2.5 pt-5 pb-2">
            {p.reviewCount > 0 ? (
              <div className="flex items-center gap-1">
                <StarBar rating={p.rating} size="xs" />
                <span className="text-[11px] font-bold text-white leading-none">{p.rating.toFixed(1)}</span>
                <span className="text-[11px] text-white/60">({p.reviewCount})</span>
              </div>
            ) : (
              <span className="text-[10px] text-white/50 italic">Chưa có đánh giá</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-1.5 flex-1">
        <h3 className="text-sm font-bold text-text-dark line-clamp-2 leading-snug">{p.name}</h3>

        <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5">
            <ShoppingCart size={9} strokeWidth={2} />
            <span>Đã bán <strong className="text-[#374151]">{p.salesCount}</strong></span>
          </span>
          <span className="text-[#d1d5db]">·</span>
          <span>Còn <strong className="text-[#374151]">{p.available}</strong></span>
        </div>

        {p.purchasedByMe && !p.reviewedByMe && (
          <Link
            href={p.href}
            className="relative z-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
          >
            <Pencil size={9} strokeWidth={2} /> Đánh giá
          </Link>
        )}
        {p.purchasedByMe && p.reviewedByMe && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] w-fit">
            <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
          </span>
        )}

        <div className="mt-auto pt-1.5 sm:pt-2">
          <span className="text-xs font-extrabold text-[#e11d48] whitespace-nowrap leading-none">
            {formatVnd(p.price)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ListCard({ p }: { p: TaiNguyenProductItem }) {
  return (
    <div className="relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-row">
      <Link href={p.href} className="absolute inset-0 z-1" aria-label={`Xem chi tiết ${p.name}`} />

      {/* Thumbnail */}
      <div className="shrink-0 w-[120px] sm:w-[160px] self-stretch relative bg-[#f1f5f9] overflow-hidden">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2Url(p.imageUrl)}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {p.kind === "seller" ? (
                <ShoppingBag size={28} strokeWidth={1.25} className="text-[#94a3b8]" />
              ) : (
                <Package size={28} strokeWidth={1.25} className="text-[#94a3b8]" />
              )}
            </div>
          )}
          {p.isHot && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-danger text-white uppercase">HOT</span>
          )}
          {!p.isHot && p.isNew && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#22c55e] text-white uppercase">NEW</span>
          )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-3 flex flex-col min-h-24">

        {/* Row 1: tên + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 min-w-0 text-sm font-bold text-text-dark line-clamp-2 leading-snug">{p.name}</h3>
          {p.reviewCount > 0 && (
            <div className="shrink-0 flex items-center gap-1">
              <StarBar rating={p.rating} size="xs" />
              <span className="text-[11px] font-semibold text-[#374151]">{p.rating.toFixed(1)}</span>
              <span className="text-[10px] text-[#94a3b8]">({p.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Row 2: danh mục */}
        <p className="text-[11px] text-text-muted mt-1">{p.category}</p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Row 2: stats */}
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="flex items-center gap-0.5">
            <ShoppingCart size={8} strokeWidth={2} />
            <span>Đã bán <strong className="text-[#374151]">{p.salesCount}</strong></span>
          </span>
          <span className="text-[#d1d5db]">·</span>
          <span>Còn <strong className="text-[#374151]">{p.available}</strong></span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#f1f5f9] my-2" />

        {/* Row 3: giá + review action */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-extrabold text-[#e11d48] leading-none">
            {formatVnd(p.price)}
          </span>
          {p.purchasedByMe && !p.reviewedByMe && (
            <Link
              href={p.href}
              className="relative z-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Pencil size={9} strokeWidth={2} /> Đánh giá
            </Link>
          )}
          {p.purchasedByMe && p.reviewedByMe && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
              <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaiNguyenProductList({
  products,
}: {
  products: TaiNguyenProductItem[];
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <SortSelect />
        <div className="flex items-center gap-0.5 bg-white rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Dạng lưới"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "grid" ? "bg-primary text-white" : "text-text-muted hover:text-primary"
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title="Dạng danh sách"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list" ? "bg-primary text-white" : "text-text-muted hover:text-primary"
            }`}
          >
            <LayoutList size={15} />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {products.map((p) => (
            <GridCard key={`${p.kind}-${p.id}`} p={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <ListCard key={`${p.kind}-${p.id}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
