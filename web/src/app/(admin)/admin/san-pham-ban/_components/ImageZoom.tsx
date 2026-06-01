"use client";

import { useEffect, useState } from "react";

interface Props {
  src: string;
  alt: string;
}

export default function ImageZoom({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="h-40 w-auto max-w-xs rounded-xl border border-gray-200 object-cover shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-lg"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
