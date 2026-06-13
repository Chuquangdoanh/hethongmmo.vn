"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";

interface SubCategoryItem {
  id: string;
  name: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  sellerCategory: string;
  subCategories?: SubCategoryItem[];
  initialData?: {
    id: string;
    name: string;
    price: number;
    description: string;
    imageUrl: string;
    isActive: boolean;
    isHidden: boolean;
    subCategoryId?: string | null;
  };
}

export default function ProductForm({ mode, sellerCategory, subCategories = [], initialData }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    price: initialData?.price?.toString() ?? "",
    description: initialData?.description ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    isActive: initialData?.isActive ?? true,
    isHidden: initialData?.isHidden ?? false,
  });
  const [subCategoryId, setSubCategoryId] = useState<string | null>(initialData?.subCategoryId ?? null);
  const [stockText, setStockText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleImageFile(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

      // Bước 1: lấy presigned URL từ VPS (không upload file lên VPS)
      const presignRes = await fetch("/api/storage/presign", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "product-image", contentType: file.type, fileExtension: ext }),
      });
      const presignJson = await presignRes.json() as { data?: { uploadUrl: string; publicUrl: string }; error?: string };
      if (!presignRes.ok || !presignJson.data?.uploadUrl) {
        setUploadError(presignJson.error ?? "Không lấy được URL upload.");
        return;
      }

      // Bước 2: upload thẳng từ browser lên R2 (không qua VPS)
      const uploadRes = await fetch(presignJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        setUploadError("Upload ảnh thất bại. Vui lòng thử lại.");
        return;
      }

      setForm((f) => ({ ...f, imageUrl: presignJson.data!.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleImageFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) void handleImageFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (!form.name.trim() || isNaN(price) || price <= 0) {
      setError("Vui lòng điền đầy đủ thông tin hợp lệ.");
      return;
    }
    if (mode === "create") {
      const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setError("Vui lòng nhập ít nhất 1 item vào kho.");
        return;
      }
    }

    setError("");
    setLoading(true);
    try {
      const url = mode === "create"
        ? "/api/seller/products"
        : `/api/seller/products/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        price,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
        isHidden: form.isHidden,
        sellerCategory,
        subCategoryId: subCategoryId ?? null,
      };

      if (mode === "create") {
        body.stockItems = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success?: boolean; data?: unknown; error?: string };
      if (!res.ok || (mode === "edit" && !json.success)) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.push("/san-pham");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // ── Shared blocks ──────────────────────────────────────
  const nameField = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Tên sản phẩm *</label>
      <input
        type="text"
        value={form.name}
        onChange={set("name")}
        required
        maxLength={200}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#e11d48]/60 focus:bg-white focus:outline-none transition-colors"
        placeholder="Tên sản phẩm"
        suppressHydrationWarning
      />
    </div>
  );

  const priceField = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Giá bán (VNĐ) *</label>
      <input
        type="number"
        value={form.price}
        onChange={set("price")}
        required
        min={1000}
        step={1000}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#e11d48]/60 focus:bg-white focus:outline-none transition-colors"
        placeholder="VD: 50000"
        suppressHydrationWarning
      />
    </div>
  );

  const subCategoryField = subCategories.length > 0 ? (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">Danh mục con</label>
      <div className="flex flex-wrap gap-2">
        {subCategories.map((sub) => {
          const active = subCategoryId === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubCategoryId(active ? null : sub.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600"
              }`}
            >
              {active ? "✓ " : ""}{sub.name}
            </button>
          );
        })}
      </div>
      {subCategoryId && (
        <button
          type="button"
          onClick={() => setSubCategoryId(null)}
          className="mt-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          Bỏ chọn
        </button>
      )}
    </div>
  ) : null;

  const checkboxes = (
    <div className="pt-2 border-t border-gray-100 flex items-center gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-violet-600"
        />
        <span className="text-xs text-gray-600">Đang bán</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isHidden}
          onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-violet-600"
        />
        <span className="text-xs text-gray-600">Ẩn sản phẩm</span>
      </label>
    </div>
  );

  const imageUpload = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Ảnh sản phẩm</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`rounded-xl border-2 border-dashed transition-colors select-none ${
          uploading
            ? "border-[#e11d48]/40 bg-red-50 cursor-wait"
            : "border-[#e11d48]/30 bg-gray-50 hover:border-[#e11d48]/60 hover:bg-red-50/30 cursor-pointer"
        }`}
      >
        {form.imageUrl ? (
          <div className="flex items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r2Url(form.imageUrl)} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200 shrink-0" />
            <div className="flex gap-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">Đổi ảnh</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, imageUrl: "" })); }}
                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Xóa</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 px-4 gap-2">
            {uploading ? (
              <>
                <div className="w-7 h-7 border-2 border-[#e11d48] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#e11d48] font-medium">Đang tải ảnh lên...</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-[#e11d48]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500 font-medium">Nhấn để chọn ảnh hoặc kéo thả</p>
                <p className="text-[10px] text-gray-400">JPEG · PNG · WebP · GIF · Tối đa 5MB</p>
              </>
            )}
          </div>
        )}
      </div>
      {uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
    </div>
  );

  const descField = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Mô tả sản phẩm</label>
      <textarea
        value={form.description}
        onChange={set("description")}
        rows={6}
        maxLength={5000}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#e11d48]/60 focus:bg-white focus:outline-none transition-colors resize-none"
        placeholder="Mô tả chi tiết về sản phẩm..."
      />
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-3 pt-1">
      <button type="submit" disabled={loading || uploading}
        className="flex-1 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
        {loading ? "Đang lưu..." : mode === "create" ? "Tạo sản phẩm" : "Lưu thay đổi"}
      </button>
      <button type="button" onClick={() => router.back()}
        className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 hover:text-gray-700 transition-colors">
        Hủy
      </button>
    </div>
  );
  // ── End shared blocks ───────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border-2 border-[#e11d48]/60 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e11d48]/20">

          {mode === "create" ? (
            <>
              {/* CREATE — trái: thông tin sản phẩm */}
              <div className="p-6 space-y-5">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Thông tin sản phẩm</p>
                {nameField}
                {priceField}
                {subCategoryField}
                {imageUpload}
                {descField}
                {checkboxes}
              </div>

              {/* CREATE — phải: kho hàng */}
              <div className="p-6 space-y-5 flex flex-col">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Kho hàng *</p>
                <p className="text-[11px] text-gray-400 -mt-3">
                  Nhập mỗi item trên 1 dòng (email:pass, cookie, key...). Tối thiểu 1, tối đa 100 items. Thêm tiếp sau khi tạo xong.
                </p>
                <textarea
                  value={stockText}
                  onChange={(e) => setStockText(e.target.value)}
                  rows={14}
                  placeholder={"user1@gmail.com:pass123\nuser2@gmail.com:pass456\n..."}
                  className="flex-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 font-mono placeholder:text-gray-400 focus:border-[#e11d48]/60 focus:outline-none resize-none"
                />
                <p className="text-[11px] text-gray-400 -mt-3">
                  {stockText.split("\n").filter((l) => l.trim()).length} items sẽ thêm vào kho
                </p>
                {error && <p className="text-xs text-red-500">{error}</p>}
                {actionButtons}
              </div>
            </>
          ) : (
            <>
              {/* EDIT — trái: tên + giá + trạng thái */}
              <div className="p-6 space-y-5">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Thông tin cơ bản</p>
                {nameField}
                {priceField}
                {subCategoryField}
                {checkboxes}
              </div>

              {/* EDIT — phải: ảnh + mô tả + buttons */}
              <div className="p-6 space-y-5">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Hình ảnh & Mô tả</p>
                {imageUpload}
                {descField}
                {error && <p className="text-xs text-red-500">{error}</p>}
                {actionButtons}
              </div>
            </>
          )}

        </div>
      </div>
    </form>
  );
}
