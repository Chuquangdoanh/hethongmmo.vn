"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, ExternalLink, Send, AlertTriangle, CheckCircle, Save, Camera, Loader2 } from "lucide-react";

interface Props {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  facebookUrl: string;
  telegramUsername: string;
  avatarUrl: string | null;
}

export default function ProfileForm({
  email,
  fullName: initialName,
  phone: initialPhone,
  facebookUrl: initialFacebook,
  telegramUsername: initialTelegram,
  avatarUrl: initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [facebookUrl, setFacebookUrl] = useState(initialFacebook);
  const [telegramUsername, setTelegramUsername] = useState(initialTelegram);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user/upload?type=avatar", { credentials: "include", method: "POST", body: fd });
      const json = await res.json() as { data?: { url: string }; error?: string };
      if (!res.ok || !json.data?.url) {
        setError(json.error ?? "Upload ảnh thất bại.");
        return;
      }
      setAvatarUrl(json.data.url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          telegramUsername: telegramUsername.trim() || undefined,
          avatarUrl: avatarUrl ?? null,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Cập nhật thất bại.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <PenLine size={14} className="text-blue-600" />
        </div>
        Chỉnh sửa thông tin
      </h2>

      {/* Avatar upload */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          </button>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700">Ảnh đại diện</p>
          <p className="text-[11px] text-gray-400 mt-0.5">JPEG, PNG, WebP · Tối đa 5 MB</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-1.5 text-[11px] text-blue-600 hover:underline disabled:opacity-50"
          >
            {uploading ? "Đang tải lên..." : "Thay đổi ảnh"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Email</label>
          <input
            value={email}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed"
            suppressHydrationWarning
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
            suppressHydrationWarning
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Số điện thoại</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="0xxx xxx xxx"
            suppressHydrationWarning
          />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Mạng xã hội</p>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                <ExternalLink size={12} className="text-blue-400" /> Facebook
              </label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Link hoặc tên tài khoản Facebook"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                <Send size={12} className="text-sky-400" /> Telegram username
              </label>
              <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-blue-500 transition-colors">
                <span className="px-3 text-sm text-gray-400 border-r border-gray-200 bg-gray-50 py-2.5 shrink-0">@</span>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ""))}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none bg-transparent"
                  placeholder="username"
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle size={13} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">Cập nhật thành công!</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <Save size={14} />
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
