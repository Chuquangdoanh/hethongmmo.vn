"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import CategoryCombobox from "./CategoryCombobox";
import SubCategoryCombobox from "./SubCategoryCombobox";
import { r2Url } from "@/lib/utils/image-url";
import ProductGalleryManager from "@/components/shared/ProductGalleryManager";

interface MmoProductData {
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  categoryGroup?: string;
  price?: number;
  description?: string;
  warrantyInfo?: string;
  thumbnail?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  section?: "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN";
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
    warrantyInfo: initial?.warrantyInfo ?? "",
    thumbnail: initial?.thumbnail ?? "",
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    section: initial?.section ?? "TAI_NGUYEN_MMO" as "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN",
  });


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [sgvlUrl, setSgvlUrl] = useState("");
  const [sgvlImporting, setSgvlImporting] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);

  // ── Thư viện ảnh (mode="create") — ảnh được upload trước, gắn vào sản phẩm ngay sau khi tạo ──
  const MAX_GALLERY_IMAGES = 10;
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingUploading, setPendingUploading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const pendingFileInputRef = useRef<HTMLInputElement>(null);

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

  async function handlePendingImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (pendingFileInputRef.current) pendingFileInputRef.current.value = "";
    if (!file) return;
    if (pendingImages.length >= MAX_GALLERY_IMAGES) {
      setPendingError(`Đã đạt giới hạn tối đa ${MAX_GALLERY_IMAGES} ảnh`);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setPendingError("Chỉ chấp nhận JPG, PNG, WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { setPendingError("File quá lớn, tối đa 5 MB"); return; }

    setPendingError("");
    setPendingUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/thumbnail?type=mmo-thumbnail", { credentials: "include", method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok || !json.data?.url) { setPendingError(json.error ?? "Upload thất bại"); return; }
      setPendingImages((imgs) => [...imgs, json.data!.url]);
    } finally {
      setPendingUploading(false);
    }
  }

  function removePendingImage(url: string) {
    setPendingImages((imgs) => imgs.filter((u) => u !== url));
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
    const price = parseInt(form.price, 10);
    if (isNaN(price) || price < 0) {
      setError("Giá không hợp lệ.");
      return;
    }
    if (!form.warrantyInfo.trim()) {
      setError("Vui lòng nhập thông tin bảo hành.");
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
      warrantyInfo: form.warrantyInfo.trim(),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      section: form.section,
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
        if (pendingImages.length > 0) {
          await Promise.all(
            pendingImages.map((imageUrl) =>
              fetch(`/api/products/mmo/${targetId}/images`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl }),
              }),
            ),
          );
        }
        router.push(`/admin/mmo-products/${targetId}/sua`);
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

      {!isEdit && (
        <div className="flex items-center gap-0 rounded-xl border border-gray-200 bg-white overflow-hidden text-xs mb-1">
          {[
            { n: "1", label: "Thông tin cơ bản", active: true },
            { n: "2", label: "Biến thể & Giá", active: false },
            { n: "3", label: "Nhập kho", active: false },
          ].map((step, i, arr) => (
            <div key={step.n} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-medium border-r last:border-r-0 border-gray-200 transition-colors ${step.active ? "bg-[#7C3AED]/8 text-[#7C3AED]" : "text-gray-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.active ? "bg-[#7C3AED] text-white" : "bg-gray-200 text-gray-400"}`}>{step.n}</span>
              {step.label}
              {i < arr.length - 1 && <span className="ml-1 text-gray-300 hidden sm:inline">→</span>}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── LEFT column ── */}
        <div className="space-y-5">

          {/* ── 0. Chọn khu vực hiển thị ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Hiển thị trong khu vực</p>
            <div className="flex gap-2">
              {(["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN"] as const).map((val) => {
                const label = val === "TAI_NGUYEN_MMO" ? "Nguyên liệu MMO" : "Kho tài nguyên";
                const icon  = val === "TAI_NGUYEN_MMO" ? "🛒" : "📦";
                const active = form.section === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { set("section", val); set("categoryGroup", ""); set("category", ""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      active
                        ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                    {active && <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">✓</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {form.section === "TAI_NGUYEN_MMO"
                ? "Sản phẩm sẽ hiển thị tại trang Nguyên liệu MMO (/tai-nguyen-mmo)"
                : "Sản phẩm sẽ hiển thị tại trang Kho tài nguyên (/kho-tai-nguyen)"}
            </p>
          </div>

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
                  onChange={(v) => {
                    set("categoryGroup", v);
                    set("category", "");
                  }}
                  section={form.section}
                  placeholder="vd: Facebook, Game, Tiktok"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Danh mục con *</label>
                <SubCategoryCombobox
                  categoryGroup={form.categoryGroup}
                  value={form.category}
                  onChange={(v) => set("category", v)}
                  section={form.section}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Giá mặc định (VNĐ) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
                />
                {form.price !== "" && !isNaN(parseInt(form.price, 10)) && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    = {parseInt(form.price, 10).toLocaleString("vi-VN")}đ
                    {parseInt(form.price, 10) === 0 && <span className="ml-1 text-amber-500">· Sản phẩm miễn phí</span>}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">Giá hiển thị khi không có gói biến thể</p>
              </div>


              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Mô tả</label>
                <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none resize-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs mb-1.5 font-medium text-red-500">
                  Thông tin bảo hành <span className="font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.warrantyInfo}
                  onChange={(e) => set("warrantyInfo", e.target.value)}
                  maxLength={2000}
                  placeholder="Nhập chính sách bảo hành, hỗ trợ sau mua, thời hạn đổi trả..."
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none resize-none transition-colors ${
                    !form.warrantyInfo.trim()
                      ? "border-red-400 bg-red-50 focus:border-red-500"
                      : "border-gray-200 bg-white focus:border-[#7C3AED]"
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  {!form.warrantyInfo.trim() ? (
                    <p className="text-[11px] text-red-500 font-medium">Bắt buộc nhập</p>
                  ) : (
                    <p className="text-[11px] text-emerald-500">✓ Đã nhập</p>
                  )}
                  <p className="text-[11px] text-gray-400">{form.warrantyInfo.length} / 2000</p>
                </div>
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
          </div>

          {isEdit && initial?.id && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <ProductGalleryManager
                productId={initial.id}
                apiBase="/api/products/mmo"
                uploadUrl="/api/admin/upload/thumbnail?type=mmo-thumbnail"
                uploadResponseKey="url"
                isAdmin
              />
            </div>
          )}

          {!isEdit && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider">Thư viện ảnh sản phẩm</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {pendingImages.length}/{MAX_GALLERY_IMAGES} ảnh — sẽ được gắn vào sản phẩm ngay khi tạo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pendingFileInputRef.current?.click()}
                  disabled={pendingUploading || pendingImages.length >= MAX_GALLERY_IMAGES}
                  className="px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#A855F7] disabled:opacity-50 transition-colors"
                >
                  {pendingUploading ? "Đang tải..." : "Thêm ảnh"}
                </button>
                <input
                  ref={pendingFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handlePendingImageFile(e)}
                />
              </div>

              {pendingError && <p className="text-xs text-red-500">{pendingError}</p>}

              {pendingImages.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {pendingImages.map((url) => (
                    <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r2Url(url)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePendingImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Xóa ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Sau khi tạo, bạn sẽ được chuyển đến trang chỉnh sửa để thêm gói biến thể và nhập kho.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-[#EF4444]">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] disabled:opacity-60 transition-colors">
              {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo sản phẩm →"}
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
