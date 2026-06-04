"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  role: string;
  status: string;
}

const INITIAL: FormState = {
  email: "", fullName: "", phone: "", password: "",
  role: "USER", status: "ACTIVE",
};

export default function CreateUserModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function close() {
    setOpen(false);
    setForm(INITIAL);
    setError("");
    setShowPw(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: form.phone || undefined }),
      });
      const json = await res.json() as { data?: unknown; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Tạo user thất bại.");
        return;
      }
      close();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Tạo user mới
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Tạo tài khoản mới</h2>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Họ tên */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    required
                    minLength={2}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Password */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      required
                      minLength={8}
                      placeholder="Tối thiểu 8 ký tự, gồm hoa, thường, số"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-20 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số</p>
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="0912345678"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => set("role", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none bg-white"
                  >
                    <option value="USER">Người dùng</option>
                    <option value="SELLER">Nhà bán hàng</option>
                    <option value="STAFF">Nhân viên</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Trạng thái</label>
                  <div className="flex gap-3">
                    {[
                      { value: "ACTIVE", label: "Hoạt động", desc: "Email đã xác minh, có thể đăng nhập ngay" },
                      { value: "PENDING_VERIFICATION", label: "Chờ xác minh", desc: "Cần xác minh email trước khi dùng" },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`flex-1 flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                          form.status === value
                            ? "border-[#7C3AED] bg-violet-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={value}
                          checked={form.status === value}
                          onChange={() => set("status", value)}
                          className="mt-0.5 accent-[#7C3AED]"
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors disabled:opacity-60"
                >
                  {loading ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
