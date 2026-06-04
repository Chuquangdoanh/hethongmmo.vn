"use client";

import { useEffect } from "react";

// RAF smooth scroll — không dùng behavior:'smooth' (không kiểm soát tốc độ)
function smoothScrollTo(targetY: number, duration = 700) {
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

function getGridTarget() {
  const el = document.getElementById("khoa-hoc-grid");
  if (!el) return null;
  const HEADER_OFFSET = 80;
  return el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
}

/**
 * Xử lý scroll nhẹ nhàng cho trang khóa học:
 * 1. Khi navigate có ?category= → tự scroll xuống grid sau khi trang render
 * 2. Click "Khám phá ngay" (href="#khoa-hoc-grid") → RAF smooth scroll thay anchor jump
 *
 * Không sửa HTML hiện có — component độc lập, returns null.
 */
export default function CourseScrollHelper() {
  useEffect(() => {
    // ── 1. Category navigation: scroll to grid after page load ──
    const params = new URLSearchParams(window.location.search);
    if (params.has("category")) {
      // Delay nhỏ để đợi DOM render xong trước khi đo vị trí
      const tid = setTimeout(() => {
        const targetY = getGridTarget();
        if (targetY !== null) smoothScrollTo(targetY, 700);
      }, 120);
      return () => clearTimeout(tid);
    }

    // ── 2. Intercept anchor click "Khám phá ngay" → RAF smooth ──
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      const targetY = getGridTarget();
      if (targetY !== null) smoothScrollTo(targetY, 650);
    };

    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href="#khoa-hoc-grid"]');
    anchors.forEach((a) => a.addEventListener("click", handleClick));
    return () => anchors.forEach((a) => a.removeEventListener("click", handleClick));
  }, []);

  return null;
}
