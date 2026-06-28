"use client";

import { useState, useRef, Fragment } from "react";
import type { KhuongfbProduct, ResourceCategoryWithSubs } from "../page";
import { Image as ImageIcon, X, Upload, ExternalLink, ChevronDown, ChevronUp, Save } from "lucide-react";

const SECTION_OPTIONS = [
  { value: "TAI_NGUYEN_MMO", label: "Nguyên liệu MMO" },
  { value: "KHO_TAI_NGUYEN", label: "Kho tài nguyên" },
] as const;

interface Props {
  products:   KhuongfbProduct[];
  categories: ResourceCategoryWithSubs[];
  onRefresh:  () => void;
}

type PatchPayload = {
  isEnabled?:          boolean;
  name?:               string;
  description?:        string | null;
  salePrice?:          number;
  resourceCategoryId?: string | null;
  subCategoryId?:      string | null;
  displaySection?:     string;
  thumbnail?:          string | null;
  warrantyInfo?:       string | null;
};

function thumbSrc(thumb: string): string {
  if (thumb.startsWith("http")) return thumb;
  return `${process.env.NEXT_PUBLIC_R2_URL ?? ""}/${thumb}`;
}

export function KhuongfbProductTable({ products, categories, onRefresh }: Props) {
  const [loadingId,   setLoadingId]   = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Per-product edit state
  const [nameMap,     setNameMap]     = useState<Record<string, string>>({});
  const [descMap,     setDescMap]     = useState<Record<string, string>>({});
  const [warrantyMap, setWarrantyMap] = useState<Record<string, string>>({});
  const [salePriceMap, setSalePriceMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [subCatMap,   setSubCatMap]   = useState<Record<string, string>>({});
  const [sectionMap,  setSectionMap]  = useState<Record<string, string>>({});

  // Track which product the file input belongs to
  const activeProductRef = useRef<KhuongfbProduct | null>(null);

  async function patch(id: string, data: PatchPayload) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/khuongfb/products?id=${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        alert(json.error ?? "Lỗi không xác định");
        return;
      }
      onRefresh();
    } finally {
      setLoadingId(null);
    }
  }

  function handleToggle(product: KhuongfbProduct) {
    void patch(product.id, { isEnabled: !product.isEnabled });
  }

  function handleSaveAll(product: KhuongfbProduct) {
    const name        = (nameMap[product.id]     ?? product.name).trim();
    const description = descMap[product.id]      ?? product.description ?? null;
    const warranty    = warrantyMap[product.id]  ?? product.warrantyInfo ?? null;
    const rawPrice    = salePriceMap[product.id];
    const salePrice   = rawPrice !== undefined ? parseFloat(rawPrice) : Number(product.salePrice);
    const catId       = categoryMap[product.id]  ?? product.resourceCategory?.id  ?? null;
    const subCatId    = subCatMap[product.id]    ?? product.subCategory?.id       ?? null;
    const section     = sectionMap[product.id]   ?? product.displaySection;

    if (!name) { alert("Tên sản phẩm không được trống"); return; }
    if (isNaN(salePrice) || salePrice <= 0) { alert("Giá bán phải là số dương"); return; }

    void patch(product.id, {
      name,
      description:        description || null,
      warrantyInfo:       warranty    || null,
      salePrice,
      resourceCategoryId: catId       || null,
      subCategoryId:      subCatId    || null,
      displaySection:     section     || undefined,
    });
  }

  async function handleImageUpload(product: KhuongfbProduct, file: File) {
    setImgUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/admin/upload/thumbnail?type=kfb-thumbnail", {
        method: "POST",
        body:   form,
      });
      const json = await res.json() as { data?: { url: string }; error?: string };
      if (!res.ok || !json.data?.url) {
        alert(json.error ?? "Upload ảnh thất bại");
        return;
      }
      await patch(product.id, { thumbnail: json.data.url });
    } finally {
      setImgUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleRemoveImage(product: KhuongfbProduct) {
    if (!confirm("Xóa ảnh sản phẩm này?")) return;
    void patch(product.id, { thumbnail: null });
  }

  function getCategoriesForSection(productId: string, displaySection: string): ResourceCategoryWithSubs[] {
    const sec = sectionMap[productId] ?? displaySection;
    return categories.filter((c) =>
      sec === "KHO_TAI_NGUYEN" ? c.showInKhoTaiNguyen : c.showInTaiNguyenMmo
    );
  }

  function getSubsForProduct(product: KhuongfbProduct): { id: string; name: string }[] {
    const selectedCatId = categoryMap[product.id] ?? product.resourceCategory?.id ?? "";
    const cat = categories.find((c) => c.id === selectedCatId);
    const sec = sectionMap[product.id] ?? product.displaySection;
    return (cat?.subCategories ?? []).filter((s) =>
      sec === "KHO_TAI_NGUYEN" ? s.showInKhoTaiNguyen : s.showInTaiNguyenMmo
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      {/* Hidden file input shared */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const prod = activeProductRef.current;
          if (file && prod) void handleImageUpload(prod, file);
        }}
      />

      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] border-b border-gray-200">
          <tr>
            <th className="px-3 py-3 text-left w-8" />
            <th className="px-4 py-3 text-left">Sản phẩm</th>
            <th className="px-4 py-3 text-left">Danh mục KFB</th>
            <th className="px-4 py-3 text-right">Giá gốc</th>
            <th className="px-4 py-3 text-right">Giá bán</th>
            <th className="px-4 py-3 text-left">Phân loại</th>
            <th className="px-4 py-3 text-center">Hiển thị</th>
            <th className="px-4 py-3 text-center">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => {
            const isExpanded = expandedId === p.id;
            const subsForProduct = getSubsForProduct(p);

            return (
              <Fragment key={p.id}>
                {/* ── Hàng chính ── */}
                <tr
                  className={`transition-colors ${p.isEnabled ? "bg-white hover:bg-gray-50" : "bg-gray-50 opacity-60"}`}
                >
                  {/* Expand button */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      title="Chỉnh sửa chi tiết"
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isExpanded ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:bg-gray-100"}`}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>

                  {/* Sản phẩm */}
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbSrc(p.thumbnail)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 line-clamp-2 text-sm">{p.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">ID: {p.externalId}</div>
                      </div>
                    </div>
                  </td>

                  {/* Danh mục KFB */}
                  <td className="px-4 py-3 text-xs text-gray-500">{p.externalCategory}</td>

                  {/* Giá gốc */}
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {Number(p.originalPrice).toLocaleString("vi-VN")}đ
                  </td>

                  {/* Giá bán */}
                  <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                    {Number(p.salePrice).toLocaleString("vi-VN")}đ
                  </td>

                  {/* Phân loại */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div className="space-y-0.5">
                      <div>{p.displaySection === "KHO_TAI_NGUYEN" ? "Kho tài nguyên" : "Nguyên liệu MMO"}</div>
                      {p.resourceCategory && <div className="text-gray-400">{p.resourceCategory.name}</div>}
                      {p.subCategory && <div className="text-gray-400">{p.subCategory.name}</div>}
                    </div>
                  </td>

                  {/* Toggle hiển thị */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={loadingId === p.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.isEnabled ? "bg-green-500" : "bg-gray-300"} disabled:opacity-50`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.isEnabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </td>

                  {/* Xem chi tiết */}
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/kfb/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Xem trang chi tiết"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Xem
                    </a>
                  </td>
                </tr>

                {/* ── Panel chỉnh sửa ── */}
                {isExpanded && (
                  <tr key={`${p.id}-edit`} className="bg-indigo-50/60 border-t border-indigo-100">
                    <td colSpan={8} className="px-6 py-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* CỘT 1: ẢNH */}
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ảnh sản phẩm</p>
                          <div className="w-full aspect-square max-w-40 rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden flex items-center justify-center relative group">
                            {p.thumbnail ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={thumbSrc(p.thumbnail)} alt="" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => handleRemoveImage(p)}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={11} />
                                </button>
                              </>
                            ) : (
                              <ImageIcon size={36} className="text-gray-300" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => { activeProductRef.current = p; fileRef.current?.click(); }}
                              disabled={imgUploading}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-60"
                            >
                              <Upload size={13} />
                              {imgUploading ? "Đang upload..." : "Chọn ảnh mới"}
                            </button>
                            {p.thumbnail && (
                              <button
                                onClick={() => handleRemoveImage(p)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                              >
                                <X size={13} />
                                Xóa ảnh
                              </button>
                            )}
                            <p className="text-[10px] text-gray-400">JPEG, PNG, WebP · Tối đa 5 MB</p>
                          </div>
                        </div>

                        {/* CỘT 2: TÊN + MÔ TẢ + BẢO HÀNH */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Tên sản phẩm
                            </label>
                            <input
                              type="text"
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                              value={nameMap[p.id] ?? p.name}
                              onChange={(e) => setNameMap((m) => ({ ...m, [p.id]: e.target.value }))}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Mô tả sản phẩm
                            </label>
                            <textarea
                              rows={4}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
                              placeholder="Mô tả chi tiết sản phẩm..."
                              value={descMap[p.id] ?? p.description ?? ""}
                              onChange={(e) => setDescMap((m) => ({ ...m, [p.id]: e.target.value }))}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Thông tin bảo hành
                            </label>
                            <textarea
                              rows={3}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
                              placeholder="Chính sách bảo hành, đổi trả..."
                              value={warrantyMap[p.id] ?? p.warrantyInfo ?? ""}
                              onChange={(e) => setWarrantyMap((m) => ({ ...m, [p.id]: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* CỘT 3: GIÁ + PHÂN LOẠI + HIỂN THỊ */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Giá gốc (chỉ đọc)
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={`${Number(p.originalPrice).toLocaleString("vi-VN")}đ`}
                              className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2 bg-gray-100 text-gray-400 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Giá bán
                            </label>
                            <input
                              type="number"
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                              value={salePriceMap[p.id] ?? String(Number(p.salePrice))}
                              onChange={(e) => setSalePriceMap((m) => ({ ...m, [p.id]: e.target.value }))}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Phân loại hiển thị
                            </label>
                            <div className="space-y-1.5">
                              <select
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400"
                                value={sectionMap[p.id] ?? p.displaySection}
                                onChange={(e) => setSectionMap((m) => ({ ...m, [p.id]: e.target.value }))}
                              >
                                {SECTION_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <select
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400"
                                value={categoryMap[p.id] ?? p.resourceCategory?.id ?? ""}
                                onChange={(e) => {
                                  setCategoryMap((m) => ({ ...m, [p.id]: e.target.value }));
                                  setSubCatMap((m) => ({ ...m, [p.id]: "" }));
                                }}
                              >
                                <option value="">— Hạng mục —</option>
                                {getCategoriesForSection(p.id, p.displaySection).map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <select
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400"
                                value={subCatMap[p.id] ?? p.subCategory?.id ?? ""}
                                onChange={(e) => setSubCatMap((m) => ({ ...m, [p.id]: e.target.value }))}
                                disabled={subsForProduct.length === 0}
                              >
                                <option value="">— Danh mục con —</option>
                                {subsForProduct.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Hiển thị</p>
                              <button
                                onClick={() => handleToggle(p)}
                                disabled={loadingId === p.id}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.isEnabled ? "bg-green-500" : "bg-gray-300"} disabled:opacity-50`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.isEnabled ? "translate-x-6" : "translate-x-1"}`} />
                              </button>
                              <span className="ml-2 text-xs text-gray-500">{p.isEnabled ? "Đang hiển thị" : "Đã ẩn"}</span>
                            </div>
                          </div>

                          {/* Nút lưu tất cả */}
                          <button
                            onClick={() => handleSaveAll(p)}
                            disabled={loadingId === p.id}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60 transition-colors"
                          >
                            <Save size={15} />
                            {loadingId === p.id ? "Đang lưu..." : "Lưu tất cả thay đổi"}
                          </button>
                        </div>

                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Chưa có sản phẩm nào. Nhấn &quot;Đồng bộ ngay&quot; để lấy từ Khuongfb.
        </div>
      )}
    </div>
  );
}
