"use client";

import { useEffect } from "react";

export default function HeroScrollObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document
        .querySelectorAll<HTMLElement>(
          ".anim-fade-up,.anim-slide-left,.anim-slide-right,.anim-scale-in,.anim-fade-in",
        )
        .forEach((el) => {
          el.style.opacity = "1";
        });
      return;
    }

    const els = document.querySelectorAll<HTMLElement>(
      ".anim-fade-up,.anim-slide-left,.anim-slide-right,.anim-scale-in,.anim-fade-in",
    );

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return null;
}
