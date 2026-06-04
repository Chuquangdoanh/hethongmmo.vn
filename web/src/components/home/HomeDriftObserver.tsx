"use client";

import { useEffect } from "react";

/**
 * Độc lập với HeroScrollObserver — chỉ animate ở section level.
 * HeroScrollObserver đã xử lý anim-* cho inner elements (opacity).
 * Component này chỉ dùng translateY trên <section> để tránh nhân opacity.
 *
 * Quy tắc: namespace cqd-drift, prefers-reduced-motion, IntersectionObserver,
 * unobserve sau animation, không dùng window.scroll.
 */
export default function HomeDriftObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          const el = target as HTMLElement;
          el.style.transform = "";
          el.classList.add("cqd-drift");
          observer.unobserve(el);
          el.addEventListener(
            "animationend",
            () => { el.style.willChange = "auto"; },
            { once: true },
          );
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px -20px 0px" },
    );

    sections.forEach((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      // Bỏ qua section đã visible trong viewport lúc mount
      const alreadyVisible = top < window.innerHeight * 0.95 && bottom > 0;
      if (alreadyVisible) return;
      section.style.transform = "translateY(18px)";
      section.style.willChange = "transform";
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
