"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const SVGL_PRESETS = [
  { name: "Facebook",    icon: "https://svgl.app/library/facebook-icon.svg" },
  { name: "TikTok",      icon: "https://svgl.app/library/tiktok-icon-light.svg" },
  { name: "YouTube",     icon: "https://svgl.app/library/youtube.svg" },
  { name: "Instagram",   icon: "https://svgl.app/library/instagram-icon.svg" },
  { name: "X (Twitter)", icon: "https://svgl.app/library/x.svg" },
  { name: "Threads",     icon: "https://svgl.app/library/threads.svg" },
  { name: "Telegram",    icon: "https://svgl.app/library/telegram.svg" },
  { name: "WhatsApp",    icon: "https://svgl.app/library/whatsapp-icon.svg" },
  { name: "Pinterest",   icon: "https://svgl.app/library/pinterest.svg" },
  { name: "Reddit",      icon: "https://svgl.app/library/reddit.svg" },
  { name: "LinkedIn",    icon: "https://svgl.app/library/linkedin.svg" },
  { name: "Bluesky",     icon: "https://svgl.app/library/bluesky.svg" },
  { name: "Google",      icon: "https://svgl.app/library/google.svg" },
  { name: "Shopify",     icon: "https://svgl.app/library/shopify.svg" },
  { name: "WordPress",   icon: "https://svgl.app/library/wordpress.svg" },
  { name: "Notion",      icon: "https://svgl.app/library/notion.svg" },
  { name: "Canva",       icon: "https://svgl.app/library/canva.svg" },
  { name: "Figma",       icon: "https://svgl.app/library/figma.svg" },
];

interface Category {
  id: string;
  name: string;
  icon: string;
  displayOrder: number;
}

interface Props {
  initialCategories: Category[];
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function CourseCategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
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
    setIcon(cat.icon);
    setDisplayOrder(cat.displayOrder.toString());
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setIcon("");
    setDisplayOrder("0");
    setError("");
    setUploadError("");
    setImportUrl("");
  }

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setUploadError("Chỉ chấp nhận JPG, PNG, WebP, GIF, SVG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File quá lớn, tối đa 5 MB");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=course-icon", { method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Upload thất bại"); return; }
      setIcon(json.data?.url ?? "");
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
        body: JSON.stringify({ url: importUrl.trim(), uploadType: "course-icon" }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Import thất bại"); return; }
      setIcon(json.data?.url ?? "");
      setImportUrl("");
    } finally {
      setImporting(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Tên danh mục không được để trống"); return; }
    setError("");
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/course-categories/${editingId}` : "/api/admin/course-categories";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon: icon.trim(), displayOrder: parseInt(displayOrder, 10) || 0 }),
      });
      const json = (await res.json()) as { success: boolean; data?: Category; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Lưu thất bại"); return; }
      router.refresh();
      cancelEdit();
      // Optimistic update
      if (editingId) {
        setCategories((prev) => prev.map((c) => c.id === editingId ? (json.data ?? c) : c));
      } else {
        setCategories((prev) => [...prev, json.data!]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Xóa danh mục "${catName}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/course-categories/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Xóa thất bại"); return; }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
      {/* ── Cột trái: Form thêm / sửa (6/10) ── */}
      <div className="lg:col-span-6">
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {editingId ? "Sửa danh mục" : "Thêm danh mục mới"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">Tên danh mục *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Facebook Ads, TikTok Marketing..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Thứ tự hiển thị</label>
            <input
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Icon preview */}
        {icon && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt="icon preview" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 p-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">{icon}</p>
            </div>
            <button type="button" onClick={() => setIcon("")} className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">
              Xóa
            </button>
          </div>
        )}

        {/* Upload ảnh */}
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

        {/* Icon URL trực tiếp */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Hoặc nhập URL icon trực tiếp</label>
          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://svgl.app/library/facebook-icon.svg"
              className={inputCls}
            />
            {icon && icon.startsWith("http") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon} alt="preview" className="w-8 h-8 object-contain shrink-0 rounded border border-gray-200 bg-white p-1" />
            )}
          </div>
        </div>

        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

        {/* Preset icons từ svgl.app */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Chọn nhanh icon svgl.app:</p>
          <div className="flex flex-wrap gap-2">
            {SVGL_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => setIcon(p.icon)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  icon === p.icon
                    ? "border-[#7C3AED] bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/40"
                    : "border-gray-200 bg-white hover:border-[#7C3AED]/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.icon} alt={p.name} className="w-6 h-6 object-contain" />
                <span className="text-[9px] text-gray-500 max-w-[48px] truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
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

      {/* ── Cột phải: Danh sách (4/10) ── */}
      <div className="lg:col-span-4 lg:sticky lg:top-4">
      <section className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">Danh sách danh mục ({categories.length})</p>
        </div>
        {categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Chưa có danh mục nào</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
              .map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0 p-1">
                    {cat.icon && cat.icon.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-lg">📁</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{cat.icon || "Chưa có icon"}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">#{cat.displayOrder}</span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={loading}
                      className="text-xs text-[#EF4444] hover:text-red-700 disabled:opacity-50 transition-colors"
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
