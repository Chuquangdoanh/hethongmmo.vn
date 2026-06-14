"use client";
import { useRef, useState } from "react";
import { r2Url } from "@/lib/utils/image-url";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadType?: string;
  hint?: string;
}

export function ImageUpload({ label, value, onChange, uploadType = "cms-thumbnail", hint }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/upload/thumbnail?type=${encodeURIComponent(uploadType)}`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload thất bại");
      if (json.data?.url) onChange(json.data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Lỗi upload");
    } finally {
      setUploading(false);
    }
  }

  const displaySrc = value ? (r2Url(value) || value) : "";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="shrink-0 w-28 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
          {displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displaySrc} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-gray-300">🖼</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/images/... hoặc https://..."
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {uploading ? "⏳ Đang tải lên..." : "📁 Upload từ thiết bị"}
          </button>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
