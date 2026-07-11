"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

export interface ProductImageGalleryProps {
  /** Ảnh đã qua r2Url() + dedupe + ảnh bìa đứng đầu — có thể rỗng (chưa có ảnh nào) */
  images: string[];
  alt: string;
  /** CSS aspect-ratio của khung ảnh, ví dụ "16/9", "4/3" */
  aspectRatio: string;
  /**
   * "plain-contain": 1 ảnh, object-contain (kho-tai-nguyen/san-pham, tai-nguyen-mmo/san-pham, kfb)
   * "blurred-cover": ảnh nền mờ phóng to + ảnh chính object-cover (kho-tai-nguyen/[slug], tai-nguyen-mmo/[slug])
   */
  variant: "plain-contain" | "blurred-cover";
  /** Icon hiển thị khi không có ảnh nào — element đã dựng sẵn (không phải function) */
  placeholderIcon: React.ReactNode;
  /** FavoriteButton, banner "HẾT HÀNG"... — JSX đã dựng sẵn từ Server Component, đặt absolute trong khung ảnh */
  overlays?: React.ReactNode;
}

export default function ProductImageGallery({
  images,
  alt,
  aspectRatio,
  variant,
  placeholderIcon,
  overlays,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const hasGallery = images.length > 1;
  const safeIndex = Math.min(selectedIndex, Math.max(images.length - 1, 0));
  const currentSrc = images[safeIndex];

  useEffect(() => {
    if (!zoomOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomOpen(false);
      if (e.key === "ArrowLeft") setSelectedIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setSelectedIndex((i) => (i + 1) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, images.length]);

  // Chặn scroll trang nền khi overlay phóng to đang mở
  useEffect(() => {
    if (!zoomOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [zoomOpen]);

  function goPrev(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIndex((i) => (i - 1 + images.length) % images.length);
  }
  function goNext(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIndex((i) => (i + 1) % images.length);
  }

  return (
    <div>
      <div className="rounded-2xl bg-[#f1f5f9] overflow-hidden relative" style={{ aspectRatio }}>
        {currentSrc ? (
          variant === "blurred-cover" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc} alt="" aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-55 pointer-events-none"
                loading="lazy" decoding="async"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc} alt={alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager" decoding="async"
              />
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSrc} alt={alt}
              className="w-full h-full object-contain"
              loading="eager" decoding="async"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {placeholderIcon}
          </div>
        )}

        {overlays}

        {hasGallery && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
              style={{ zIndex: 30 }}
            >
              <ChevronLeft size={18} className="text-[#1F2937]" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Ảnh sau"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
              style={{ zIndex: 30 }}
            >
              <ChevronRight size={18} className="text-[#1F2937]" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }}
              aria-label="Phóng to ảnh"
              className="absolute bottom-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
              style={{ zIndex: 30 }}
            >
              <Maximize2 size={16} className="text-[#1F2937]" />
            </button>
          </>
        )}
      </div>

      {hasGallery && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden border-2 transition-colors ${
                i === safeIndex ? "border-[#0066FF]" : "border-transparent hover:border-[#B7D0F8]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && hasGallery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setZoomOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain scale-150"
          />
          {/* Nút điều hướng + đóng — luôn neo theo viewport, không phụ thuộc kích thước ảnh phóng to */}
          <button
            onClick={goPrev}
            aria-label="Ảnh trước"
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={goNext}
            aria-label="Ảnh sau"
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={22} />
          </button>
          <button
            onClick={() => setZoomOpen(false)}
            className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
