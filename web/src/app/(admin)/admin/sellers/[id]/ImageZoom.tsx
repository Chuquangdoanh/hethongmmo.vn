"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
}

export default function ImageZoom({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative group inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-32 rounded-lg border border-gray-200 object-cover cursor-zoom-in"
          onClick={() => setOpen(true)}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Phóng to"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
