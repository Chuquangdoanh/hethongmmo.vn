"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";
import { FolderOpen, Warehouse, Package } from "lucide-react";
import SubCategoryManager from "./SubCategoryManager";

const SVGL_PRESETS = [
  { name: "Facebook",    icon: "https://svgl.app/library/facebook-icon.svg" },
  { name: "TikTok",      icon: "https://svgl.app/library/tiktok-icon-light.svg" },
  { name: "YouTube",     icon: "https://svgl.app/library/youtube.svg" },
  { name: "Instagram",   icon: "https://svgl.app/library/instagram-icon.svg" },
  { name: "X (Twitter)", icon: "https://svgl.app/library/x.svg" },
  { name: "Telegram",    icon: "https://svgl.app/library/telegram.svg" },
  { name: "WhatsApp",    icon: "https://svgl.app/library/whatsapp-icon.svg" },
  { name: "Pinterest",   icon: "https://svgl.app/library/pinterest.svg" },
  { name: "Reddit",      icon: "https://svgl.app/library/reddit.svg" },
  { name: "LinkedIn",    icon: "https://svgl.app/library/linkedin.svg" },
  { name: "Google",      icon: "https://svgl.app/library/google.svg" },
  { name: "Shopify",     icon: "https://svgl.app/library/shopify.svg" },
  { name: "WordPress",   icon: "https://svgl.app/library/wordpress.svg" },
  { name: "Figma",       icon: "https://svgl.app/library/figma.svg" },
  { name: "Canva",       icon: "https://svgl.app/library/canva.svg" },
  { name: "Notion",      icon: "https://svgl.app/library/notion.svg" },
  { name: "Discord",     icon: "https://svgl.app/library/discord.svg" },
  { name: "Twitch",      icon: "https://svgl.app/library/twitch.svg" },
];

interface Category {
  id: string;
  name: string;
  iconUrl: string | null;
  displayOrder: number;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
}

interface Props {
  initialCategories: Category[];
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

type StoreFilter = "all" | "kho" | "mmo";

export default function ResourceCategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Store type flags for the form
  const [formShowKho, setFormShowKho] = useState(false);
  const [formShowMmo, setFormShowMmo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");

  const nextOrder = categories.length > 0
    ? Math.max(...categories.map((c) => c.displayOrder)) + 1
    : 1;

  const filteredCategories = categories
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .filter((c) => {
      if (storeFilter === "kho") return c.showInKhoTaiNguyen;
      if (storeFilter === "mmo") return c.showInTaiNguyenMmo;
      return true;
    });

  const khoCount = categories.filter((c) => c.showInKhoTaiNguyen).length;
  const mmoCount = categories.filter((c) => c.showInTaiNguyenMmo).length;

  // Open form pre-set for a specific store type
  function openFormFor(storeType: "kho" | "mmo") {
    setEditingId(null);
    setName("");
    setIconUrl("");
    setError("");
    setUploadError("");
    setImportUrl("");
    setFormShowKho(storeType === "kho");
    setFormShowMmo(storeType === "mmo");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setIconUrl(cat.iconUrl ?? "");
    setFormShowKho(cat.showInKhoTaiNguyen);
    setFormShowMmo(cat.showInTaiNguyenMmo);
    setError("");
    setUploadError("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setIconUrl("");
    setFormShowKho(false);
    setFormShowMmo(false);
    setError("");
    setUploadError("");
    setImportUrl("");
    setFormOpen(false);
  }

  async function handleSave() {
    if (!name.trim()) { setError("Tên danh mục không được để trống"); return; }
    if (!formShowKho && !formShowMmo) { setError("Phải chọn ít nhất 1 loại cửa hàng"); return; }
    setError("");
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/resource-categories/${editingId}` : "/api/admin/resource-categories";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          iconUrl: iconUrl.trim(),
          showInKhoTaiNguyen: formShowKho,
          showInTaiNguyenMmo: formShowMmo,
        }),
      });
      const json = (await res.json()) as { data?: Category; error?: string };
      if (!res.ok) { setError(json.error ?? "Lưu thất bại"); return; }

      if (editingId) {
        setCategories((prev) => prev.map((c) => c.id === editingId ? (json.data ?? c) : c));
      } else {
        setCategories((prev) => [...prev, json.data!]);
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
      const res = await fetch(`/api/admin/resource-categories/${id}`, { credentials: "include", method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? "Xóa thất bại"); return; }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStoreType(id: string, field: "showInKhoTaiNguyen" | "showInTaiNguyenMmo", value: boolean) {
    const res = await fetch(`/api/admin/resource-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
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
      const res = await fetch("/api/admin/upload/thumbnail?type=resource-icon", { credentials: "include", method: "POST", body: fd });
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
      const res = await fetch("/api/admin/upload/from-url", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim(), uploadType: "resource-icon" }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Import thất bại"); return; }
      setIconUrl(json.data?.url ?? "");
      setImportUrl("");
    } finally {
      setImporting(false);
    }
  }

  // Label for form header based on selected flags
  const formStoreLabel = formShowKho && formShowMmo ? "Kho TN + TN MMO"
    : formShowKho ? "Kho Tài Nguyên"
    : formShowMmo ? "Tài Nguyên MMO"
    : "—";

  const formStoreBg = formShowKho && !formShowMmo ? "bg-blue-50 border-blue-200"
    : !formShowKho && formShowMmo ? "bg-violet-50 border-violet-200"
    : "bg-gray-50 border-gray-200";

  return (
    <div className="space-y-6">

      {/* ── 2 nút thêm tách biệt ── */}
      {!formOpen && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openFormFor("kho")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Warehouse size={15} />
            + Thêm danh mục Kho Tài Nguyên
          </button>
          <button
            type="button"
            onClick={() => openFormFor("mmo")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            <Package size={15} />
            + Thêm danh mục Tài Nguyên MMO
          </button>
        </div>
      )}

      {/* ── Form thêm / sửa (full width) ── */}
      {formOpen && (
        <section className={`rounded-xl border p-5 space-y-4 ${formStoreBg}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId ? "Sửa danh mục" : "Thêm danh mục mới"}
              </h2>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                formShowKho && !formShowMmo ? "bg-blue-100 text-blue-700"
                  : !formShowKho && formShowMmo ? "bg-violet-100 text-violet-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {formShowKho && <Warehouse size={10} />}
                {formShowMmo && <Package size={10} />}
                {formStoreLabel}
              </span>
            </div>
            {!editingId && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] bg-white border border-[#7C3AED]/20 rounded-full px-2.5 py-1">
                <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center">{nextOrder}</span>
                Số thứ tự tiếp theo
              </span>
            )}
          </div>

          {/* Store type checkboxes — hiển thị rõ trong form */}
          <div className="flex items-center gap-5 p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-xs text-gray-500 font-medium shrink-0">Hiển thị tại:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formShowKho}
                onChange={(e) => setFormShowKho(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                <Warehouse size={13} /> Kho Tài Nguyên
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formShowMmo}
                onChange={(e) => setFormShowMmo(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-xs font-semibold text-violet-700">
                <Package size={13} /> Tài Nguyên MMO
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cột trái */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tên danh mục *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vd: Facebook, Game, TikTok..."
                  className={inputCls}
                />
              </div>

              {iconUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r2Url(iconUrl)} alt="icon preview" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 p-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{iconUrl}</p>
                  </div>
                  <button type="button" onClick={() => setIconUrl("")} className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">Xóa</button>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Upload ảnh icon</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-5 bg-white ${
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
                      <p className="text-xs text-gray-400">Kéo thả hoặc click để chọn (JPG, PNG, WebP, SVG, GIF)</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleFileChange} />
              </div>

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
                    <img src={r2Url(iconUrl)} alt="preview" className="w-8 h-8 object-contain shrink-0 rounded border border-gray-200 bg-white p-1" />
                  )}
                </div>
              </div>

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
                <p className="mt-1 text-[10px] text-gray-400">Hệ thống tải ảnh về server, không dùng URL ngoài trực tiếp.</p>
              </div>
            </div>

            {/* Cột phải — Preset svgl.app */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Chọn nhanh từ svgl.app:</p>
              <div className="flex flex-wrap gap-2">
                {SVGL_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    title={p.name}
                    onClick={() => setIconUrl(p.icon)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      iconUrl === p.icon
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/40"
                        : "border-gray-200 bg-white hover:border-[#7C3AED]/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r2Url(p.icon)} alt={p.name} className="w-6 h-6 object-contain" />
                    <span className="text-[9px] text-gray-500 max-w-13 truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition-colors ${
                formShowKho && !formShowMmo ? "bg-blue-600 hover:bg-blue-700"
                  : !formShowKho && formShowMmo ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-[#7C3AED] hover:bg-[#A855F7]"
              }`}
            >
              {loading ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm danh mục"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>
          </div>
        </section>
      )}

      {/* ── Danh sách danh mục ── */}
      <section className="rounded-xl border border-gray-200 overflow-hidden">
        {/* Header + filter toggle */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-semibold text-gray-900 shrink-0">
            Danh sách danh mục ({filteredCategories.length}/{categories.length})
          </p>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => setStoreFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                storeFilter === "all" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tất cả ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setStoreFilter("kho")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                storeFilter === "kho" ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              <Warehouse size={11} /> Kho TN ({khoCount})
            </button>
            <button
              type="button"
              onClick={() => setStoreFilter("mmo")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                storeFilter === "mmo" ? "bg-violet-600 text-white" : "text-violet-600 hover:bg-violet-50"
              }`}
            >
              <Package size={11} /> TN MMO ({mmoCount})
            </button>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {storeFilter === "all" ? "Chưa có danh mục nào" : "Không có danh mục nào trong bộ lọc này"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Order badge */}
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-[#7C3AED]">{cat.displayOrder}</span>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shrink-0 p-1.5">
                  {cat.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-full h-full object-contain" />
                  ) : (
                    <FolderOpen size={18} className="text-gray-400" />
                  )}
                </div>

                {/* Info + subs */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{cat.iconUrl ?? "Chưa có icon"}</p>

                  {/* Store type badges / inline toggles */}
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.showInKhoTaiNguyen}
                        onChange={(e) => { void handleToggleStoreType(cat.id, "showInKhoTaiNguyen", e.target.checked); }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
                        <Warehouse size={11} /> Kho Tài Nguyên
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.showInTaiNguyenMmo}
                        onChange={(e) => { void handleToggleStoreType(cat.id, "showInTaiNguyenMmo", e.target.checked); }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1 text-[11px] font-medium text-violet-600">
                        <Package size={11} /> Tài Nguyên MMO
                      </span>
                    </label>
                  </div>

                  <SubCategoryManager categoryName={cat.name} />
                </div>

                {/* Actions */}
                <div className="flex gap-3 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors"
                  >
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
