"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * Đặt bên trong từng sub-layout, bọc {children}.
 * KHÔNG đặt ở root layout — header/footer sẽ bị kéo vào animation.
 *
 * Kỹ thuật:
 * 1. transform:translateZ(0) → tạo GPU composite layer ngay khi mount,
 *    browser không cần repaint khi animation chạy — loại bỏ white flash.
 * 2. useLayoutEffect → fire SAU React DOM commit, TRƯỚC browser paint,
 *    đảm bảo opacity:0 có mặt trước frame đầu tiên của trang mới.
 * 3. will-change được gán trực tiếp trên animation class (globals.css).
 */
export default function PageTransitionWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const ref      = useRef<HTMLDivElement>(null);
  const mounted  = useRef(false);

  useLayoutEffect(() => {
    // Hard load: body { animation: pt-fade-in } trong globals.css đã xử lý
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Set opacity:0 ngay lập tức qua inline style — phòng trường hợp
    // animation-fill-mode chưa kịp áp trước frame đầu
    el.style.opacity = "0";

    // Remove → force reflow → re-add để CSS animation restart từ from {}
    el.classList.remove("page-entering");
    void el.offsetHeight;
    el.classList.add("page-entering");

    // Xóa inline style: nhường quyền điều khiển opacity cho animation
    el.style.opacity = "";

    const timer = setTimeout(() => el.classList.remove("page-entering"), 380);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      ref={ref}
      className={className}
      // transform:translateZ(0) → GPU composite layer ngay từ đầu
      // tránh browser tạo layer mới khi animation bắt đầu (gây flash)
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        transform: "translateZ(0)",
      }}
    >
      {children}
    </div>
  );
}
