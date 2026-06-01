"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORM_OPTIONS = [
  { value: "FACEBOOK",  label: "Facebook",    icon: "https://svgl.app/library/facebook-icon.svg" },
  { value: "TIKTOK",    label: "TikTok",      icon: "https://svgl.app/library/tiktok-icon-light.svg" },
  { value: "GOOGLE",    label: "Google",      icon: "https://svgl.app/library/google.svg" },
  { value: "INSTAGRAM", label: "Instagram",   icon: "https://svgl.app/library/instagram-icon.svg" },
  { value: "YOUTUBE",   label: "YouTube",     icon: "https://svgl.app/library/youtube.svg" },
  { value: "ICLOUD",    label: "iCloud",      icon: "https://svgl.app/library/icloud.svg" },
  { value: "ZALO",      label: "Zalo",        icon: "https://svgl.app/library/zalo.svg" },
  { value: "TELEGRAM",  label: "Telegram",    icon: "https://svgl.app/library/telegram.svg" },
  { value: "TWITTER",   label: "X (Twitter)", icon: "https://svgl.app/library/x.svg" },
  { value: "OTHER",     label: "Khác",        icon: "" },
];
const PRICING_CATEGORIES = ["Có phí", "Miễn phí"];

interface TutTrickData {
  id?: string;
  name?: string;
  slug?: string;
  platform?: string;
  category?: string;
  price?: number;
  description?: string;
  docs?: string;
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

export default function TutTrickForm({ initial }: { initial?: TutTrickData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    platform: initial?.platform ?? "FACEBOOK",
    category: initial?.category ?? "Miễn phí",
    price: initial?.price?.toString() ?? "0",
    description: initial?.description ?? "",
    docs: initial?.docs ?? "",
    successRate: initial?.successRate?.toString() ?? "100",
    rating: initial?.rating?.toString() ?? "0",
    totalOrders: initial?.totalOrders?.toString() ?? "0",
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    publishedDate: initial?.publishedDate ? initial.publishedDate.slice(0, 10) : "",
    thumbnail: initial?.thumbnail ?? "",
    contentUrl: "",
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    warrantyPolicy: initial?.warrantyPolicy ?? "",
    processingTime: initial?.processingTime ?? "",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    requiresAccountType: initial?.requiresAccountType ?? false,
    requiresCccd: initial?.requiresCccd ?? false,
  });

  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target as Node)) {
        setShowPlatformDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const res = await fetch("/api/admin/upload/thumbnail?type=tut-trick-thumbnail", { method: "POST", body: fd });
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
      ...(form.contentUrl.trim() ? { contentUrl: form.contentUrl.trim() } : {}),
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
      const res = await fetch(`/api/products/tut-tricks/${initial.id}`, { method: "DELETE" });
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
            <div ref={platformDropdownRef} className="relative">
              <label className="block text-xs text-gray-500 mb-1.5">Platform *</label>
              <button
                type="button"
                onClick={() => setShowPlatformDropdown((prev) => !prev)}
                className={`${inputCls} flex items-center gap-2 text-left cursor-pointer`}
              >
                {(() => {
                  const opt = PLATFORM_OPTIONS.find((o) => o.value === form.platform);
                  return opt ? (
                    <>
                      {opt.icon ? (
                        <span className="flex items-center justify-center w-5 h-5 bg-white rounded-md border border-gray-200 p-0.5 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opt.icon} alt={opt.label} className="w-full h-full object-contain" />
                        </span>
                      ) : null}
                      <span className="flex-1 text-gray-900">{opt.label}</span>
                    </>
                  ) : <span className="flex-1 text-gray-400">Chọn platform</span>;
                })()}
                <span className="ml-auto text-gray-400 text-xs">▾</span>
              </button>
              {showPlatformDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {PLATFORM_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { set("platform", opt.value); setShowPlatformDropdown(false); }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                          form.platform === opt.value
                            ? "border-[#7C3AED] bg-[#7C3AED]/8"
                            : "border-gray-100 hover:border-[#7C3AED]/40 hover:bg-gray-50"
                        }`}
                      >
                        {opt.icon ? (
                          <span className="flex items-center justify-center w-8 h-8 bg-white rounded-lg border border-gray-100 p-1 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opt.icon} alt={opt.label} className="w-full h-full object-contain" />
                          </span>
                        ) : (
                          <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-lg">🌐</span>
                        )}
                        <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Danh mục *</label>
              <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                {PRICING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giá (VND, 0 = miễn phí)</label>
              <input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
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
              <img src={form.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
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

        {/* ── 3. Link Google Drive ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Link Google Drive</h2>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Không bắt buộc</span>
          </div>
          <input
            type="url"
            value={form.contentUrl}
            onChange={(e) => set("contentUrl", e.target.value)}
            placeholder={isEdit ? "Để trống = giữ nguyên link cũ" : "Để trống = không có link"}
            className={inputCls}
          />
          <p className="text-[11px] text-gray-400">Để trống nếu không có. Link được mã hóa và chỉ giao cho user sau khi mua thành công.</p>
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
