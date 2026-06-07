"use client";

import { ShoppingCart } from "lucide-react";

export default function SidebarRegisterButton() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent("scroll-to-course-register"));
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg, #C53030, #9B1C1C)", boxShadow: "0 4px 14px rgba(197,48,48,0.35)" }}
    >
      <ShoppingCart size={15} strokeWidth={2} />
      Đăng ký ngay
    </button>
  );
}
