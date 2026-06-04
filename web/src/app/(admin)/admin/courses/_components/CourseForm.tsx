"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CourseCategoryCombobox from "./CourseCategoryCombobox";

const BADGES = ["NONE", "HOT", "POPULAR", "TREND", "NEW", "VIP"];
const FORMATS = ["ONLINE", "OFFLINE", "HYBRID"];
const MAX_CONTENT_ITEMS = 20;

// Dùng cho phần "Biến thể Platform" của khóa học (không liên quan đến danh mục)
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
  { name: "VK",          icon: "https://svgl.app/library/vk.svg" },
  { name: "Skype",       icon: "https://svgl.app/library/skype.svg" },
];


interface PlatformVariant {
  name: string;
  icon: string;
}

interface CourseData {
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  learningFormat?: string;
  originalPrice?: number;
  salePrice?: number;
  duration?: string;
  instructorName?: string;
  badge?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  thumbnail?: string;
  youtubeUrl?: string;
  studentCount?: number;
  rating?: number;
  totalViews?: number;
  totalOrders?: number;
  contentList?: string[];
  platformVariants?: PlatformVariant[];
  saleDeadline?: string;
  seoTitle?: string;
  seoDescription?: string;
  requiresAccountType?: boolean;
  requiresCccd?: boolean;
  commitments?: string[];
  registrationProcedure?: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function CourseForm({ initial }: { initial?: CourseData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    category: initial?.category ?? "",
    learningFormat: initial?.learningFormat ?? "ONLINE",
    originalPrice: initial?.originalPrice?.toString() ?? "",
    salePrice: initial?.salePrice?.toString() ?? "",
    duration: initial?.duration ?? "",
    instructorName: initial?.instructorName ?? "",
    badge: initial?.badge ?? "NONE",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
    displayOrder: initial?.displayOrder?.toString() ?? "0",
    thumbnail: initial?.thumbnail ?? "",
    youtubeUrl: initial?.youtubeUrl ?? "",
    studentCount: initial?.studentCount?.toString() ?? "0",
    rating: initial?.rating?.toString() ?? "0",
    totalViews: initial?.totalViews?.toString() ?? "0",
    totalOrders: initial?.totalOrders?.toString() ?? "0",
    saleDeadline: initial?.saleDeadline ?? "",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    requiresAccountType: initial?.requiresAccountType ?? false,
    requiresCccd: initial?.requiresCccd ?? false,
  });

  const [contentList, setContentList] = useState<string[]>(initial?.contentList ?? []);
  const [newContentItem, setNewContentItem] = useState("");

  const [commitments, setCommitments] = useState<string[]>(initial?.commitments ?? []);
  const [newCommitment, setNewCommitment] = useState("");

  const [registrationProcedure, setRegistrationProcedure] = useState(initial?.registrationProcedure ?? "");

  const [platformVariants, setPlatformVariants] = useState<PlatformVariant[]>(
    initial?.platformVariants ?? [],
  );
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantIconUrl, setNewVariantIconUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addContentItem() {
    const trimmed = newContentItem.trim();
    if (!trimmed) return;
    if (contentList.length >= MAX_CONTENT_ITEMS) return;
    setContentList((prev) => [...prev, trimmed]);
    setNewContentItem("");
  }

  function removeContentItem(idx: number) {
    setContentList((prev) => prev.filter((_, i) => i !== idx));
  }

  function addCommitment() {
    const trimmed = newCommitment.trim();
    if (!trimmed || commitments.length >= 20) return;
    setCommitments((prev) => [...prev, trimmed]);
    setNewCommitment("");
  }

  function removeCommitment(idx: number) {
    setCommitments((prev) => prev.filter((_, i) => i !== idx));
  }

  function addPresetPlatform(preset: { name: string; icon: string }) {
    if (platformVariants.some((v) => v.name === preset.name)) return;
    setPlatformVariants((prev) => [...prev, preset]);
  }

  function addCustomPlatform() {
    const name = newVariantName.trim();
    if (!name) return;
    if (platformVariants.some((v) => v.name === name)) return;
    setPlatformVariants((prev) => [...prev, { name, icon: newVariantIconUrl.trim() }]);
    setNewVariantName("");
    setNewVariantIconUrl("");
  }

  function removePlatformVariant(idx: number) {
    setPlatformVariants((prev) => prev.filter((_, i) => i !== idx));
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
      const res = await fetch("/api/admin/upload/thumbnail", { method: "POST", body: fd });
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
    if (!form.category.trim()) { setError("Vui lòng chọn danh mục khóa học."); return; }
    const originalPrice = parseFloat(form.originalPrice);
    const salePrice = parseFloat(form.salePrice);
    if (isNaN(originalPrice) || originalPrice <= 0) { setError("Giá gốc không hợp lệ."); return; }
    if (isNaN(salePrice) || salePrice <= 0) { setError("Giá bán không hợp lệ."); return; }

    const body = {
      name: form.name,
      ...(form.slug ? { slug: form.slug } : {}),
      category: form.category,
      learningFormat: form.learningFormat,
      originalPrice,
      salePrice,
      ...(form.duration ? { duration: form.duration } : {}),
      ...(form.instructorName ? { instructorName: form.instructorName } : {}),
      badge: form.badge,
      ...(form.description ? { description: form.description } : {}),
      isActive: form.isActive,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
      ...(form.youtubeUrl ? { youtubeUrl: form.youtubeUrl } : {}),
      studentCount: parseInt(form.studentCount, 10) || 0,
      rating: Math.min(5, Math.max(0, parseFloat(form.rating) || 0)),
      totalViews: parseInt(form.totalViews, 10) || 0,
      totalOrders: parseInt(form.totalOrders, 10) || 0,
      ...(form.saleDeadline ? { saleDeadline: new Date(form.saleDeadline).toISOString() } : {}),
      ...(form.seoTitle ? { seoTitle: form.seoTitle } : {}),
      ...(form.seoDescription ? { seoDescription: form.seoDescription } : {}),
      contentList,
      platformVariants,
      requiresAccountType: form.requiresAccountType,
      requiresCccd: form.requiresCccd,
      commitments,
      ...(registrationProcedure.trim() ? { registrationProcedure: registrationProcedure.trim() } : { registrationProcedure: null }),
    };

    setLoading(true);
    try {
      const url = isEdit ? `/api/products/courses/${initial.id}` : "/api/products/courses";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Thao tác thất bại."); return; }
      router.push("/admin/courses");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Xóa khóa học này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/courses/${initial.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Xóa thất bại."); return; }
      router.push("/admin/courses");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

      {/* ── LEFT column ── */}
      <div className="space-y-5">

        {/* ── Thông tin cơ bản ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Tên khóa học *</label>
              <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Slug</label>
              <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputCls} placeholder="tu-dong-tao-neu-trong" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Danh mục *</label>
              <CourseCategoryCombobox
                value={form.category}
                onChange={(v) => set("category", v)}
                placeholder="Chọn hoặc tìm danh mục..."
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Hình thức *</label>
              <select value={form.learningFormat} onChange={(e) => set("learningFormat", e.target.value)} className={inputCls}>
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Badge</label>
              <select value={form.badge} onChange={(e) => set("badge", e.target.value)} className={inputCls}>
                {BADGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giảng viên</label>
              <input type="text" value={form.instructorName} onChange={(e) => set("instructorName", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thời lượng</label>
              <input type="text" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="vd: 12 giờ" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Thứ tự hiển thị</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded border-gray-200 bg-white text-[#7C3AED]" />
            <span className="text-xs text-gray-500">Hiển thị công khai</span>
          </label>

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

        {/* ── Giá & Ưu đãi ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Giá &amp; Ưu đãi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giá gốc (VND) *</label>
              <input required type="number" min="1" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Giá bán (VND) *</label>
              <input required type="number" min="1" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Hạn ưu đãi</label>
              <input type="date" value={form.saleDeadline} onChange={(e) => set("saleDeadline", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Mô tả ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Mô tả</h2>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputCls + " resize-none"}
            placeholder="Mô tả chi tiết về khóa học..."
          />
        </div>

        {/* ── Danh sách nội dung ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Danh sách nội dung khóa học
            <span className="ml-2 text-xs font-normal text-gray-400">({contentList.length}/{MAX_CONTENT_ITEMS})</span>
          </h2>
          <div className="space-y-1.5">
            <div className="flex gap-2 items-start">
            <textarea
              value={newContentItem}
              onChange={(e) => setNewContentItem(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  addContentItem();
                }
              }}
              placeholder={"Thêm mục nội dung...\nVD:\n1. Nội dung\n   a. Chi tiết a\n   b. Chi tiết b\n\nCtrl+Enter để thêm"}
              maxLength={2000}
              rows={4}
              disabled={contentList.length >= MAX_CONTENT_ITEMS}
              className={inputCls + " flex-1 resize-none overflow-y-auto"}
            />
            <button
              type="button"
              onClick={addContentItem}
              disabled={contentList.length >= MAX_CONTENT_ITEMS}
              className="px-4 py-2 rounded-lg bg-[#7C3AED]/20 text-[#A855F7] text-sm hover:bg-[#7C3AED]/30 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Thêm
            </button>
          </div>
            <p className="text-[11px] text-gray-400 text-right">{newContentItem.length}/2000 ký tự</p>
          </div>
          {contentList.length >= MAX_CONTENT_ITEMS && (
            <p className="text-xs text-amber-600">Đã đạt giới hạn {MAX_CONTENT_ITEMS} mục nội dung.</p>
          )}
          {contentList.length > 0 ? (
            <ul className="space-y-2">
              {contentList.map((item, i) => (
                <li key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 text-sm text-gray-900">
                  <span className="text-[#7C3AED] shrink-0 mt-0.5">✓</span>
                  <span className="flex-1 whitespace-pre-wrap wrap-break-word max-h-24 overflow-y-auto">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeContentItem(i)}
                    className="text-gray-500 hover:text-[#EF4444] text-xs shrink-0"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Chưa có nội dung nào. Nhập và nhấn Enter hoặc bấm + Thêm.</p>
          )}
        </div>

        {/* ── Cam kết khóa học ── */}
        <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#065f46]">
            Cam kết khóa học
            <span className="ml-2 text-xs font-normal text-[#16a34a]">({commitments.length}/20)</span>
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCommitment}
              onChange={(e) => setNewCommitment(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCommitment(); } }}
              placeholder="VD: Hoàn tiền 100% nếu không hài lòng trong 7 ngày..."
              disabled={commitments.length >= 20}
              className={inputCls + " flex-1"}
            />
            <button
              type="button"
              onClick={addCommitment}
              disabled={commitments.length >= 20}
              className="px-4 py-2 rounded-lg bg-[#16a34a]/20 text-[#16a34a] text-sm hover:bg-[#16a34a]/30 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Thêm
            </button>
          </div>
          {commitments.length > 0 ? (
            <ul className="space-y-2">
              {commitments.map((item, i) => (
                <li key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm text-gray-900">
                  <span className="text-[#16a34a] shrink-0">✓</span>
                  <span className="flex-1">{item}</span>
                  <button type="button" onClick={() => removeCommitment(i)} className="text-gray-400 hover:text-[#EF4444] text-xs shrink-0">✕</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#16a34a]/70">Chưa có cam kết. Nhập và nhấn Enter hoặc bấm + Thêm.</p>
          )}
        </div>

        {/* ── Thủ tục đăng ký ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thủ tục đăng ký</h2>
          <p className="text-[11px] text-gray-400">Mô tả các bước, điều kiện cần thiết để đăng ký khóa học. Xuống dòng để tạo bước mới.</p>
          <textarea
            rows={5}
            value={registrationProcedure}
            onChange={(e) => setRegistrationProcedure(e.target.value.slice(0, 5000))}
            className={inputCls + " resize-none"}
            placeholder="VD: Bước 1: Điền thông tin đăng ký...\nBước 2: Chuyển khoản học phí..."
          />
          <p className="text-[11px] text-gray-400 text-right">{registrationProcedure.length}/5000 ký tự</p>
        </div>

        {/* ── Biến thể Platform ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Biến thể Platform</h2>
          <p className="text-[11px] text-gray-500">
            Chọn nhanh từ danh sách mạng xã hội phổ biến, hoặc thêm platform tùy chỉnh bên dưới.
          </p>

          {/* Preset social platforms */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {SOCIAL_PLATFORMS.map((preset) => {
              const active = platformVariants.some((v) => v.name === preset.name);
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => (active ? removePlatformVariant(platformVariants.findIndex((v) => v.name === preset.name)) : addPresetPlatform(preset))}
                  title={preset.name}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    active
                      ? "border-[#7C3AED] bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/50"
                      : "border-gray-200 bg-white hover:border-[#7C3AED]/50 hover:bg-gray-100"
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.icon} alt={preset.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[9px] text-gray-500 leading-tight text-center max-w-[52px] truncate">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom platform */}
          <div>
            <p className="text-[11px] text-gray-500 mb-2">Thêm platform không có trong danh sách:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomPlatform(); } }}
                placeholder="Tên platform..."
                className={inputCls + " flex-1"}
              />
              <input
                type="url"
                value={newVariantIconUrl}
                onChange={(e) => setNewVariantIconUrl(e.target.value)}
                placeholder="URL icon SVG (tùy chọn)..."
                className={inputCls + " flex-1"}
              />
              <button
                type="button"
                onClick={addCustomPlatform}
                className="px-4 py-2 rounded-lg bg-[#7C3AED]/20 text-[#A855F7] text-sm hover:bg-[#7C3AED]/30 transition-colors whitespace-nowrap"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Active variants summary */}
          {platformVariants.length > 0 ? (
            <div>
              <p className="text-[11px] text-gray-500 mb-2">Đã chọn ({platformVariants.length}):</p>
              <div className="flex flex-wrap gap-2">
                {platformVariants.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
                  >
                    {v.icon && v.icon.startsWith("http") ? (
                      <div className="w-4 h-4 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.icon} alt={v.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <span className="text-sm shrink-0">{v.icon}</span>
                    )}
                    <span className="text-sm text-gray-900">{v.name}</span>
                    <button
                      type="button"
                      onClick={() => removePlatformVariant(i)}
                      className="text-gray-500 hover:text-[#EF4444] text-xs ml-1 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Chưa chọn platform nào.</p>
          )}
        </div>

      </div>

      {/* ── RIGHT sidebar ── */}
      <div className="space-y-5 lg:sticky lg:top-6">

        {/* ── Media ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Media</h2>

          {/* Thumbnail */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Thumbnail khóa học</label>
            <div className="flex gap-4 items-start">
              {/* Preview */}
              <div className="shrink-0 w-28 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                {form.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={form.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#3F3F46] text-xs text-center px-2">Chưa có ảnh</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                {/* File picker */}
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
                  disabled={thumbUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#3F3F46] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 text-sm text-gray-500 hover:text-[#A855F7] transition-colors disabled:opacity-60"
                >
                  {thumbUploading ? (
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
                    type="url"
                    value={form.thumbnail}
                    onChange={(e) => set("thumbnail", e.target.value)}
                    placeholder="https://..."
                    className={inputCls + " text-xs py-1.5"}
                  />
                </div>

                {thumbError && <p className="text-[11px] text-[#EF4444]">{thumbError}</p>}
                {form.thumbnail && !thumbUploading && (
                  <button
                    type="button"
                    onClick={() => set("thumbnail", "")}
                    className="text-[11px] text-gray-500 hover:text-[#EF4444] transition-colors"
                  >
                    ✕ Xóa ảnh
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* YouTube */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Link YouTube</label>
            <input type="url" value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
          </div>
        </div>

        {/* ── Thống kê hiển thị ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Thống kê hiển thị</h2>
          <p className="text-[11px] text-gray-500">Các số liệu này hiển thị trực tiếp lên trang khóa học cho người dùng.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Số học viên</label>
              <input type="number" min="0" value={form.studentCount} onChange={(e) => set("studentCount", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Đánh giá (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Lượt xem</label>
              <input type="number" min="0" value={form.totalViews} onChange={(e) => set("totalViews", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Lượt đơn hàng</label>
              <input type="number" min="0" value={form.totalOrders} onChange={(e) => set("totalOrders", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── SEO ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">SEO Tiêu đề & Mô tả</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tiêu đề SEO</label>
              <input type="text" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={255} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Mô tả SEO</label>
              <textarea
                rows={2}
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                maxLength={500}
                className={inputCls + " resize-none"}
              />
            </div>
          </div>
        </div>

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
