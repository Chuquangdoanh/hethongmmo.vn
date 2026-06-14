"use client";

import { useState, useEffect } from "react";

const KOC_GALLERY = [
  { label: "IDOLS SÁNG CON TV", sub: "100.000k Followers", src: "/images/sangcon.jpg" },
  { label: "IDLOS VIỆT XĂM",    sub: "100.000K Followers",  src: "/images/vietxam.jpg" },
  { label: "Đối Tác Kiên Love", sub: "54.000K Followers",  src: "/images/kienlove.jpg" },
];

export default function KocGalleryClient() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="fa-koc-grid">
        {KOC_GALLERY.map((koc) => (
          <div
            key={koc.label}
            style={{
              borderRadius: 16, aspectRatio: "4/3",
              position: "relative", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,.18)",
              cursor: "zoom-in",
            }}
            onClick={() => setLightbox({ src: koc.src, alt: koc.label })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={koc.src}
              alt={koc.label}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.7) 100%)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px", textAlign: "center", pointerEvents: "none" }}>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 14, margin: "0 0 4px" }}>{koc.label}</p>
              <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12, margin: 0 }}>{koc.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        <div style={{ width: 24, height: 6, borderRadius: 3, background: "#6366f1" }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: "#cbd5e1" }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: "#cbd5e1" }} />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,.88)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,.15)",
              border: "1.5px solid rgba(255,255,255,.35)",
              cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,.6)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
