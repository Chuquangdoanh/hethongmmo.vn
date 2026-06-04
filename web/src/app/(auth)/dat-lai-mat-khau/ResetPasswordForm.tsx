"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 12) {
      setError("Mật khẩu phải có ít nhất 12 ký tự.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Không thể đặt lại mật khẩu.");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-sm text-[#0f172a] font-medium">Đặt lại mật khẩu thành công!</p>
        <p className="text-xs text-[#64748b]">Bạn có thể đăng nhập ngay bây giờ.</p>
        <Link
          href="/dang-nhap"
          className="block w-full py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-medium hover:bg-[#0047cc] transition-colors"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (!email || !code) {
    return (
      <div className="text-center">
        <p className="text-sm text-[#EF4444] mb-4">Liên kết không hợp lệ. Vui lòng thử lại.</p>
        <Link href="/quen-mat-khau" className="text-xs text-[#0066ff] hover:text-[#0047cc]">
          ← Quay lại
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[#64748b] mb-1.5">Mật khẩu mới</label>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] focus:border-[#0066ff] focus:outline-none transition-colors"
          placeholder="Tối thiểu 12 ký tự, có chữ hoa, số, ký tự đặc biệt"
          suppressHydrationWarning
        />
      </div>

      <div>
        <label className="block text-xs text-[#64748b] mb-1.5">Xác nhận mật khẩu</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] focus:border-[#0066ff] focus:outline-none transition-colors"
          placeholder="Nhập lại mật khẩu"
          suppressHydrationWarning
        />
      </div>

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-semibold hover:bg-[#0047cc] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Đang xử lý..." : "Xác nhận mật khẩu mới"}
      </button>
    </form>
  );
}
