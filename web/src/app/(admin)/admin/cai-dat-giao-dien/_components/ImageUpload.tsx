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
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File quá lớn, tối đa 5 MB");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/upload/thumbnail?type=${encodeURIComponent(uploadType)}`, {
        credentials: "include",
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) {
        setUploadError(json.error ?? "Upload thất bại");
        return;
      }
      onChange(json.data?.url ?? "");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const previewSrc = value ? r2Url(value) : "";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>

      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div className="shrink-0 w-28 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#3F3F46] text-xs text-center px-2">Chưa có ảnh</span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          {/* File picker button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleThumbnailFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#3F3F46] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 text-sm text-gray-500 hover:text-[#A855F7] transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <>
                <span className="animate-spin text-xs">⟳</span>
                Đang tải lên...
              </>
            ) : (
              <>
                <span>📁</span>
                Chọn ảnh từ máy tính
              </>
            )}
          </button>
          <p className="text-[10px] text-[#52525B]">JPEG, PNG, WebP, GIF · Tối đa 5 MB</p>

          {/* Fallback URL input */}
          <div>
            <label className="block text-[10px] text-[#52525B] mb-1">Hoặc dán URL ảnh:</label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/images/... hoặc https://..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none font-mono"
            />
          </div>

          {uploadError && <p className="text-[11px] text-[#EF4444]">{uploadError}</p>}
          {hint && <p className="text-[10px] text-gray-400">{hint}</p>}

          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-gray-500 hover:text-[#EF4444] transition-colors"
            >
              ✕ Xóa ảnh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
