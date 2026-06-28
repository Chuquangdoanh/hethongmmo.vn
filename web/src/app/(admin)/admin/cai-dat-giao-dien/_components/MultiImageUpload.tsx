"use client";
import { useRef, useState } from "react";
import { r2Url } from "@/lib/utils/image-url";

interface Props {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  uploadType?: string;
  hint?: string;
  maxImages?: number;
}

export function MultiImageUpload({
  label,
  values,
  onChange,
  uploadType = "cms-djmedia",
  hint,
  maxImages = 10,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File quá lớn, tối đa 5 MB");
      return;
    }
    if (values.length >= maxImages) {
      setUploadError(`Tối đa ${maxImages} ảnh`);
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
      const newUrl = json.data?.url ?? "";
      if (newUrl) onChange([...values, newUrl]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...values];
    const a = next[idx - 1]!;
    const b = next[idx]!;
    next[idx - 1] = b;
    next[idx] = a;
    onChange(next);
  }

  function moveDown(idx: number) {
    if (idx === values.length - 1) return;
    const next = [...values];
    const a = next[idx]!;
    const b = next[idx + 1]!;
    next[idx] = b;
    next[idx + 1] = a;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          <span className="ml-2 text-xs font-normal text-gray-400">({values.length}/{maxImages} ảnh)</span>
        </label>
      </div>

      {hint && <p className="text-[11px] text-gray-400 -mt-1">{hint}</p>}

      {/* Image list */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {values.map((url, idx) => (
            <div key={idx} className="relative group shrink-0 w-28 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r2Url(url) || url}
                alt={`Ảnh ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Index badge */}
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {idx + 1}
              </div>

              {/* Controls overlay on hover */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Lên"
                    className="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center disabled:opacity-30 shadow text-[10px]"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === values.length - 1}
                    title="Xuống"
                    className="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center disabled:opacity-30 shadow"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    title="Xóa"
                    className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {values.length < maxImages && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-500 hover:text-blue-600 transition-all disabled:opacity-60"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                Đang tải lên...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Thêm ảnh ({values.length}/{maxImages})
              </>
            )}
          </button>
          <p className="text-[10px] text-gray-400">JPEG, PNG, WebP, GIF - Tối đa 5 MB mỗi ảnh</p>
        </>
      )}

      {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
    </div>
  );
}
