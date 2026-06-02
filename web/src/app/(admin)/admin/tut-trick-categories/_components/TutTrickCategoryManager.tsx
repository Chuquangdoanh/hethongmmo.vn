"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const SVGL_PRESETS = [
  { name: "Facebook",    icon: "https://svgl.app/library/facebook-icon.svg" },
  { name: "TikTok",      icon: "https://svgl.app/library/tiktok-icon-light.svg" },
  { name: "YouTube",     icon: "https://svgl.app/library/youtube.svg" },
  { name: "Instagram",   icon: "https://svgl.app/library/instagram-icon.svg" },
  { name: "Google",      icon: "https://svgl.app/library/google.svg" },
  { name: "X (Twitter)", icon: "https://svgl.app/library/x.svg" },
  { name: "Telegram",    icon: "https://svgl.app/library/telegram.svg" },
  { name: "Zalo",        icon: "https://svgl.app/library/zalo.svg" },
  { name: "iCloud",      icon: "https://svgl.app/library/icloud.svg" },
  { name: "WhatsApp",    icon: "https://svgl.app/library/whatsapp-icon.svg" },
  { name: "Discord",     icon: "https://svgl.app/library/discord.svg" },
  { name: "LinkedIn",    icon: "https://svgl.app/library/linkedin.svg" },
  { name: "Pinterest",   icon: "https://svgl.app/library/pinterest.svg" },
  { name: "Reddit",      icon: "https://svgl.app/library/reddit.svg" },
  { name: "Shopee",      icon: "https://svgl.app/library/shopify.svg" },
  { name: "Twitch",      icon: "https://svgl.app/library/twitch.svg" },
];

interface Category { id: string; name: string; iconUrl: string | null }
interface Props { initialCategories: Category[] }

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function TutTrickCategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setIconUrl(cat.iconUrl ?? "");
    setError("");
    setUploadError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setIconUrl("");
    setError("");
    setUploadError("");
    setImportUrl("");
  }

  async function handleSave() {
    if (!name.trim()) { setError("Tên danh mục không được để trống"); return; }
    setError("");
    setLoading(true);
    try {
      const url = editingId
        ? `/api/admin/tut-trick-categories/${editingId}`
        : "/api/admin/tut-trick-categories";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), iconUrl: iconUrl.trim() }),
      });
      const json = (await res.json()) as { data?: Category; error?: string };
      if (!res.ok) { setError(json.error ?? "Lưu thất bại"); return; }

      if (editingId) {
        setCategories((prev) =>
          prev.map((c) => c.id === editingId ? (json.data ?? c) : c)
            .sort((a, b) => a.name.localeCompare(b.name, "vi")),
        );
      } else {
        setCategories((prev) =>
          [...prev, json.data!].sort((a, b) => a.name.localeCompare(b.name, "vi")),
        );
      }
      router.refresh();
      cancelEdit();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Xóa danh mục "${catName}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tut-trick-categories/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? "Xóa thất bại"); return; }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) { setUploadError("Chỉ chấp nhận JPG, PNG, WebP, GIF, SVG"); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("File quá lớn, tối đa 5 MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=service-icon", { method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Upload thất bại"); return; }
      setIconUrl(json.data?.url ?? "");
    } finally {
      setUploading(false);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) return;
    setUploadError("");
    setImporting(true);
    try {
      const res = await fetch("/api/admin/upload/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim(), uploadType: "service-icon" }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Import thất bại"); return; }
      setIconUrl(json.data?.url ?? "");
      setImportUrl("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
      {/* ── Form thêm / sửa ── */}
      <div className="lg:col-span-6">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? "Sửa danh mục" : "Thêm danh mục mới"}
          </h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tên danh mục *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Facebook, TikTok, YouTube..."
              className={inputCls}
            />
          </div>

          {iconUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconUrl} alt="icon preview" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 p-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{iconUrl}</p>
              </div>
              <button type="button" onClick={() => setIconUrl("")} className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">
                Xóa
              </button>
            </div>
          )}

          {/* Upload kéo thả */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Upload ảnh icon</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-5 ${
                isDragging ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 hover:border-[#7C3AED]/50"
              }`}
            >
              {uploading ? (
                <p className="text-xs text-gray-500">Đang upload...</p>
              ) : (
                <>
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-xs text-gray-400">Kéo thả hoặc click để chọn ảnh (JPG, PNG, WebP, SVG, GIF)</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Import từ URL */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Import từ URL (svgl.app, URL ảnh...)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://svgl.app/library/facebook-icon.svg"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => void handleImportUrl()}
                disabled={importing || !importUrl.trim()}
                className="px-3 py-2 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {importing ? "..." : "Import"}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">Hệ thống sẽ tải ảnh về server, không dùng URL ngoài trực tiếp.</p>
          </div>

          {/* Nhập URL trực tiếp */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Hoặc nhập URL icon trực tiếp</label>
            <div className="flex gap-2 items-center">
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              {iconUrl && iconUrl.startsWith("http") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconUrl} alt="preview" className="w-8 h-8 object-contain shrink-0 rounded border border-gray-200 bg-white p-1" />
              )}
            </div>
          </div>

          {/* Chọn nhanh từ svgl.app */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Chọn nhanh từ svgl.app:</p>
            <div className="flex flex-wrap gap-2">
              {SVGL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  onClick={() => { setIconUrl(p.icon); setName((prev) => prev || p.name); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    iconUrl === p.icon
                      ? "border-[#7C3AED] bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/40"
                      : "border-gray-200 bg-white hover:border-[#7C3AED]/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.icon} alt={p.name} className="w-6 h-6 object-contain" />
                  <span className="text-[9px] text-gray-500 max-w-[52px] truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
            >
              {loading ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm danh mục"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Danh sách ── */}
      <div className="lg:col-span-4 lg:sticky lg:top-4">
        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">Danh sách danh mục ({categories.length})</p>
          </div>
          {categories.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Chưa có danh mục nào</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0 p-1.5">
                    {cat.iconUrl && cat.iconUrl.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.iconUrl} alt={cat.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-base">📁</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{cat.iconUrl ?? "Chưa có icon"}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button type="button" onClick={() => startEdit(cat)} className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors">
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(cat.id, cat.name)}
                      disabled={loading}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
