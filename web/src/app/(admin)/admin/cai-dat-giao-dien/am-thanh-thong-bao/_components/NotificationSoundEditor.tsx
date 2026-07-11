"use client";

import { useRef, useState } from "react";
import { SITE_CONTENT_KEYS } from "@/lib/services/site-content.keys";

const ALLOWED_TYPES = ["audio/mpeg", "audio/ogg", "audio/wav"];
const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

export default function NotificationSoundEditor({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMsg(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMsg({ type: "err", text: "Chỉ chấp nhận file MP3, OGG, WAV" });
      return;
    }
    if (file.size > MAX_SIZE) {
      setMsg({ type: "err", text: "File quá lớn, tối đa 1 MB" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload/notification-sound", { method: "POST", body: formData });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error ?? "Tải file lên thất bại");
      setUrl(json.data.url);
      setMsg({ type: "ok", text: "Tải file lên thành công — nhấn Lưu để áp dụng" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Lỗi tải file" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: SITE_CONTENT_KEYS.NOTIFICATION_SOUND, content: { url } }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi lưu");
      setMsg({ type: "ok", text: "Đã lưu thành công!" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    setUrl("");
    setMsg(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">File âm thanh hiện tại</h2>
        {msg && (
          <span className={`text-xs font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>

      {url ? (
        <div className="flex items-center gap-3">
          <audio controls src={url} className="h-10 flex-1" />
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-semibold text-red-500 hover:text-red-700 whitespace-nowrap"
          >
            Xóa
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
          Chưa có file âm thanh nào — hãy tải lên bên dưới.
        </p>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/ogg,audio/wav"
          onChange={(e) => void handleFileChange(e)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-xl px-4 py-3 transition-colors hover:bg-blue-50 disabled:opacity-50"
        >
          {uploading ? "Đang tải lên..." : "+ Tải lên file âm thanh (MP3/OGG/WAV, tối đa 1MB)"}
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Đang lưu..." : "Lưu"}
      </button>
    </div>
  );
}
