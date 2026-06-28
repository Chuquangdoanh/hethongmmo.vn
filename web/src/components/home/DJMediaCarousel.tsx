"use client";
import { useEffect, useRef, useState } from "react";
import { r2Url } from "@/lib/utils/image-url";

interface Props {
  images: string[];
  fallbackUrl?: string;
  alt?: string;
}

export default function DJMediaCarousel({ images, fallbackUrl, alt = "DJ Media" }: Props) {
  const slides = images.length > 0 ? images : fallbackUrl ? [fallbackUrl] : [];
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const total = slides.length;

  useEffect(() => {
    if (total <= 1 || reducedMotion) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, reducedMotion]);

  if (slides.length === 0) {
    return (
      <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: "24px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Chưa có ảnh</span>
      </div>
    );
  }

  function handleClick() {
    if (total <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((prev) => (prev + 1) % total);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 3000);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative", width: "100%", aspectRatio: "4/3",
        borderRadius: "24px", overflow: "hidden",
        cursor: total > 1 ? "pointer" : "default",
      }}
    >
      {/* Slides */}
      {slides.map((src, i) => (
        <div
          key={i}
          aria-hidden={i !== current}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === current ? 1 : 0,
            transform: i === current ? "scale(1)" : "scale(1.03)",
            transition: reducedMotion ? "none" : "opacity 0.65s ease, transform 0.65s ease",
            willChange: "opacity, transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r2Url(src) || src}
            alt={`${alt} ${i + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
