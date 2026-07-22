"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";
import { FileText, Upload, X, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import VariantManager from "@/components/shared/VariantManager";
import ProductGalleryManager from "@/components/shared/ProductGalleryManager";

const MAX_STOCK_ITEMS = 5000;
const MAX_FILE_SIZE_MB = 10;

// Nguồn gốc sản phẩm
const ORIGIN_OPTIONS: { value: string; label: string }[] = [
  { value: "SELF_CREATED", label: "Tự tạo" },
  { value: "SELF_RAISED", label: "Tự nuôi" },
  { value: "BOUGHT_INDIVIDUAL", label: "Thu mua từ cá nhân" },
  { value: "BOUGHT_BUSINESS", label: "Thu mua từ doanh nghiệp" },
  { value: "LEGAL_TRANSFER", label: "Được chuyển nhượng hợp pháp" },
  { value: "OTHER", label: "Khác" },
];
const ORIGIN_DESC_MIN = 30;
const ORIGIN_DESC_MAX = 500;

type StoreTypeKey = "KHO_TAI_NGUYEN" | "TAI_NGUYEN_MMO";

const STORE_PAGES: { key: StoreTypeKey; label: string; flag: "showInKhoTaiNguyen" | "showInTaiNguyenMmo" }[] = [
  { key: "KHO_TAI_NGUYEN", label: "Kho tài nguyên", flag: "showInKhoTaiNguyen" },
  { key: "TAI_NGUYEN_MMO",  label: "Nguyên liệu",    flag: "showInTaiNguyenMmo" },
];

interface SubCategoryItem {
  id: string;
  name: string;
}

interface SubCatFull {
  id: string;
  name: string;
  categoryName: string;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
}

interface ProductFormProps {
  mode: "create" | "edit";
  sellerCategory: string;
  subCategories?: SubCategoryItem[];
  allSubCats?: SubCatFull[];
  /** Ẩn khu vực thư viện ảnh khi sản phẩm đang bị admin hạn chế (chỉ áp dụng mode="edit") */
  isRestricted?: boolean;
  initialData?: {
    id: string;
    name: string;
    price: number;
    warrantyInfo: string;
    description: string;
    imageUrl: string;
    isActive: boolean;
    isHidden: boolean;
    subCategoryId?: string | null;
    storeType?: string;
    productSellerCategory?: string;
  };
}

export default function ProductForm({ mode, sellerCategory, subCategories = [], allSubCats, isRestricted = false, initialData }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    price: initialData?.price?.toString() ?? "",
    warrantyInfo: initialData?.warrantyInfo ?? "",
    description: initialData?.description ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    isActive: initialData?.isActive ?? true,
    isHidden: initialData?.isHidden ?? false,
  });
  const [subCategoryId, setSubCategoryId] = useState<string | null>(initialData?.subCategoryId ?? null);

  // ── Category selector state (khi allSubCats được truyền vào) ─────────────
  const [storeType, setStoreType] = useState<StoreTypeKey>(() => {
    const fromInitial = initialData?.storeType as StoreTypeKey | undefined;
    if (fromInitial) return fromInitial;
    // Mặc định chọn trang đầu tiên thực sự có danh mục cha cho seller này —
    // tránh mở form vào tab rỗng khiến khối "Danh mục cha" bị ẩn.
    const firstPageWithCats = STORE_PAGES.find((pg) => allSubCats?.some((s) => s[pg.flag]));
    return firstPageWithCats?.key ?? "KHO_TAI_NGUYEN";
  });
  const [sellerCat, setSellerCat] = useState(initialData?.productSellerCategory ?? "");

  const currentPageDef = useMemo(
    () => STORE_PAGES.find((p) => p.key === storeType) ?? STORE_PAGES[0]!,
    [storeType],
  );
  const parentCats = useMemo(() => {
    if (!allSubCats) return [];
    return [...new Set(allSubCats.filter((s) => s[currentPageDef.flag]).map((s) => s.categoryName))].sort();
  }, [allSubCats, storeType]);
  const filteredSubCats = useMemo(() => {
    if (!allSubCats || !sellerCat) return [];
    return allSubCats.filter((s) => s[currentPageDef.flag] && s.categoryName === sellerCat);
  }, [allSubCats, storeType, sellerCat]);

  // ── Nguồn gốc sản phẩm (bắt buộc khi tạo mới) ─────────────────────────────
  const [originType, setOriginType] = useState("");
  const [originDescription, setOriginDescription] = useState("");
  const [originCommitment, setOriginCommitment] = useState(false);
  const [originTouched, setOriginTouched] = useState({ type: false, desc: false, commit: false });
  const originDescLen = originDescription.trim().length;
  const originValid =
    !!originType && originDescLen >= ORIGIN_DESC_MIN && originDescLen <= ORIGIN_DESC_MAX && originCommitment;

  // ── Stock input state (create mode only) ──────────────────────────────────
  const [stockTab, setStockTab] = useState<"file" | "manual">("file");
  const [stockText, setStockText] = useState("");
  // Parsed items from file upload (overrides textarea when set)
  const [fileItems, setFileItems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  // In-file duplicate warning (shown after parsing)
  const [fileDupCount, setFileDupCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  function set<K extends keyof typeof form>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function checkImageAspectRatio(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio = img.width / img.height;
        const target = 16 / 9;
        // Cho phép sai lệch tối đa 5%
        resolve(img.width >= img.height && Math.abs(ratio - target) / target < 0.05);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      img.src = url;
    });
  }

  async function handleImageFile(file: File) {
    setUploadError("");

    const isValid = await checkImageAspectRatio(file);
    if (!isValid) {
      setUploadError("Ảnh phải có tỷ lệ 16:9 khổ ngang (ví dụ: 1920×1080, 1280×720). Vui lòng chọn lại ảnh.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "product-image");
      const res = await fetch("/api/storage/upload", { credentials: "include", method: "POST", body: formData });
      const json = await res.json() as { data?: { publicUrl: string }; error?: string };
      if (!res.ok || !json.data?.publicUrl) {
        setUploadError(json.error ?? "Upload ảnh thất bại. Vui lòng thử lại.");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: json.data!.publicUrl }));
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

  // ── TXT file handlers for stock ────────────────────────────────────────────
  function handleTxtSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    setFileDupCount(0);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File quá lớn. Tối đa ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result ?? "") as string;
      const raw = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      if (raw.length === 0) { setFileError("File không có nội dung hợp lệ."); return; }
      if (raw.length > MAX_STOCK_ITEMS) {
        setFileError(`File có ${raw.length.toLocaleString("vi-VN")} dòng, vượt giới hạn ${MAX_STOCK_ITEMS.toLocaleString("vi-VN")}.`);
        return;
      }

      // Detect + remove in-file duplicates
      const seen = new Set<string>();
      const deduped: string[] = [];
      let dups = 0;
      for (const line of raw) {
        if (seen.has(line)) { dups++; } else { seen.add(line); deduped.push(line); }
      }

      setFileName(file.name);
      setFileItems(deduped);
      setFileDupCount(dups);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function clearFile() {
    setFileItems([]);
    setFileName("");
    setFileError("");
    setFileDupCount(0);
  }

  function descWordCount() {
    return form.description.trim().split(/\s+/).filter(Boolean).length;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) { setError("Vui lòng nhập tên sản phẩm."); return; }
    if (trimmedName.length < 3) { setError("Tên sản phẩm tối thiểu 3 ký tự."); return; }

    if (!form.imageUrl.trim()) { setError("Vui lòng thêm ảnh sản phẩm."); return; }

    if (!form.warrantyInfo.trim()) { setError("Vui lòng nhập thông tin bảo hành."); return; }

    if (subCategories.length > 0 && !subCategoryId) { setError("Vui lòng chọn danh mục con."); return; }

    if (descWordCount() < 20) { setError("Mô tả sản phẩm phải có ít nhất 20 từ."); return; }

    const price = parseInt(form.price, 10);
    if (isNaN(price) || price < 0) { setError("Giá bán không hợp lệ."); return; }

    let stockItems: string[] = [];
    if (mode === "create") {
      if (stockTab === "file") {
        if (fileItems.length === 0) { setError("Vui lòng chọn file TXT hoặc nhập tay ít nhất 1 item."); return; }
        stockItems = fileItems;
      } else {
        const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) { setError("Vui lòng nhập ít nhất 1 item vào kho."); return; }
        // Dedup in manual textarea
        const seen = new Set<string>();
        stockItems = lines.filter((l) => { if (seen.has(l)) return false; seen.add(l); return true; });
      }
      if (stockItems.length > 5000) {
        setError(`Kho tối đa 5.000 items khi tạo sản phẩm. Hiện có ${stockItems.length.toLocaleString("vi-VN")} items — hãy chia nhỏ.`);
        return;
      }

      // Nguồn gốc sản phẩm — bắt buộc trước khi đăng bán
      setOriginTouched({ type: true, desc: true, commit: true });
      if (!originType) { setError("Vui lòng chọn loại nguồn gốc sản phẩm."); return; }
      if (originDescLen < ORIGIN_DESC_MIN) { setError(`Mô tả nguồn gốc tối thiểu ${ORIGIN_DESC_MIN} ký tự.`); return; }
      if (originDescLen > ORIGIN_DESC_MAX) { setError(`Mô tả nguồn gốc tối đa ${ORIGIN_DESC_MAX} ký tự.`); return; }
      if (!originCommitment) { setError("Bạn phải cam kết nguồn gốc hợp pháp trước khi đăng bán."); return; }
    }

    setError("");
    setLoading(true);
    try {
      const url = mode === "create" ? "/api/seller/products" : `/api/seller/products/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      // Khi có allSubCats (chế độ chọn danh mục mới): dùng sellerCat + storeType
      // Khi không có: fallback về sellerCategory cũ (backward compat)
      const resolvedSellerCategory = allSubCats ? sellerCat : sellerCategory;
      if (allSubCats && !sellerCat) {
        setError("Vui lòng chọn danh mục cha.");
        return;
      }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        price,
        warrantyInfo: form.warrantyInfo.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
        isHidden: form.isHidden,
        sellerCategory: resolvedSellerCategory,
        subCategoryId: subCategoryId ?? null,
      };
      if (allSubCats) body.storeType = storeType;
      if (mode === "create") {
        body.stockItems = stockItems;
        body.originType = originType;
        body.originDescription = originDescription.trim();
        body.originCommitment = originCommitment;
      }

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json() as { success?: boolean; data?: { productId?: string }; error?: string };
      if (!res.ok || (mode === "edit" && !json.success)) { setError(json.error ?? "Thao tác thất bại."); return; }
      if (mode === "create") {
        setCreatedProductId(json.data?.productId ?? null);
        return;
      }
      router.push("/san-pham");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // ── Shared field blocks ────────────────────────────────────────────────────
  const nameField = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Tên sản phẩm *</label>
      <input type="text" value={form.name} onChange={set("name")} required minLength={3} maxLength={200}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#e11d48]/60 focus:bg-white focus:outline-none transition-colors"
        placeholder="Tên sản phẩm (tối thiểu 3 ký tự)" suppressHydrationWarning />
      {form.name.trim().length > 0 && form.name.trim().length < 3 && (
        <p className="text-[10px] text-amber-500 mt-1">Cần ít nhất 3 ký tự</p>
      )}
    </div>
  );

  const warrantyInfoField = (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-red-500">
        Thông tin bảo hành <span className="font-bold">*</span>
      </label>
      <textarea
        value={form.warrantyInfo}
        onChange={set("warrantyInfo")}
        rows={4}
        maxLength={2000}
        required
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none transition-colors resize-none ${
          !form.warrantyInfo.trim()
            ? "border-red-400 bg-red-50 focus:border-red-500"
            : "border-gray-200 bg-gray-50 focus:bg-white focus:border-[#e11d48]/60"
        }`}
        placeholder="Nhập chính sách bảo hành, hỗ trợ sau mua, thời hạn đổi trả..."
        suppressHydrationWarning
      />
      <div className="flex items-center justify-between mt-1">
        {!form.warrantyInfo.trim() ? (
          <p className="text-[10px] text-red-500 font-medium">Bắt buộc nhập</p>
        ) : (
          <p className="text-[10px] text-emerald-500">✓ Đã nhập</p>
        )}
        <p className="text-[10px] text-gray-400">{form.warrantyInfo.length} / 2000</p>
      </div>
    </div>
  );

  const priceField = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Giá bán (VNĐ) *</label>
      <input type="number" value={form.price} onChange={set("price")} required min={0} step={1}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#e11d48]/60 focus:bg-white focus:outline-none transition-colors"
        placeholder="VD: 50000" suppressHydrationWarning />
      {form.price !== "" && !isNaN(parseInt(form.price, 10)) && (
        <p className="text-[10px] text-gray-400 mt-1">
          = {parseInt(form.price, 10).toLocaleString("vi-VN")}đ
          {parseInt(form.price, 10) === 0 && <span className="ml-1 text-amber-500">· Miễn phí</span>}
        </p>
      )}
    </div>
  );

  const subCategoryField = subCategories.length > 0 ? (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        Danh mục con <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {subCategories.map((sub) => {
          const active = subCategoryId === sub.id;
          return (
            <button key={sub.id} type="button" onClick={() => setSubCategoryId(active ? null : sub.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600"
              }`}>
              {active ? "✓ " : ""}{sub.name}
            </button>
          );
        })}
      </div>
      {subCategoryId && (
        <button type="button" onClick={() => setSubCategoryId(null)} className="mt-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
          Bỏ chọn
        </button>
      )}
    </div>
  ) : null;

  // ── Category selector (3 tầng) — chỉ hiển thị khi allSubCats được truyền ──
  const categorySelector = allSubCats && allSubCats.length > 0 ? (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500">Trang & Danh mục *</label>

      {/* Page tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {STORE_PAGES.map((page) => (
          <button
            key={page.key}
            type="button"
            onClick={() => { setStoreType(page.key); setSellerCat(""); setSubCategoryId(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              storeType === page.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Parent category */}
      {parentCats.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Danh mục cha</p>
          <div className="flex flex-wrap gap-2">
            {parentCats.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setSellerCat(cat); setSubCategoryId(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sellerCat === cat
                    ? "bg-white border-primary text-primary font-semibold"
                    : "bg-white border-transparent text-gray-800 hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — trang được chọn không có danh mục cha nào hiển thị */}
      {parentCats.length === 0 && (
        <p className="text-xs text-gray-400">
          Chưa có danh mục cha nào được cấu hình hiển thị cho trang này. Vui lòng chọn trang khác.
        </p>
      )}

      {/* Sub-category */}
      {sellerCat && filteredSubCats.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Danh mục con</p>
          <div className="flex flex-wrap gap-2">
            {filteredSubCats.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubCategoryId(subCategoryId === sub.id ? null : sub.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  subCategoryId === sub.id
                    ? "bg-white border-primary text-primary font-semibold"
                    : "bg-white border-transparent text-gray-800 hover:text-primary"
                }`}
              >
                {subCategoryId === sub.id ? "✓ " : ""}{sub.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : subCategoryField;

  const checkboxes = (
    <div className="pt-2 border-t border-gray-100 flex items-center gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-violet-600" />
        <span className="text-xs text-gray-600">Đang bán</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isHidden} onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-violet-600" />
        <span className="text-xs text-gray-600">Ẩn sản phẩm</span>
      </label>
    </div>
  );

  const imageUpload = (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Ảnh sản phẩm <span className="text-red-500">*</span>
      </label>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
      <div onClick={() => { if (!uploading) fileInputRef.current?.click(); }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
        className={`rounded-xl border-2 border-dashed transition-colors select-none ${
          uploading ? "border-[#e11d48]/40 bg-red-50 cursor-wait" : "border-[#e11d48]/30 bg-gray-50 hover:border-[#e11d48]/60 hover:bg-red-50/30 cursor-pointer"
        }`}>
        {form.imageUrl ? (
          <div className="flex items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r2Url(form.imageUrl)} alt="preview" className="w-40 aspect-video object-cover rounded-lg border border-gray-200 shrink-0" />
            <div className="flex gap-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">Đổi ảnh</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, imageUrl: "" })); }} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Xóa</button>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500 font-medium">Nhấn để chọn ảnh hoặc kéo thả</p>
                <p className="text-[10px] text-gray-400">Tỷ lệ 16:9 khổ ngang · JPEG · PNG · WebP · GIF · Tối đa 5MB</p>
                <p className="text-[10px] text-amber-500 font-medium">Ví dụ: 1920×1080, 1280×720</p>
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
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Mô tả sản phẩm <span className="text-red-500">*</span>
      </label>
      <textarea value={form.description} onChange={set("description")} rows={3} maxLength={5000}
        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-none transition-colors resize-none ${
          form.description && descWordCount() < 20
            ? "border-amber-300 focus:border-amber-400"
            : "border-gray-200 focus:border-[#e11d48]/60"
        }`}
        placeholder="Mô tả chi tiết về sản phẩm (ít nhất 20 từ)..." />
      <div className="flex items-center justify-between mt-1">
        {form.description ? (
          descWordCount() < 20 ? (
            <p className="text-[10px] text-amber-500">Cần thêm {20 - descWordCount()} từ nữa</p>
          ) : (
            <p className="text-[10px] text-emerald-500">✓ Đủ mô tả</p>
          )
        ) : (
          <p className="text-[10px] text-gray-400">Tối thiểu 20 từ</p>
        )}
        <p className="text-[10px] text-gray-400">{descWordCount()} / 20 từ</p>
      </div>
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-3 pt-1">
      <button type="submit" disabled={loading || uploading || (mode === "create" && !originValid)}
        className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-[#0052cc] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
        {loading ? "Đang lưu..." : mode === "create" ? "Tạo sản phẩm" : "Lưu thay đổi"}
      </button>
      <button type="button" onClick={() => router.back()}
        className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 hover:text-gray-700 transition-colors">
        Hủy
      </button>
    </div>
  );

  // ── Nguồn gốc sản phẩm (create mode) ───────────────────────────────────────
  const originSection = (
    <div className="pt-4 border-t border-gray-100 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          🔒 Nguồn gốc sản phẩm <span className="text-red-500">*</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Bắt buộc khai báo trước khi đăng bán — phục vụ kiểm duyệt, truy xuất nguồn gốc & xử lý khiếu nại.
        </p>
      </div>

      {/* 1. Loại nguồn gốc */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Loại nguồn gốc <span className="text-red-500">*</span>
        </label>
        <select
          value={originType}
          onChange={(e) => setOriginType(e.target.value)}
          onBlur={() => setOriginTouched((t) => ({ ...t, type: true }))}
          className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none transition-colors ${
            originTouched.type && !originType ? "border-red-400" : "border-gray-200 focus:border-[#e11d48]/60"
          }`}
        >
          <option value="">-- Chọn loại nguồn gốc --</option>
          {ORIGIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {originTouched.type && !originType && (
          <p className="text-[10px] text-red-500 mt-1">Vui lòng chọn loại nguồn gốc.</p>
        )}
      </div>

      {/* 2. Mô tả nguồn gốc */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Mô tả nguồn gốc <span className="text-red-500">*</span>
        </label>
        <textarea
          value={originDescription}
          onChange={(e) => setOriginDescription(e.target.value)}
          onBlur={() => setOriginTouched((t) => ({ ...t, desc: true }))}
          rows={3}
          maxLength={ORIGIN_DESC_MAX}
          placeholder="Nhập chi tiết nguồn gốc sản phẩm, thời gian tạo/thu mua, hình thức sở hữu và các thông tin liên quan."
          className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none transition-colors resize-none ${
            originTouched.desc && originDescLen < ORIGIN_DESC_MIN ? "border-red-400" : "border-gray-200 focus:border-[#e11d48]/60"
          }`}
        />
        <div className="flex items-center justify-between mt-1">
          {originTouched.desc && originDescLen < ORIGIN_DESC_MIN ? (
            <p className="text-[10px] text-red-500">
              Cần tối thiểu {ORIGIN_DESC_MIN} ký tự (còn thiếu {ORIGIN_DESC_MIN - originDescLen}).
            </p>
          ) : (
            <p className="text-[10px] text-gray-400">Tối thiểu {ORIGIN_DESC_MIN} · tối đa {ORIGIN_DESC_MAX} ký tự</p>
          )}
          <p className="text-[10px] text-gray-400">{originDescLen} / {ORIGIN_DESC_MAX}</p>
        </div>
      </div>

      {/* 3. Cam kết */}
      <div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={originCommitment}
            onChange={(e) => { setOriginCommitment(e.target.checked); setOriginTouched((t) => ({ ...t, commit: true })); }}
            className="h-4 w-4 rounded border-gray-300 text-[#e11d48] shrink-0 mt-0.5"
          />
          <span className="text-[11px] text-gray-600 leading-relaxed">
            Tôi cam kết sản phẩm được tạo lập hoặc sở hữu hợp pháp, không có nguồn gốc từ hành vi chiếm đoạt, hack, lừa đảo, đánh cắp hoặc bất kỳ hành vi vi phạm pháp luật nào. Tôi chịu hoàn toàn trách nhiệm trước Hệ thống MMO và pháp luật về tính trung thực của thông tin đã khai báo. <span className="text-red-500">*</span>
          </span>
        </label>
        {originTouched.commit && !originCommitment && (
          <p className="text-[10px] text-red-500 mt-1">Bạn phải tích cam kết để tiếp tục.</p>
        )}
      </div>
    </div>
  );

  // ── Stock section (create mode) ────────────────────────────────────────────
  const manualLineCount = stockText.split("\n").filter((l) => l.trim()).length;

  const stockSection = (
    <div className="p-6 space-y-4 flex flex-col">
      {/* ── Ảnh sản phẩm ── */}
      <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Kho hàng</p>
      {imageUpload}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Kho hàng *</p>
        <p className="text-[11px] text-gray-400">
          Thêm kho từ file TXT hoặc nhập tay. Hệ thống tự loại bỏ dòng trùng trong file.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => { setStockTab("file"); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            stockTab === "file"
              ? "bg-white text-[#e11d48] shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <FileText size={12} /> Upload TXT
        </button>
        <button
          type="button"
          onClick={() => { setStockTab("manual"); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            stockTab === "manual"
              ? "bg-white text-[#e11d48] shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          ✏️ Nhập tay
        </button>
      </div>

      {/* ── File tab ── */}
      {stockTab === "file" && (
        <div className="space-y-3 flex-1">
          <p className="text-[11px] text-gray-400">
            Mỗi dòng = 1 item · Tối đa {MAX_STOCK_ITEMS.toLocaleString("vi-VN")} dòng · UTF-8 · Max {MAX_FILE_SIZE_MB}MB
          </p>

          {fileError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{fileError}</p>
            </div>
          )}

          {fileItems.length > 0 ? (
            <div className="space-y-2">
              {/* File preview card */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <FileText size={14} className="text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{fileName}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {fileItems.length.toLocaleString("vi-VN")} items sẽ thêm vào kho
                  </p>
                </div>
                <button type="button" onClick={clearFile} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={13} />
                </button>
              </div>

              {/* Duplicate warning */}
              {fileDupCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle size={13} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Đã tự loại bỏ <strong>{fileDupCount}</strong> dòng trùng lặp trong file.
                  </p>
                </div>
              )}

              {/* Replace file button */}
              <div>
                <input ref={txtInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleTxtSelect} />
                <button type="button" onClick={() => txtInputRef.current?.click()} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                  Chọn file khác
                </button>
              </div>
            </div>
          ) : (
            <>
              <input ref={txtInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleTxtSelect} />
              <button
                type="button"
                onClick={() => txtInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#e11d48]/30 bg-gray-50 py-8 hover:border-[#e11d48]/60 hover:bg-red-50/20 transition-colors"
              >
                <Upload size={22} className="text-[#e11d48]/40" />
                <p className="text-xs text-gray-600 font-medium">Click để chọn file .txt</p>
                <p className="text-[10px] text-gray-400">Mỗi dòng = 1 item · tự động loại bỏ trùng</p>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Manual tab ── */}
      {stockTab === "manual" && (
        <div className="space-y-2 flex-1 flex flex-col">
          <textarea
            value={stockText}
            onChange={(e) => setStockText(e.target.value)}
            rows={12}
            placeholder={"user1@gmail.com:pass123\nuser2@gmail.com:pass456\n..."}
            className="flex-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 font-mono placeholder:text-gray-400 focus:border-[#e11d48]/60 focus:outline-none resize-none"
          />
          <p className="text-[11px] text-gray-400">
            {manualLineCount.toLocaleString("vi-VN")} items · Dòng trùng sẽ tự bị loại trước khi lưu
          </p>
        </div>
      )}

      {originSection}

      {checkboxes}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {actionButtons}
    </div>
  );

  // ── Post-create: show VariantManager inline ───────────────────────────────
  if (mode === "create" && createdProductId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Sản phẩm đã được tạo thành công!</p>
            <p className="text-xs text-primary mt-0.5">Thêm gói sản phẩm (ví dụ: Gói 1 tháng, Gói 3 tháng...) để khách hàng có thêm lựa chọn.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <VariantManager productId={createdProductId} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <ProductGalleryManager
            productId={createdProductId}
            apiBase="/api/seller/products"
            uploadUrl="/api/storage/upload"
            uploadResponseKey="publicUrl"
            uploadPurpose="product-image"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/san-pham")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Bỏ qua, thêm sau <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

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
                {categorySelector}
                {descField}
                {warrantyInfoField}
              </div>

              {/* CREATE — phải: ảnh + kho hàng */}
              {stockSection}
            </>
          ) : (
            <>
              {/* EDIT — trái: tên + giá + trạng thái */}
              <div className="p-6 space-y-5">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Thông tin cơ bản</p>
                {nameField}
                {priceField}
                {categorySelector}
                {checkboxes}
              </div>

              {/* EDIT — phải: ảnh + giới thiệu + mô tả + buttons */}
              <div className="p-6 space-y-5">
                <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Hình ảnh & Mô tả</p>
                {imageUpload}
                {initialData?.id && !isRestricted && (
                  <div className="pt-4 border-t border-gray-100">
                    <ProductGalleryManager
                      productId={initialData.id}
                      apiBase="/api/seller/products"
                      uploadUrl="/api/storage/upload"
                      uploadResponseKey="publicUrl"
                      uploadPurpose="product-image"
                    />
                  </div>
                )}
                {warrantyInfoField}
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
