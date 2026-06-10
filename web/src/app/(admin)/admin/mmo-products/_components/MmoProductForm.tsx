"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import CategoryCombobox from "./CategoryCombobox";
import { r2Url } from "@/lib/utils/image-url";

interface MmoProductData {
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  categoryGroup?: string;
  price?: number;
  description?: string;
  thumbnail?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  requiresAccountType?: boolean;
  requiresCccd?: boolean;
}

export default function MmoProductForm({ initial }: { initial?: MmoProductData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    category: initial?.category ?? "",
    categoryGroup: initial?.categoryGroup ?? "",
    price: initial?.price?.toString() ?? "",
    description: initial?.description ?? "",
    thumbnail: initial?.thumbnail ?? "",
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    requiresAccountType: initial?.requiresAccountType ?? false,
    requiresCccd: initial?.requiresCccd ?? false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [sgvlUrl, setSgvlUrl] = useState("");
  const [sgvlImporting, setSgvlImporting] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadFile(file: File) {
    setThumbError("");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setThumbError("Chỉ chấp nhận JPG, PNG, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbError("File quá lớn, tối đa 5 MB");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    setThumbUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=mmo-thumbnail", { credentials: "include", method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setThumbError(json.error ?? "Upload thất bại"); return; }
      set("thumbnail", json.data?.url ?? "");
    } finally {
      setThumbUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await uploadFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSgvlImport() {
    const url = sgvlUrl.trim();
    if (!url) return;
    setSgvlImporting(true);
    setThumbError("");
    try {
      const res = await fetch("/api/admin/upload/from-url", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, uploadType: "mmo-thumbnail" }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setThumbError(json.error ?? "Import ảnh thất bại"); return; }
      set("thumbnail", json.data?.url ?? "");
      setSgvlUrl("");
    } finally {
      setSgvlImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      setError("Giá phải là số dương.");
      return;
    }

    const body = {
      name: form.name,
      ...(form.slug ? { slug: form.slug } : {}),
      category: form.category,
      categoryGroup: form.categoryGroup,
      price,
      ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
      ...(form.description ? { description: form.description } : {}),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      requiresAccountType: form.requiresAccountType,
      requiresCccd: form.requiresCccd,
    };

    setLoading(true);
    try {
      const url = isEdit ? `/api/products/mmo/${initial!.id}` : "/api/products/mmo";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string; data?: { id: string } };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      const targetId = isEdit ? initial!.id : json.data?.id;
      if (targetId && !isEdit) {
        router.push(`/admin/mmo-products/${targetId}/stock`);
      } else {
        router.push("/admin/mmo-products");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Xóa sản phẩm này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/mmo/${initial.id}`, { credentials: "include", method: "DELETE" });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Xóa thất bại."); return; }
      router.push("/admin/mmo-products");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Fullsize preview overlay */}
      {previewFull && form.thumbnail && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewFull(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r2Url(form.thumbnail)} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── LEFT column ── */}
        <div className="space-y-5">

          {/* ── 1. Thông tin sản phẩm ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Thông tin sản phẩm</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Tên sản phẩm *</label>
                <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Slug (tùy chọn)</label>
                <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nhóm danh mục *</label>
                <CategoryCombobox
                  value={form.categoryGroup}
                  onChange={(v) => set("categoryGroup", v)}
                  placeholder="vd: Facebook, Game, Tiktok"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Danh mục con *</label>
                <input required type="text" value={form.category} onChange={(e) => set("category", e.target.value)}
                  placeholder="vd: Face đã chạy ads"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Giá (VND) *</label>
                <input required type="number" min="1" value={form.price} onChange={(e) => set("price", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Thứ tự hiển thị</label>
                <input type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Mô tả</label>
                <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none resize-none" />
              </div>
            </div>

            <div className="flex gap-6">
              {[
                { field: "isActive", label: "Hiển thị" },
                { field: "isFeatured", label: "Nổi bật" },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[field as keyof typeof form] as boolean}
                    onChange={(e) => set(field, e.target.checked)}
                    className="rounded border-gray-200 bg-white text-[#7C3AED]" />
                  <span className="text-xs text-gray-500">{label}</span>
                </label>
              ))}
            </div>

            {/* ── Yêu cầu khi đặt hàng ── */}
            <div className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wide">Yêu cầu khi đặt hàng</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Loại tài khoản</p>
                  <p className="text-xs text-gray-500">Khách chọn: chính chủ / không chính chủ</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("requiresAccountType", !form.requiresAccountType)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.requiresAccountType ? "bg-[#7C3AED]" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.requiresAccountType ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">CCCD mặt trước</p>
                  <p className="text-xs text-gray-500">Khách upload ảnh CCCD mặt trước</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("requiresCccd", !form.requiresCccd)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.requiresCccd ? "bg-[#7C3AED]" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.requiresCccd ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="space-y-5 lg:sticky lg:top-6">

          {/* ── 2. Ảnh thumbnail ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Ảnh thumbnail</h2>

            {/* Preview */}
            {form.thumbnail && (
              <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r2Url(form.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setPreviewFull(true)}
                    className="text-white text-xs bg-white/20 rounded px-2 py-1 hover:bg-white/30">
                    🔍 Full
                  </button>
                  <button type="button" onClick={() => { set("thumbnail", ""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-white text-xs bg-red-500/70 rounded px-2 py-1 hover:bg-red-500/90">
                    ✕ Xóa
                  </button>
                  <label className="text-white text-xs bg-white/20 rounded px-2 py-1 hover:bg-white/30 cursor-pointer">
                    🔄 Đổi
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailFile} disabled={thumbUploading} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Drag & Drop zone */}
            {!form.thumbnail && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { void handleDrop(e); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-[#7C3AED] bg-[#f5f3ff]"
                    : "border-gray-300 bg-white hover:border-[#7C3AED] hover:bg-[#faf8ff]"
                }`}
              >
                {thumbUploading ? (
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="animate-spin h-4 w-4 text-[#7C3AED]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Đang tải lên...
                  </span>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500">Kéo thả ảnh vào đây hoặc <span className="text-[#7C3AED] font-medium">click để chọn</span></span>
                    <span className="text-[11px] text-gray-400">JPG, PNG, WebP · tối đa 5 MB</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbnailFile}
                  disabled={thumbUploading}
                  className="hidden"
                />
              </div>
            )}

            {thumbError && <p className="text-xs text-red-500">{thumbError}</p>}

            {/* SGVL.APP import */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Import ảnh từ URL (SGVL.APP hoặc URL khác)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sgvlUrl}
                  onChange={(e) => setSgvlUrl(e.target.value)}
                  placeholder="https://sgvl.app/... hoặc URL ảnh"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleSgvlImport()}
                  disabled={sgvlImporting || !sgvlUrl.trim()}
                  className="px-3 py-2 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#A855F7] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {sgvlImporting ? "Đang tải..." : "Import"}
                </button>
              </div>
            </div>

            {/* URL thủ công */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Hoặc nhập URL ảnh trực tiếp</label>
              <input
                type="url"
                value={form.thumbnail}
                onChange={(e) => set("thumbnail", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
              />
            </div>
          </div>

          {!isEdit && (
            <p className="text-xs text-gray-500 px-1">
              Sau khi tạo, bạn sẽ được chuyển đến trang quản lý kho để nhập hàng.
            </p>
          )}

          {error && <p className="text-xs text-[#EF4444]">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] disabled:opacity-60 transition-colors">
              {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo & nhập kho →"}
            </button>
            {isEdit && (
              <button type="button" onClick={() => void handleDelete()} disabled={loading}
                className="px-5 py-2.5 rounded-lg border border-[#EF4444]/30 text-[#EF4444] text-sm font-medium hover:bg-[#EF4444]/10 disabled:opacity-60 transition-colors">
                Xóa
              </button>
            )}
          </div>

        </div>
      </form>
    </>
  );
}
