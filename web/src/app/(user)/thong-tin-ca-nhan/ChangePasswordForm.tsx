"use client";

import { useState } from "react";
import { KeyRound, AlertTriangle, CheckCircle } from "lucide-react";

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPwd !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (form.newPwd.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPwd }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Đổi mật khẩu thất bại.");
        return;
      }
      setSuccess(true);
      setForm({ current: "", newPwd: "", confirm: "" });
    } finally {
      setLoading(false);
    }
  }

  const FIELDS = [
    { key: "current" as const, label: "Mật khẩu hiện tại" },
    { key: "newPwd"  as const, label: "Mật khẩu mới" },
    { key: "confirm" as const, label: "Xác nhận mật khẩu mới" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
          <KeyRound size={14} className="text-orange-500" />
        </div>
        Đổi mật khẩu
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
            <input
              type="password"
              value={form[key]}
              onChange={set(key)}
              required
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
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle size={13} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">Đổi mật khẩu thành công!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <KeyRound size={14} />
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
