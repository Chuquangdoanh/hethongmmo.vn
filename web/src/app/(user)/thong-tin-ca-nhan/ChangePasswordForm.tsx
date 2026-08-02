"use client";

import { useState } from "react";
import { KeyRound, Mail, AlertTriangle, CheckCircle } from "lucide-react";

type Step = "request" | "verify";

export default function ChangePasswordForm() {
  const [step, setStep]               = useState<Step>("request");
  const [currentPwd, setCurrentPwd]   = useState("");
  const [otp, setOtp]                 = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirm, setConfirm]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  // Bước 1: verify mật khẩu hiện tại → gửi OTP về email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password/send-otp", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Không thể gửi mã xác nhận.");
        return;
      }
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  // Bước 2: đổi mật khẩu với OTP
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (newPwd.length < 12) {
      setError("Mật khẩu mới phải có ít nhất 12 ký tự.");
      return;
    }
    if (otp.length !== 6) {
      setError("Mã OTP gồm 6 chữ số.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
          confirmPassword: confirm,
          otpCode: otp,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Đổi mật khẩu thất bại.");
        return;
      }
      setSuccess(true);
      setStep("request");
      setCurrentPwd(""); setOtp(""); setNewPwd(""); setConfirm("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
          <KeyRound size={14} className="text-orange-500" />
        </div>
        Đổi mật khẩu
      </h2>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
          <CheckCircle size={13} className="text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700">Đổi mật khẩu thành công!</p>
        </div>
      )}

      {/* ── Bước 1: nhập mật khẩu hiện tại ── */}
      {step === "request" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              suppressHydrationWarning
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Mail size={14} />
            {loading ? "Đang gửi..." : "Gửi mã xác nhận qua Email"}
          </button>
        </form>
      )}

      {/* ── Bước 2: nhập OTP + mật khẩu mới ── */}
      {step === "verify" && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
            <p className="text-xs text-blue-700">
              Mã xác nhận đã được gửi đến email của bạn. Nhập mã và mật khẩu mới bên dưới.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Mã OTP (6 chữ số)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              suppressHydrationWarning
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors tracking-widest"
              placeholder="123456"
            />
          </div>

          {[
            { label: "Mật khẩu mới",           value: newPwd,  set: setNewPwd  },
            { label: "Xác nhận mật khẩu mới",  value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => set(e.target.value)}
                required
                suppressHydrationWarning
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <KeyRound size={14} />
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("request"); setError(""); setOtp(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Gửi lại mã
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
