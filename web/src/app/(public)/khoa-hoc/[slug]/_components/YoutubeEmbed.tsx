"use client";

import { useState } from "react";

interface Props {
  videoId: string;
  title: string;
}

export default function YoutubeEmbed({ videoId, title }: Props) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
          aria-label="Đóng video"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
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
      <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-all duration-300">
        <div
          className="w-17 h-17 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 bg-white/20 group-hover:bg-white/30 border border-white/50 group-hover:border-white/80"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.30)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26" style={{ marginLeft: "3px" }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
