"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ServiceCategoryCombobox from "./ServiceCategoryCombobox";
import { r2Url } from "@/lib/utils/image-url";

// ICU-safe number formatter — avoids hydration mismatch between Node.js and browser
function fmtNum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


// Social platform presets — icons from svgl.app
const SOCIAL_PLATFORMS = [
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
  { name: "Skype",       icon: "https://svgl.app/library/skype.svg" },
];

interface PlatformVariant {
  name: string;
  icon: string;
}

interface WarrantyOption {
  name: string;
  price: number;
}

interface DeviceVariant {
  name: string;
  price: number;
}

interface ServiceData {
  id?: string;
  name?: string;
  slug?: string;
  platform?: string;
  category?: string;
  price?: number;
  thumbnail?: string;
  successRate?: number;
  processingTime?: string;
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  customerCount?: number;
  totalViews?: number;
  totalOrders?: number;
  reviewCount?: number;
  rating?: number;
  warrantyOptions?: WarrantyOption[];
  platformVariants?: PlatformVariant[];
  deviceVariants?: DeviceVariant[];
  seoTitle?: string;
  seoDescription?: string;
  requiresAccountType?: boolean;
  requiresCccd?: boolean;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function ServiceForm({ initial }: { initial?: ServiceData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    platform: initial?.platform ?? "OTHER",
    category: initial?.category ?? "",
    price: initial?.price?.toString() ?? "",
    thumbnail: initial?.thumbnail ?? "",
    successRate: initial?.successRate?.toString() ?? "100",
    processingTime: initial?.processingTime ?? "",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    customerCount: initial?.customerCount?.toString() ?? "0",
    totalViews: initial?.totalViews?.toString() ?? "0",
    totalOrders: initial?.totalOrders?.toString() ?? "0",
    reviewCount: initial?.reviewCount?.toString() ?? "0",
    rating: initial?.rating?.toString() ?? "0",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    requiresAccountType: initial?.requiresAccountType ?? false,
    requiresCccd: initial?.requiresCccd ?? false,
  });

  const [warrantyOptions, setWarrantyOptions] = useState<WarrantyOption[]>(initial?.warrantyOptions ?? []);
  const [platformVariants, setPlatformVariants] = useState<PlatformVariant[]>(initial?.platformVariants ?? []);
  const [deviceVariants, setDeviceVariants] = useState<DeviceVariant[]>(initial?.deviceVariants ?? []);
  const [newWarrantyName, setNewWarrantyName] = useState("");
  const [newWarrantyPrice, setNewWarrantyPrice] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantIconUrl, setNewVariantIconUrl] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDevicePrice, setNewDevicePrice] = useState("");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addDeviceVariant() {
    const name = newDeviceName.trim();
    const price = parseFloat(newDevicePrice);
    if (!name || isNaN(price) || price < 0) return;
    setDeviceVariants((prev) => [...prev, { name, price }]);
    setNewDeviceName("");
    setNewDevicePrice("");
  }

  function removeDeviceVariant(i: number) {
    setDeviceVariants((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addWarrantyOption() {
    const name = newWarrantyName.trim();
    const price = parseFloat(newWarrantyPrice);
    if (!name || isNaN(price) || price < 0) return;
    setWarrantyOptions((prev) => [...prev, { name, price }]);
    setNewWarrantyName("");
    setNewWarrantyPrice("");
  }

  function removeWarrantyOption(i: number) {
    setWarrantyOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addPresetPlatform(preset: (typeof SOCIAL_PLATFORMS)[number]) {
    if (platformVariants.some((v) => v.name === preset.name)) return;
    setPlatformVariants((prev) => [...prev, { name: preset.name, icon: preset.icon }]);
  }

  function addCustomPlatform() {
    const name = newVariantName.trim();
    if (!name) return;
    setPlatformVariants((prev) => [...prev, { name, icon: newVariantIconUrl.trim() }]);
    setNewVariantName("");
    setNewVariantIconUrl("");
  }

  function removePlatformVariant(i: number) {
    setPlatformVariants((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbError("");
    if (file.size > 5 * 1024 * 1024) {
      setThumbError("File quá lớn, tối đa 5 MB");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setThumbUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=service-thumbnail", { method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) {
        setThumbError(json.error ?? "Upload thất bại");
        return;
      }
      set("thumbnail", json.data?.url ?? "");
    } finally {
      setThumbUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      platform: form.platform,
      category: form.category,
      price,
      ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
      successRate: parseInt(form.successRate, 10),
      ...(form.processingTime ? { processingTime: form.processingTime } : {}),
      ...(form.description ? { description: form.description } : {}),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      customerCount: parseInt(form.customerCount, 10) || 0,
      totalViews: parseInt(form.totalViews, 10) || 0,
      totalOrders: parseInt(form.totalOrders, 10) || 0,
      reviewCount: parseInt(form.reviewCount, 10) || 0,
      rating: parseFloat(form.rating) || 0,
      warrantyOptions,
      platformVariants,
      productList: deviceVariants,
      ...(form.seoTitle ? { seoTitle: form.seoTitle } : {}),
      ...(form.seoDescription ? { seoDescription: form.seoDescription } : {}),
      requiresAccountType: form.requiresAccountType,
      requiresCccd: form.requiresCccd,
    };

    setLoading(true);
    try {
      const url = isEdit ? `/api/products/services/${initial!.id}` : "/api/products/services";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { success: boolean; data?: unknown; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.push("/admin/services");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Xóa dịch vụ này? Hành động không thể hoàn tác.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/services/${initial.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Xóa thất bại.");
        return;
      }
      router.push("/admin/services");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

      {/* ── LEFT column ── */}
      <div className="space-y-5">

        {/* ── 1. Thông tin cơ bản ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Tên dịch vụ *</label>
              <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Slug (để trống = tự tạo)</label>
              <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="vd: tang-follow-facebook" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Danh mục *</label>
              <ServiceCategoryCombobox
                value={form.category}
                onChange={(v) => set("category", v)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giá (VND) *</label>
              <input required type="number" min="1" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tỷ lệ thành công (%)</label>
              <input type="number" min="0" max="100" value={form.successRate} onChange={(e) => set("successRate", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thời gian xử lý</label>
              <input type="text" value={form.processingTime} onChange={(e) => set("processingTime", e.target.value)} placeholder="vd: 1-3 ngày" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thứ tự hiển thị</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded border-gray-200 bg-white text-[#7C3AED]" />
              <span className="text-xs text-gray-500">Hoạt động</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="rounded border-gray-200 bg-white text-[#7C3AED]" />
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
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Mô tả</h2>
          <textarea
            rows={6}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </section>

        {/* ── 5. Biến thể thiết bị / Sản phẩm ── */}
        <section className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/3 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Biến thể thiết bị / Sản phẩm</h2>
            <p className="text-xs text-gray-500 mt-0.5">Thêm từng thiết bị hoặc phiên bản với giá riêng (ví dụ: iPhone 11 — 8.000.000đ). Khi có biến thể, người dùng phải chọn thiết bị và giá sẽ lấy theo biến thể đã chọn.</p>
          </div>
          {deviceVariants.length > 0 && (
            <ul className="space-y-2">
              {deviceVariants.map((v, i) => (
                <li key={i} className="flex items-center justify-between bg-white border border-[#7C3AED]/20 rounded-lg px-3 py-2 text-sm text-gray-700">
                  <div>
                    <span className="font-medium">{v.name}</span>
                    <span className="text-[#7C3AED] font-bold ml-2">— {fmtNum(v.price)}đ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeviceVariant(i)}
                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                  >Xóa</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tên thiết bị (vd: iPhone 11)"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="Giá (VND)"
              value={newDevicePrice}
              onChange={(e) => setNewDevicePrice(e.target.value)}
              className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <button
              type="button"
              onClick={addDeviceVariant}
              className="px-3 py-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium hover:bg-[#7C3AED]/20"
            >+ Thêm</button>
          </div>
          {deviceVariants.length > 0 && (
            <p className="text-[10px] text-[#7C3AED]">✓ {deviceVariants.length} biến thể · Giá từ {fmtNum(Math.min(...deviceVariants.map(v => v.price)))}đ đến {fmtNum(Math.max(...deviceVariants.map(v => v.price)))}đ</p>
          )}
        </section>

        {/* ── 6. Biến thể bảo hành ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Biến thể bảo hành</h2>
          {warrantyOptions.length > 0 && (
            <ul className="space-y-2">
              {warrantyOptions.map((w, i) => (
                <li key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  <span>{w.name} — {fmtNum(w.price)}đ</span>
                  <button
                    type="button"
                    onClick={() => removeWarrantyOption(i)}
                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                  >Xóa</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tên bảo hành (vd: 1 tháng)"
              value={newWarrantyName}
              onChange={(e) => setNewWarrantyName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="Giá thêm (VND)"
              value={newWarrantyPrice}
              onChange={(e) => setNewWarrantyPrice(e.target.value)}
              className="w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <button
              type="button"
              onClick={addWarrantyOption}
              className="px-3 py-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium hover:bg-[#7C3AED]/20"
            >+ Thêm</button>
          </div>
        </section>

        {/* ── 7. Biến thể Platform ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Biến thể Platform</h2>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATFORMS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => addPresetPlatform(p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-700 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.icon} alt={p.name} className="w-4 h-4" />
                {p.name}
              </button>
            ))}
          </div>
          {platformVariants.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {platformVariants.map((v, i) => (
                <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/5 text-xs text-[#7C3AED]">
                  {v.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.icon} alt={v.name} className="w-4 h-4" />
                  )}
                  {v.name}
                  <button
                    type="button"
                    onClick={() => removePlatformVariant(i)}
                    className="ml-1 hover:text-red-500"
                  >×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tên platform tùy chỉnh"
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <input
              type="url"
              placeholder="URL icon (tùy chọn)"
              value={newVariantIconUrl}
              onChange={(e) => setNewVariantIconUrl(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomPlatform}
              className="px-3 py-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium hover:bg-[#7C3AED]/20"
            >+ Thêm</button>
          </div>
        </section>

      </div>

      {/* ── RIGHT sidebar ── */}
      <div className="space-y-5 lg:sticky lg:top-6">

        {/* ── 2. Ảnh thumbnail ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Ảnh thumbnail</h2>
          {form.thumbnail && (
            <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(form.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => set("thumbnail", "")}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
              >×</button>
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

        {/* ── 3. Thống kê hiển thị ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thống kê hiển thị</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Số khách hàng</label>
              <input type="number" min="0" value={form.customerCount} onChange={(e) => set("customerCount", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Lượt xem</label>
              <input type="number" min="0" value={form.totalViews} onChange={(e) => set("totalViews", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Đơn hàng</label>
              <input type="number" min="0" value={form.totalOrders} onChange={(e) => set("totalOrders", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Lượt đánh giá</label>
              <input type="number" min="0" value={form.reviewCount} onChange={(e) => set("reviewCount", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Điểm đánh giá (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls} />
            </div>
          </div>
        </section>

        {/* ── 8. SEO ── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">SEO Title</label>
            <input type="text" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder="Để trống = dùng tên dịch vụ" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">SEO Description</label>
            <textarea rows={2} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className={`${inputCls} resize-none`} />
          </div>
        </section>

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg border border-[#EF4444]/30 text-[#EF4444] text-sm font-medium hover:bg-[#EF4444]/10 disabled:opacity-60 transition-colors"
            >
              Xóa
            </button>
          )}
        </div>

      </div>
    </form>
  );
}
