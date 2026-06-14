"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  videoId: string;
  title: string;
}

function YoutubeModal({ videoId, title, onClose }: Props & { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        aria-label="Đóng"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={20} height={20}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Video container — stop click from bubbling so video clicks don't close modal */}
      <div
        className="relative w-full max-w-4xl mx-4"
        style={{ aspectRatio: "16/9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>,
    document.body,
  );
}

export default function YoutubeEmbed({ videoId, title }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 w-full group cursor-pointer"
        aria-label={`Phát video: ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors gap-3">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#ff0000] shadow-xl group-hover:scale-110 transition-transform duration-200">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28" style={{ marginLeft: "4px" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">
            Nhấn để xem lộ trình
          </span>
        </div>
      </button>

      {open && <YoutubeModal videoId={videoId} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
