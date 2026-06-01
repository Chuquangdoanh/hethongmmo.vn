"use client";

import { useState } from "react";
import { Image, X } from "lucide-react";

interface Props {
  src: string;
  alt: string;
}

export default function ImagePreviewButton({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-[#e2e8f0] text-[#475569] hover:border-[#0066ff] hover:text-[#0066ff] transition-colors"
      >
        <Image size={11} /> Xem ảnh
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div
            className="relative z-10 max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-semibold transition-colors"
            >
              <X size={16} /> Đóng
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="w-full h-auto rounded-xl shadow-2xl max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
