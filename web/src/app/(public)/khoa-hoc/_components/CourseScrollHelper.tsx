"use client";

import { useEffect } from "react";

// Intercept "Khám phá ngay" (href="#khoa-hoc-grid") → native scrollIntoView (không giật trên mobile)
export default function CourseScrollHelper() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      const grid = document.getElementById("khoa-hoc-grid");
      if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href="#khoa-hoc-grid"]');
    anchors.forEach((a) => a.addEventListener("click", handleClick));
    return () => anchors.forEach((a) => a.removeEventListener("click", handleClick));
  }, []);
  return null;
}
