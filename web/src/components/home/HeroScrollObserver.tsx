"use client";

import { useEffect } from "react";

export default function HeroScrollObserver() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── 1. Scroll Reveal ──
    const animEls = document.querySelectorAll<HTMLElement>(
      ".anim-fade-up,.anim-slide-left,.anim-slide-right,.anim-scale-in,.anim-fade-in,.anim-card-in",
    );

    if (reducedMotion) {
      animEls.forEach((el) => {
        el.style.opacity = "1";
        el.style.willChange = "auto";
      });
    }

    const markVisible = (el: HTMLElement) => {
      el.classList.add("visible");
      el.addEventListener(
        "animationend",
        () => { el.style.willChange = "auto"; },
        { once: true },
      );
    };

    // rootMargin: trigger 60px before element fully enters viewport
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            markVisible(e.target as HTMLElement);
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    if (!reducedMotion) {
      const vp = window.innerHeight;
      animEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Element already in viewport — add .visible immediately (sync, no IO delay)
        if (rect.bottom > 0 && rect.top < vp - 40 && rect.height > 0) {
          markVisible(el);
        } else {
          // Below fold — use IO for scroll-triggered reveal
          revealObs.observe(el);
        }
      });
    }

    // ── 2. Counter Animation ──
    const counterEls = document.querySelectorAll<HTMLElement>("[data-count]");

    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const rawCount = el.dataset.count ?? "0";
          const target = parseFloat(rawCount);
          const suffix = el.dataset.suffix ?? "";
          const isFloat = rawCount.includes(".");
          counterObs.unobserve(el);

          if (reducedMotion) {
            el.textContent = isFloat
              ? target.toFixed(1) + suffix
              : target.toLocaleString("vi-VN") + suffix;
            return;
          }

          const duration = 1400;
          const startTime = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = isFloat
              ? current.toFixed(1) + suffix
              : Math.floor(current).toLocaleString("vi-VN") + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 },
    );

    counterEls.forEach((el) => {
      const rawCount = el.dataset.count ?? "0";
      const suffix = el.dataset.suffix ?? "";
      const isFloat = rawCount.includes(".");
      if (reducedMotion) {
        const target = parseFloat(rawCount);
        el.textContent = isFloat
          ? target.toFixed(1) + suffix
          : target.toLocaleString("vi-VN") + suffix;
      } else {
        el.textContent = isFloat ? "0.0" + suffix : "0" + suffix;
        counterObs.observe(el);
      }
    });

    // ── 3. Parallax Hero Grid ──
    const gridMask = document.querySelector<HTMLElement>(".hero-grid-mask");
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        if (gridMask) {
          gridMask.style.transform = `translateY(${window.scrollY * 0.12}px)`;
        }
        rafId = null;
      });
    };

    if (!reducedMotion && gridMask) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      revealObs.disconnect();
      counterObs.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
