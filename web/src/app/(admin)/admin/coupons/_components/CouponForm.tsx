"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

type ProductType = "SELLER_PRODUCT" | "MMO_PRODUCT" | "KHUONGFB_PRODUCT";
type ScopeMode = "system" | "seller";
type MmoSection = "KHO_TAI_NGUYEN" | "TAI_NGUYEN_MMO";
type SystemTabKey = "KHO_TAI_NGUYEN" | "TAI_NGUYEN_MMO" | "KHUONGFB_PRODUCT";

// "Hệ thống" — sản phẩm do hệ thống quản lý trực tiếp (không thuộc 1 seller cụ thể).
// Kho tài nguyên & Tài nguyên MMO cùng là bảng mmo_products, chỉ khác field `section`.
const SYSTEM_TABS: { key: SystemTabKey; label: string; productType: ProductType; section?: MmoSection }[] = [
  { key: "KHO_TAI_NGUYEN", label: "Kho tài nguyên", productType: "MMO_PRODUCT", section: "KHO_TAI_NGUYEN" },
  { key: "TAI_NGUYEN_MMO", label: "Tài nguyên MMO", productType: "MMO_PRODUCT", section: "TAI_NGUYEN_MMO" },
  { key: "KHUONGFB_PRODUCT", label: "Khương FB", productType: "KHUONGFB_PRODUCT" },
];

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  SELLER_PRODUCT: "Seller",
  MMO_PRODUCT: "Tài nguyên MMO",
  KHUONGFB_PRODUCT: "Khương FB",
};

interface ProductRef {
  productType: ProductType;
  productId: string;
  productName?: string;
  sellerName?: string;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

interface SellerOption {
  id: string;
  fullName: string;
  email: string;
  productCount: number;
}

export interface CouponFormData {
  id?: string;
  code?: string;
  name?: string;
  discountType?: "PERCENT" | "FIXED_AMOUNT";
  discountValue?: number;
  maxUses?: number;
  minOrderValue?: number | null;
  minTierLabel?: string | null;
  newUserOnly?: boolean;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
  products?: { productType: string; productId: string; productName?: string; sellerName?: string }[];
}

function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponForm({ initial }: { initial?: CouponFormData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    discountType: initial?.discountType ?? ("PERCENT" as "PERCENT" | "FIXED_AMOUNT"),
    discountValue: initial?.discountValue?.toString() ?? "",
    maxUses: initial?.maxUses?.toString() ?? "",
    minOrderValue: initial?.minOrderValue?.toString() ?? "",
    minTierLabel: initial?.minTierLabel ?? "",
    newUserOnly: initial?.newUserOnly ?? false,
    startAt: toDatetimeLocal(initial?.startAt),
    endAt: toDatetimeLocal(initial?.endAt),
    isActive: initial?.isActive ?? true,
  });

  const [products, setProducts] = useState<ProductRef[]>(
    (initial?.products ?? []).map((p) => ({
      productType: p.productType as ProductType,
      productId: p.productId,
      productName: p.productName,
      sellerName: p.sellerName,
    })),
  );

  const [scopeMode, setScopeMode] = useState<ScopeMode>("system");
  const [systemTab, setSystemTab] = useState<SystemTabKey>("KHO_TAI_NGUYEN");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(null);
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [sellerSearchLoading, setSellerSearchLoading] = useState(false);
  const [allSellersMode, setAllSellersMode] = useState(false);
  const [allSellersLoading, setAllSellersLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSystemTab = SYSTEM_TABS.find((t) => t.key === systemTab)!;
  const activeType: ProductType = scopeMode === "seller" ? "SELLER_PRODUCT" : activeSystemTab.productType;

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const searchProducts = useCallback(async () => {
    if (scopeMode === "seller" && (!selectedSeller || allSellersMode)) {
      setOptions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const qs = new URLSearchParams({
        productType: activeType,
        ...(search ? { q: search } : {}),
        ...(scopeMode === "seller" && selectedSeller ? { sellerId: selectedSeller.id } : {}),
        ...(scopeMode === "system" && activeSystemTab.section ? { section: activeSystemTab.section } : {}),
      });
      const res = await fetch(`/api/admin/coupons/product-options?${qs.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { data?: ProductOption[] };
      setOptions(json.data ?? []);
    } finally {
      setSearchLoading(false);
    }
  }, [activeType, search, scopeMode, selectedSeller, allSellersMode, activeSystemTab.section]);

  useEffect(() => {
    void searchProducts();
  }, [searchProducts]);

  const searchSellers = useCallback(async () => {
    setSellerSearchLoading(true);
    try {
      const qs = new URLSearchParams(sellerSearch ? { q: sellerSearch } : {});
      const res = await fetch(`/api/admin/coupons/sellers?${qs.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { data?: SellerOption[] };
      setSellerOptions(json.data ?? []);
    } finally {
      setSellerSearchLoading(false);
    }
  }, [sellerSearch]);

  useEffect(() => {
    if (scopeMode === "seller" && !selectedSeller) void searchSellers();
  }, [scopeMode, selectedSeller, searchSellers]);

  function addProduct(opt: ProductOption) {
    setProducts((prev) => {
      if (prev.some((p) => p.productType === activeType && p.productId === opt.id)) return prev;
      return [...prev, { productType: activeType, productId: opt.id, productName: opt.name, sellerName: selectedSeller?.fullName }];
    });
  }

  function removeProduct(productType: ProductType, productId: string) {
    setProducts((prev) => prev.filter((p) => !(p.productType === productType && p.productId === productId)));
  }

  const allVisibleSelected =
    options.length > 0 && options.every((o) => products.some((p) => p.productType === activeType && p.productId === o.id));

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(options.map((o) => o.id));
      setProducts((prev) => prev.filter((p) => !(p.productType === activeType && visibleIds.has(p.productId))));
      return;
    }
    setProducts((prev) => {
      const next = [...prev];
      for (const opt of options) {
        if (!next.some((p) => p.productType === activeType && p.productId === opt.id)) {
          next.push({ productType: activeType, productId: opt.id, productName: opt.name, sellerName: selectedSeller?.fullName });
        }
      }
      return next;
    });
  }

  async function toggleAllSellers() {
    if (allSellersMode) {
      setProducts((prev) => prev.filter((p) => p.productType !== "SELLER_PRODUCT"));
      setAllSellersMode(false);
      return;
    }
    setAllSellersLoading(true);
    try {
      const res = await fetch("/api/admin/coupons/product-options?productType=SELLER_PRODUCT", { credentials: "include" });
      const json = (await res.json()) as { data?: ProductOption[] };
      const all = json.data ?? [];
      setProducts((prev) => {
        const next = prev.filter((p) => p.productType !== "SELLER_PRODUCT");
        for (const opt of all) next.push({ productType: "SELLER_PRODUCT", productId: opt.id, productName: opt.name });
        return next;
      });
      setSelectedSeller(null);
      setAllSellersMode(true);
    } finally {
      setAllSellersLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!form.code.trim() || !form.name.trim()) {
      setError("Vui lòng nhập đủ mã và tên chương trình");
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError("Vui lòng chọn thời gian bắt đầu/kết thúc");
      return;
    }
    if (products.length === 0) {
      setError("Chọn ít nhất 1 sản phẩm áp dụng");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: Number(form.maxUses),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : isEdit ? null : undefined,
        minTierLabel: form.minTierLabel || (isEdit ? null : undefined),
        newUserOnly: form.newUserOnly,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        isActive: form.isActive,
        products: products.map((p) => ({ productType: p.productType, productId: p.productId })),
      };

      const res = await fetch(isEdit ? `/api/admin/coupons/${initial!.id}` : "/api/admin/coupons", {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Lưu thất bại, vui lòng thử lại.");
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mã coupon</label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            disabled={isEdit}
            placeholder="VD: SALE50"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tên chương trình</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="VD: Giảm giá khai trương"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* ── 2 cột: trái = thông tin coupon, phải = sản phẩm áp dụng ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Kiểu giảm</label>
              <select
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED_AMOUNT">Số tiền cố định (đ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Giá trị giảm {form.discountType === "PERCENT" ? "(%)" : "(đ)"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số lượng mã</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
                placeholder="VD: 100"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bắt đầu</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Kết thúc</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Đơn tối thiểu (đ, để trống = không giới hạn)</label>
              <input
                type="number"
                value={form.minOrderValue}
                onChange={(e) => set("minOrderValue", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hạng tối thiểu (để trống = không giới hạn)</label>
              <select
                value={form.minTierLabel}
                onChange={(e) => set("minTierLabel", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Không giới hạn</option>
                <option value="Thẻ">Thẻ (≥15tr nạp)</option>
                <option value="Silver">Silver (≥50tr nạp)</option>
                <option value="Gold">Gold (≥100tr nạp)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.newUserOnly} onChange={(e) => set("newUserOnly", e.target.checked)} />
              Chỉ áp dụng cho khách hàng mới (chưa từng mua)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Kích hoạt
            </label>
          </div>
        </div>

        {/* ── Product scope ── */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Sản phẩm áp dụng</p>

          {/* Cấp 1: Hệ thống vs Seller */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScopeMode("system")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                scopeMode === "system" ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Hệ thống
            </button>
            <button
              type="button"
              onClick={() => setScopeMode("seller")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                scopeMode === "seller" ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Seller
            </button>
          </div>

          {scopeMode === "system" ? (
            <>
              {/* Cấp 2: Kho tài nguyên / Tài nguyên MMO / Khương FB — sản phẩm hệ thống */}
              <div className="flex gap-2">
                {SYSTEM_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setSystemTab(tab.key); setSearch(""); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      systemTab === tab.key ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo tên..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={allSellersMode} disabled={allSellersLoading} onChange={() => void toggleAllSellers()} />
                {allSellersLoading ? "Đang tải..." : "Áp dụng cho TẤT CẢ sản phẩm của mọi seller"}
              </label>

              {allSellersMode ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Đã áp dụng cho toàn bộ sản phẩm của mọi seller — bỏ tick ở trên để chọn lại theo từng seller.
                </p>
              ) : !selectedSeller ? (
                <>
                  <input
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                    placeholder="Tìm seller theo tên hoặc email..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                    {sellerSearchLoading ? (
                      <p className="text-xs text-gray-400 px-3 py-2">Đang tải...</p>
                    ) : sellerOptions.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2">Không tìm thấy seller</p>
                    ) : (
                      sellerOptions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSeller(s)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-700">
                            {s.fullName} <span className="text-gray-400">— {s.email}</span>
                          </span>
                          <span className="text-gray-400">{s.productCount} sản phẩm</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-[#eff6ff] px-3 py-2">
                    <span className="text-xs font-semibold text-[#1d4ed8]">{selectedSeller.fullName}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedSeller(null); setSearch(""); }}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Đổi seller
                    </button>
                  </div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </>
              )}
            </>
          )}

          {(scopeMode === "system" || (selectedSeller && !allSellersMode)) && (
            <>
              {options.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  Chọn tất cả sản phẩm đang hiển thị ({options.length})
                </label>
              )}

              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                {searchLoading ? (
                  <p className="text-xs text-gray-400 px-3 py-2">Đang tải...</p>
                ) : options.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-2">Không tìm thấy sản phẩm</p>
                ) : (
                  options.map((opt) => {
                    const isSelected = products.some((p) => p.productType === activeType && p.productId === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => (isSelected ? removeProduct(activeType, opt.id) : addProduct(opt))}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                          isSelected ? "bg-[#eff6ff]" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-gray-700">
                          <input type="checkbox" checked={isSelected} readOnly className="pointer-events-none" />
                          {opt.name}
                        </span>
                        <span className="text-gray-400">{formatVnd(opt.price)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {products.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-gray-500">Đã chọn ({products.length})</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {products.map((p) => (
                  <div key={`${p.productType}-${p.productId}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-1.5">
                        [{PRODUCT_TYPE_LABELS[p.productType]}{p.sellerName ? ` · ${p.sellerName}` : ""}]
                      </span>
                      {p.productName ?? p.productId}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.productType, p.productId)}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-[#1d4ed8] text-white text-sm font-semibold hover:bg-[#1e40af] disabled:opacity-60 transition-colors"
        >
          {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mã giảm giá"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
