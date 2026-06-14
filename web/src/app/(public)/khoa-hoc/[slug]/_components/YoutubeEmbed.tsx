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

  const handleWatch = () => {
    window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/85 px-4"
      onClick={onClose}
    >
      {/* Nút X */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 active:bg-white/40 text-white transition-colors"
        aria-label="Đóng"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={22} height={22}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Card nội dung */}
      <div
        className="relative w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thumbnail */}
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* Overlay mờ */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Icon YouTube ở giữa */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#ff0000]/90 shadow-xl">
              <svg viewBox="0 0 24 24" fill="white" width="28" height="28" style={{ marginLeft: "4px" }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tên video + nút xem */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{title}</p>
          <button
            type="button"
            onClick={handleWatch}
            className="w-full flex items-center justify-center gap-2 bg-[#ff0000] hover:bg-[#cc0000] active:bg-[#aa0000] text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18" style={{ marginLeft: "2px" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
            Xem lộ trình ngay
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-white/50 hover:text-white/80 text-xs py-1 transition-colors"
          >
            Đóng
          </button>
        </div>
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
          className="w-full h-full object-cover rounded-xl"
          loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors gap-3 rounded-xl">
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
