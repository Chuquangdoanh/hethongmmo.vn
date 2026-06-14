"use client";

interface Props {
  videoId: string;
  title: string;
}

export default function YoutubeEmbed({ videoId, title }: Props) {
  const openPopup = () => {
    const w = 854;
    const h = 480;
    const left = Math.round((window.screen.width - w) / 2);
    const top = Math.round((window.screen.height - h) / 2);
    window.open(
      `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`,
      "youtube_player",
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=no`,
    );
  };

  return (
    <button
      type="button"
      onClick={openPopup}
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
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#ff0000] shadow-xl group-hover:scale-110 transition-transform duration-200">
          <svg viewBox="0 0 24 24" fill="white" width="28" height="28" style={{ marginLeft: "4px" }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
