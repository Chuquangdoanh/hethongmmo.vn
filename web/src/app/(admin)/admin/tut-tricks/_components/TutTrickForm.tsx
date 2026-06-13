"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";


interface TutTrickData {
  id?: string;
  name?: string;
  slug?: string;
  platform?: string;
  category?: string;
  tier?: string;
  price?: number;
  description?: string;
  docs?: string;
  contentUrl?: string;
  successRate?: number;
  rating?: number;
  totalOrders?: number;
  displayOrder?: number;
  publishedDate?: string | null;
  thumbnail?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  warrantyPolicy?: string;
  processingTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  requiresAccountType?: boolean;
  requiresCccd?: boolean;
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function TutTrickForm({ initial, categoryOptions = [] }: { initial?: TutTrickData; categoryOptions?: string[] }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    platform: initial?.platform ?? "OTHER",
    category: initial?.category ?? categoryOptions[0] ?? "",
    tier: initial?.tier ?? "Miễn phí",
    price: initial?.price?.toString() ?? "0",
    description: initial?.description ?? "",
    docs: initial?.docs ?? "",
    successRate: initial?.successRate?.toString() ?? "100",
    rating: initial?.rating?.toString() ?? "0",
    totalOrders: initial?.totalOrders?.toString() ?? "0",
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    publishedDate: initial?.publishedDate ? initial.publishedDate.slice(0, 10) : "",
    thumbnail: initial?.thumbnail ?? "",
    contentUrl: initial?.contentUrl ?? "",
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    warrantyPolicy: initial?.warrantyPolicy ?? "",
    processingTime: initial?.processingTime ?? "",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    requiresAccountType: initial?.requiresAccountType ?? false,
    requiresCccd: initial?.requiresCccd ?? false,
  });

  const [clearContent, setClearContent] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbError("");
    if (file.size > 5 * 1024 * 1024) { setThumbError("File quá lớn, tối đa 5 MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setThumbUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=tut-trick-thumbnail", { credentials: "include", method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setThumbError(json.error ?? "Upload thất bại"); return; }
      set("thumbnail", json.data?.url ?? "");
    } finally {
      setThumbUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, unknown> = {
      name: form.name,
      ...(form.slug ? { slug: form.slug } : {}),
      platform: form.platform,
      category: form.category,
      tier: form.tier,
      price: parseFloat(form.price) || 0,
      successRate: parseInt(form.successRate, 10) || 100,
      rating: parseFloat(form.rating) || 0,
      totalOrders: parseInt(form.totalOrders, 10) || 0,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
      ...(form.description ? { description: form.description } : {}),
      ...(form.docs ? { docs: form.docs } : {}),
      ...(clearContent ? { contentUrl: "" } : form.contentUrl.trim() ? { contentUrl: form.contentUrl.trim() } : {}),
      ...(form.publishedDate ? { publishedDate: new Date(form.publishedDate).toISOString() } : {}),
      ...(form.warrantyPolicy.trim() ? { warrantyPolicy: form.warrantyPolicy.trim() } : {}),
      ...(form.processingTime.trim() ? { processingTime: form.processingTime.trim() } : {}),
      ...(form.seoTitle ? { seoTitle: form.seoTitle } : {}),
      ...(form.seoDescription ? { seoDescription: form.seoDescription } : {}),
      requiresAccountType: form.requiresAccountType,
      requiresCccd: form.requiresCccd,
    };

    setLoading(true);
    try {
      const url = isEdit ? `/api/products/tut-tricks/${initial!.id}` : "/api/products/tut-tricks";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Thao tác thất bại."); return; }
      router.push("/admin/tut-tricks");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Xóa tut/trick này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/tut-tricks/${initial.id}`, { credentials: "include", method: "DELETE" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Xóa thất bại."); return; }
      router.push("/admin/tut-tricks");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* ── LEFT column ── */}
      <div className="space-y-5">

        {/* ── 1. Thông tin cơ bản ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Tên *</label>
              <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Slug (để trống = tự tạo)</label>
              <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="vd: hack-view-facebook" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Danh mục *</label>
              {categoryOptions.length > 0 ? (
                <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Nhập tên danh mục..." className={inputCls} />
                  <p className="mt-1 text-[10px] text-amber-500">
                    Chưa có danh mục — <a href="/admin/tut-trick-categories" target="_blank" className="underline">thêm tại đây</a>
                  </p>
                </>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Loại tut *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("tier", "Miễn phí")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                    form.tier === "Miễn phí"
                      ? "bg-[#10B981] text-white border-[#10B981]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#10B981] hover:text-[#10B981]"
                  }`}
                >
                  Miễn phí
                </button>
                <button
                  type="button"
                  onClick={() => set("tier", "Có phí")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                    form.tier === "Có phí"
                      ? "bg-[#A855F7] text-white border-[#A855F7]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#A855F7] hover:text-[#A855F7]"
                  }`}
                >
                  Có phí
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giá (VND, để 0 nếu không có)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tỉ lệ thành công (%)</label>
              <input type="number" min="0" max="100" value={form.successRate} onChange={(e) => set("successRate", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Đánh giá (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Số lượng khách hàng</label>
              <input type="number" min="0" value={form.totalOrders} onChange={(e) => set("totalOrders", e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thứ tự hiển thị</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Ngày đăng</label>
              <input type="date" value={form.publishedDate} onChange={(e) => set("publishedDate", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Chế độ bảo hành</label>
              <input type="text" value={form.warrantyPolicy} onChange={(e) => set("warrantyPolicy", e.target.value)} placeholder="vd: Bảo hành 7 ngày, hoàn tiền nếu không hiệu quả" className={inputCls} maxLength={500} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thời gian xử lý</label>
              <input type="text" value={form.processingTime} onChange={(e) => set("processingTime", e.target.value)} placeholder="vd: Giao hàng tự động trong 1 phút" className={inputCls} maxLength={200} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded border-gray-200 text-[#7C3AED]" />
              <span className="text-xs text-gray-500">Hiển thị</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="rounded border-gray-200 text-[#7C3AED]" />
              <span className="text-xs text-gray-500">Nổi bật</span>
            </label>
          </div>
        </section>

        {/* ── 4. Mô tả ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Mô tả</h2>
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Mô tả ngắn hiển thị trên trang listing..."
            className={`${inputCls} resize-none`} />
        </section>

      </div>

      {/* ── RIGHT sidebar ── */}
      <div className="space-y-5">

        {/* ── 2. Ảnh thumbnail ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Ảnh thumbnail</h2>
          {form.thumbnail && (
            <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(form.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
              <button type="button" onClick={() => set("thumbnail", "")}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70">×</button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleThumbnailFile}
            className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-[#7C3AED]/10 file:text-[#7C3AED] hover:file:bg-[#7C3AED]/20 cursor-pointer"
          />
          {thumbUploading && <p className="text-xs text-gray-500">Đang tải lên...</p>}
          {thumbError && <p className="text-xs text-red-500">{thumbError}</p>}
          <p className="text-[11px] text-gray-400">JPEG, PNG, WebP, GIF — tối đa 5 MB</p>
        </section>

        {/* ── 3. Nội dung giao sau mua ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Nội dung giao sau mua</h2>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Không bắt buộc</span>
          </div>
          <input
            type="text"
            value={form.contentUrl}
            onChange={(e) => { set("contentUrl", e.target.value); if (clearContent) setClearContent(false); }}
            placeholder={isEdit ? "Để trống = giữ nguyên nội dung cũ" : "Link hoặc mã bí mật giao cho user sau khi mua"}
            disabled={clearContent}
            className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
          />
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={clearContent}
                onChange={(e) => { setClearContent(e.target.checked); if (e.target.checked) set("contentUrl", ""); }}
                className="rounded border-gray-300 text-[#EF4444]"
              />
              <span className="text-xs text-[#EF4444] font-medium">Xóa nội dung giao hiện tại</span>
            </label>
          )}
          <p className="text-[11px] text-gray-400">
            {isEdit
              ? "Để trống = giữ nguyên. Nhập mới = cập nhật. Tick checkbox đỏ = xóa hẳn."
              : "Có thể là link Google Drive, link bất kỳ, hoặc chuỗi văn bản. Được mã hóa, chỉ giao cho user sau khi mua thành công."}
          </p>
        </section>

        {/* ── 6. SEO ── */}
        

        {/* ── Nội dung Docs ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Nội dung Docs</h2>
          <textarea rows={10} value={form.docs} onChange={(e) => set("docs", e.target.value)}
            placeholder="Nội dung hướng dẫn chi tiết (HTML hoặc văn bản thường)..."
            className={`${inputCls} resize-y font-mono text-xs`} />
          <p className="text-[11px] text-gray-400">Hiển thị trên trang chi tiết. </p>
        </section>

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] disabled:opacity-60 transition-colors">
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
          </button>
          {isEdit && (
            <button type="button" onClick={handleDelete} disabled={loading}
              className="px-5 py-2.5 rounded-lg border border-[#EF4444]/30 text-[#EF4444] text-sm font-medium hover:bg-[#EF4444]/10 disabled:opacity-60 transition-colors">
              Xóa
            </button>
          )}
        </div>

      </div>
    </form>
  );
}
