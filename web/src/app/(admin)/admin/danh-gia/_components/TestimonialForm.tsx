"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { r2Url } from "@/lib/utils/image-url";

const AVATAR_COLORS = [
  { label: "Xanh dương", value: "#0066ff" },
  { label: "Xanh lá",   value: "#10b981" },
  { label: "Tím",       value: "#7c3aed" },
  { label: "Vàng",      value: "#f59e0b" },
  { label: "Đỏ",        value: "#ef4444" },
  { label: "Hồng",      value: "#ec4899" },
];

interface CourseOption   { id: string; name: string; }
interface ServiceOption  { id: string; name: string; category: string; }

interface TestimonialData {
  id?: string;
  type?: string;
  courseId?:  string | null;
  serviceId?: string | null;
  category?:  string | null;
  reviewerName?:     string;
  reviewerRole?:     string | null;
  reviewerAvatar?:   string | null;
  reviewerInitials?: string | null;
  reviewerColor?:    string | null;
  content?:      string;
  rating?:       number;
  isActive?:     boolean;
  displayOrder?: number;
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

export default function TestimonialForm({
  initial,
  courses,
  services,
}: {
  initial?:  TestimonialData;
  courses:   CourseOption[];
  services:  ServiceOption[];
}) {
  const router  = useRouter();
  const isEdit  = !!initial?.id;

  // Tìm danh mục hiện tại từ serviceId ban đầu (khi sửa)
  const initialServiceCategory = useMemo(() => {
    if (!initial?.serviceId) return "";
    return services.find((s) => s.id === initial.serviceId)?.category ?? "";
  }, [initial, services]);

  const [form, setForm] = useState({
    type:             initial?.type             ?? "SERVICE",
    courseId:         initial?.courseId         ?? "",
    serviceId:        initial?.serviceId        ?? "",
    reviewerName:     initial?.reviewerName     ?? "",
    reviewerRole:     initial?.reviewerRole     ?? "",
    reviewerAvatar:   initial?.reviewerAvatar   ?? "",
    reviewerInitials: initial?.reviewerInitials ?? "",
    reviewerColor:    initial?.reviewerColor    ?? "#0066ff",
    content:          initial?.content          ?? "",
    rating:           initial?.rating?.toString()       ?? "5",
    isActive:         initial?.isActive         ?? true,
    displayOrder:     initial?.displayOrder?.toString() ?? "0",
  });

  // State riêng cho cascading select dịch vụ
  const [serviceCategory, setServiceCategory] = useState(initialServiceCategory);

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAvatarUploadError("Ảnh quá lớn, tối đa 2 MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setAvatarUploadError("");
    setAvatarUploading(true);
    try {
      const res  = await fetch("/api/admin/upload/thumbnail?type=testimonial-avatar", { method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setAvatarUploadError(json.error ?? "Upload thất bại"); return; }
      set("reviewerAvatar", json.data?.url ?? "");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // Danh sách danh mục dịch vụ (unique, sorted)
  const serviceCategories = useMemo(
    () => [...new Set(services.map((s) => s.category))].sort(),
    [services],
  );

  // Dịch vụ trong danh mục đã chọn
  const filteredServices = useMemo(
    () => (serviceCategory ? services.filter((s) => s.category === serviceCategory) : []),
    [services, serviceCategory],
  );

  // Khi đổi danh mục → reset serviceId
  function handleCategoryChange(cat: string) {
    setServiceCategory(cat);
    set("serviceId", "");
  }

  // Category hiển thị (lấy từ service đã chọn nếu SERVICE, hoặc để trống)
  const displayCategory = useMemo(() => {
    if (form.type === "SERVICE" && form.serviceId) {
      return services.find((s) => s.id === form.serviceId)?.category ?? serviceCategory;
    }
    return "";
  }, [form.type, form.serviceId, serviceCategory, services]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.reviewerName.trim()) { setError("Vui lòng nhập tên người đánh giá."); return; }
    if (!form.content.trim())      { setError("Vui lòng nhập nội dung đánh giá."); return; }

    const body = {
      type:         form.type,
      ...(form.type === "COURSE"  && form.courseId  ? { courseId:  form.courseId }  : {}),
      ...(form.type === "SERVICE" && form.serviceId ? { serviceId: form.serviceId } : {}),
      ...(displayCategory ? { category: displayCategory } : {}),
      reviewerName:     form.reviewerName.trim(),
      ...(form.reviewerRole     ? { reviewerRole:     form.reviewerRole.trim()     } : {}),
      ...(form.reviewerAvatar   ? { reviewerAvatar:   form.reviewerAvatar.trim()   } : {}),
      ...(form.reviewerInitials ? { reviewerInitials: form.reviewerInitials.trim() } : {}),
      reviewerColor:    form.reviewerColor,
      content:          form.content.trim(),
      rating:           parseInt(form.rating, 10),
      isActive:         form.isActive,
      displayOrder:     parseInt(form.displayOrder, 10) || 0,
    };

    setLoading(true);
    try {
      const url    = isEdit ? `/api/admin/testimonials/${initial!.id}` : "/api/admin/testimonials";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json   = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Thao tác thất bại."); return; }
      router.push("/admin/danh-gia");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Xóa đánh giá này?")) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/testimonials/${initial.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Xóa thất bại."); return; }
      router.push("/admin/danh-gia");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const selectedService = form.serviceId ? services.find((s) => s.id === form.serviceId) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* ── Loại đánh giá ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Loại đánh giá</h2>
        <div className="flex gap-3">
          {(["SERVICE", "COURSE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { set("type", t); set("courseId", ""); set("serviceId", ""); setServiceCategory(""); }}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.type === t
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#7C3AED]/50"
              }`}
            >
              {t === "SERVICE" ? "⚡ Dịch vụ" : "📚 Khóa học"}
            </button>
          ))}
        </div>

        {/* ── Chọn Khóa học ── */}
        {form.type === "COURSE" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Khóa học</label>
            <select value={form.courseId} onChange={(e) => set("courseId", e.target.value)} className={inputCls}>
              <option value="">— Không gắn với khóa cụ thể —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Chọn Dịch vụ: cascading select ── */}
        {form.type === "SERVICE" && (
          <div className="space-y-3">
            {/* Bước 1: Chọn danh mục */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center">1</span>
                  Chọn danh mục dịch vụ
                </span>
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={inputCls}
              >
                <option value="">— Chọn danh mục —</option>
                {serviceCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Bước 2: Chọn dịch vụ (chỉ hiện sau khi chọn danh mục) */}
            {serviceCategory && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center">2</span>
                    Chọn dịch vụ trong danh mục
                  </span>
                </label>
                {filteredServices.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Không có dịch vụ trong danh mục này.</p>
                ) : (
                  <select
                    value={form.serviceId}
                    onChange={(e) => set("serviceId", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Không gắn với dịch vụ cụ thể —</option>
                    {filteredServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Badge dịch vụ đã chọn */}
            {selectedService && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs">
                <span className="text-green-500">✓</span>
                <span className="font-medium text-green-700">{selectedService.name}</span>
                <span className="text-green-500 opacity-70">— {selectedService.category}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Thông tin người đánh giá ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Người đánh giá</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tên *</label>
            <input required type="text" value={form.reviewerName} onChange={(e) => set("reviewerName", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Vai trò / Chức danh</label>
            <input type="text" value={form.reviewerRole} onChange={(e) => set("reviewerRole", e.target.value)} placeholder="VD: Học viên khóa Facebook, Chủ shop..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Chữ viết tắt avatar</label>
            <input type="text" maxLength={3} value={form.reviewerInitials} onChange={(e) => set("reviewerInitials", e.target.value.toUpperCase())} placeholder="VD: NQH" className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">Tự động tạo nếu để trống</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Màu avatar</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => set("reviewerColor", value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.reviewerColor === value ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ background: value }}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">Ảnh đại diện (tùy chọn)</label>
            {/* Hidden file input */}
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFile}
            />
            {form.reviewerAvatar ? (
              /* Đã có ảnh — chỉ hiển thị preview + nút đổi/xóa */
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-200">
                  <Image src={r2Url(form.reviewerAvatar)} alt="avatar" fill className="object-cover" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={avatarUploading}
                    className="text-xs text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-60 transition-colors"
                  >
                    {avatarUploading ? <><span className="animate-spin inline-block">⟳</span> Đang tải...</> : "Đổi ảnh"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => { set("reviewerAvatar", ""); setAvatarUploadError(""); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Xóa ảnh
                  </button>
                </div>
                {avatarUploadError && <p className="text-[11px] text-red-500">{avatarUploadError}</p>}
              </div>
            ) : (
              /* Chưa có ảnh — hiển thị nút upload */
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex items-center gap-1.5 w-full justify-center px-4 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 text-sm text-gray-500 hover:text-[#7C3AED] transition-colors disabled:opacity-60"
                >
                  {avatarUploading ? (
                    <><span className="animate-spin inline-block">⟳</span> Đang tải lên...</>
                  ) : (
                    <>↑ Tải ảnh lên (JPEG/PNG/WebP · tối đa 2 MB)</>
                  )}
                </button>
                {avatarUploadError && <p className="text-[11px] text-red-500">{avatarUploadError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nội dung đánh giá ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Nội dung đánh giá</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Đánh giá *</label>
          <textarea
            required
            rows={4}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="Nội dung đánh giá từ khách hàng..."
            className={inputCls + " resize-none"}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{form.content.length}/2000</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Số sao (1-5)</label>
            <select value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{"★".repeat(r)} ({r})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Thứ tự</label>
            <input type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-600">Hiển thị</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="rounded-xl border border-border bg-white p-4">
        <p className="text-xs text-gray-400 mb-3">Preview</p>
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden relative"
            style={{ background: form.reviewerAvatar ? undefined : form.reviewerColor }}
          >
            {form.reviewerAvatar ? (
              <Image src={form.reviewerAvatar} alt="avatar" fill className="object-cover" />
            ) : (
              form.reviewerInitials || form.reviewerName.split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("")
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{form.reviewerName || "Tên người đánh giá"}</p>
              {form.reviewerRole && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{form.reviewerRole}</span>}
              <span className="text-xs text-amber-500">{"★".repeat(parseInt(form.rating, 10))}</span>
            </div>
            {(selectedService ?? (form.type === "COURSE" && form.courseId)) && (
              <p className="text-[10px] text-[#7C3AED] font-medium mt-0.5">
                {selectedService?.name ?? courses.find((c) => c.id === form.courseId)?.name}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{form.content || "Nội dung đánh giá..."}</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-60"
        >
          {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo đánh giá"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Xóa
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/admin/danh-gia")}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
