"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => void signOut({ callbackUrl: "/dang-nhap" })}
      className="text-xs text-[#94a3b8] hover:text-[#64748b] underline transition-colors"
    >
      Đăng xuất tài khoản này
    </button>
  );
}
