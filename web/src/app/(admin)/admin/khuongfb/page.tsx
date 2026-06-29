"use client";

import { useState, useEffect, useCallback } from "react";
import { KhuongfbProductTable } from "./_components/KhuongfbProductTable";
import ApiConfigDropdown from "./_components/ApiConfigDropdown";

interface SubCategory {
  id:                string;
  name:              string;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
}

export interface ResourceCategoryWithSubs {
  id:                string;
  name:              string;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
  subCategories?:    SubCategory[];
}

export interface KhuongfbProduct {
  id:               string;
  externalId:       string;
  externalCategory: string;
  name:             string;
  description:      string | null;
  originalPrice:    string | number;
  salePrice:        string | number;
  isEnabled:        boolean;
  warrantyInfo:     string | null;
  displaySection:   string;
  thumbnail:        string | null;
  resourceCategory: { id: string; name: string } | null;
  subCategory:      { id: string; name: string } | null;
  syncedAt:         string | null;
  stockAmount:      number | null;
}

interface Meta {
  total:      number;
  page:       number;
  totalPages: number;
}

export default function KhuongfbAdminPage() {
  const [products,   setProducts]   = useState<KhuongfbProduct[]>([]);
  const [categories, setCategories] = useState<ResourceCategoryWithSubs[]>([]);
  const [meta,       setMeta]       = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [syncing,    setSyncing]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [syncMsg,    setSyncMsg]    = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [page,       setPage]       = useState(1);
  const [section,    setSection]    = useState<string>("");

  const fetchProducts = useCallback(async (p: number, sec: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (sec) params.set("section", sec);
      const res  = await fetch(`/api/admin/khuongfb/products?${params.toString()}`);
      const json = await res.json() as { data?: KhuongfbProduct[]; meta?: Meta };
      setProducts(json.data ?? []);
      if (json.meta) setMeta(json.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const res  = await fetch("/api/admin/resource-categories?withSubs=true");
    const json = await res.json() as { data?: ResourceCategoryWithSubs[] };
    setCategories(json.data ?? []);
  }, []);

  useEffect(() => {
    void fetchProducts(page, section);
    void fetchCategories();
  }, [page, section, fetchProducts, fetchCategories]);

  function handleSectionChange(val: string) {
    setSection(val);
    setPage(1);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/khuongfb/sync", { method: "POST" });
      const json = await res.json() as { data?: { created: number; updated: number; deactivated: number; total: number }; error?: string };
      if (!res.ok) {
        setSyncMsg({ type: "err", text: `Lỗi: ${json.error ?? `HTTP ${res.status}`}` });
        return;
      }
      const d = json.data;
      if (d) {
        const deactivatedNote = d.deactivated > 0 ? `, tắt: ${d.deactivated}` : "";
        setSyncMsg({ type: "ok", text: `Đồng bộ xong: ${d.total} sản phẩm (mới: ${d.created}, cập nhật: ${d.updated}${deactivatedNote})` });
        await fetchProducts(1, section);
        setPage(1);
      }
    } catch {
      setSyncMsg({ type: "err", text: "Đồng bộ thất bại — không kết nối được server" });
    } finally {
      setSyncing(false);
    }
  }

  const enabledCount = products.filter((p) => p.isEnabled).length;

  const SECTION_TABS = [
    { value: "",               label: "Tất cả" },
    { value: "TAI_NGUYEN_MMO", label: "Nguyên liệu MMO" },
    { value: "KHO_TAI_NGUYEN", label: "Kho tài nguyên" },
  ];

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm tài nguyên </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng: {meta.total} sản phẩm · Đang hiển thị: {enabledCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ApiConfigDropdown />
          <button
            onClick={() => void handleSync()}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
          >
            {syncing ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Đang đồng bộ...
              </>
            ) : (
              "↺ Đồng bộ ngay"
            )}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          syncMsg.type === "ok"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {syncMsg.text}
        </div>
      )}

      {/* Section filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleSectionChange(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              section === tab.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bảng sản phẩm */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : (
        <KhuongfbProductTable
          products={products}
          categories={categories}
          onRefresh={() => void fetchProducts(page, section)}
        />
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded border text-sm ${
                p === page ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:border-blue-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
