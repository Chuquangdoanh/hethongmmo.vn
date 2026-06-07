"use client";

import { useEffect } from "react";

function smoothScrollTo(targetY: number, duration = 900) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 8) return;
  let startTime: number | null = null;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const animate = (now: number) => {
    if (startTime === null) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function getCardTarget() {
  const grid = document.getElementById("khoa-hoc-grid");
  if (!grid) return null;
  const firstCard = grid.querySelector<HTMLElement>("a[href*='/khoa-hoc/']");
  const target = firstCard ?? grid;
  return target.getBoundingClientRect().top + window.scrollY - 72;
}

// Intercept "Khám phá ngay" (href="#khoa-hoc-grid") → RAF smooth scroll
export default function CourseScrollHelper() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      const targetY = getCardTarget();
      if (targetY !== null) smoothScrollTo(targetY);
    };
    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href="#khoa-hoc-grid"]');
    anchors.forEach((a) => a.addEventListener("click", handleClick));
    return () => anchors.forEach((a) => a.removeEventListener("click", handleClick));
  }, []);
  return null;
}
