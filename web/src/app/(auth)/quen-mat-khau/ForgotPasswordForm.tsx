"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Không thể xử lý yêu cầu.");
        return;
      }
      router.push(`/verify-otp?purpose=RESET_PASSWORD&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[#64748b] mb-1.5">Email tài khoản</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0066ff] focus:outline-none transition-colors"
          placeholder="email@example.com"
          suppressHydrationWarning
        />
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-semibold hover:bg-[#0047cc] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Đang gửi..." : "Gửi mã xác minh"}
      </button>
    </form>
  );
}
