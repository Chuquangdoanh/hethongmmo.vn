"use client";

import { useState, useEffect, useCallback } from "react";
import { KhuongfbProductTable } from "./_components/KhuongfbProductTable";
import ProviderManager from "./_components/ProviderManager";
import Pagination from "@/components/shared/Pagination";

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
  provider:         string;
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
  stockOverride:    number | null;
}

interface Meta {
  total:      number;
  page:       number;
  totalPages: number;
}

interface ProviderTab {
  id:   string;
  name: string;
}

type SyncProviderResult = { created: number; updated: number; deactivated: number; total: number; durationMs: number } | { error: string };

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function KhuongfbAdminPage() {
  const [products,        setProducts]        = useState<KhuongfbProduct[]>([]);
  const [categories,      setCategories]      = useState<ResourceCategoryWithSubs[]>([]);
  const [providerTabs,    setProviderTabs]    = useState<ProviderTab[]>([]);
  const [meta,            setMeta]            = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [syncing,         setSyncing]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [syncMsg,         setSyncMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [page,            setPage]            = useState(1);
  const [section,         setSection]         = useState<string>("");
  const [activeProvider,  setActiveProvider]  = useState<string>("");
  const [kfbCategory,     setKfbCategory]     = useState<string>("");
  const [kfbCategories,   setKfbCategories]   = useState<string[]>([]);
  const [statusFilter,    setStatusFilter]    = useState<string>("");

  const fetchProducts = useCallback(async (p: number, sec: string, provId: string, kfbCat: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (sec)    params.set("section",     sec);
      if (provId) params.set("provider",    provId);
      if (kfbCat) params.set("kfbCategory", kfbCat);
      if (status) params.set("enabled",     status);
      const res  = await fetch(`/api/admin/khuongfb/products?${params.toString()}`);
      const json = await res.json() as { data?: KhuongfbProduct[]; meta?: Meta };

      // Sản phẩm còn hàng (stockAmount > 0) lên đầu, giữ thứ tự gốc cho phần còn lại
      const raw = json.data ?? [];
      const sorted = [...raw].sort((a, b) => {
        const aInStock = (a.stockAmount ?? 0) > 0 ? 1 : 0;
        const bInStock = (b.stockAmount ?? 0) > 0 ? 1 : 0;
        return bInStock - aInStock;
      });

      setProducts(sorted);
      if (json.meta) setMeta(json.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKfbCategories = useCallback(async (provId: string) => {
    const params = new URLSearchParams({ categoriesOnly: "1" });
    if (provId) params.set("provider", provId);
    const res  = await fetch(`/api/admin/khuongfb/products?${params.toString()}`);
    const json = await res.json() as { data?: string[] };
    setKfbCategories(json.data ?? []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res  = await fetch("/api/admin/resource-categories?withSubs=true");
    const json = await res.json() as { data?: ResourceCategoryWithSubs[] };
    setCategories(json.data ?? []);
  }, []);

  const fetchProviders = useCallback(async () => {
    const res  = await fetch("/api/admin/khuongfb/providers", { credentials: "include" });
    const json = await res.json() as { data?: Array<{ id: string; name: string }> };
    setProviderTabs(json.data ?? []);
  }, []);

  useEffect(() => {
    void fetchProviders();
    void fetchCategories();
  }, [fetchProviders, fetchCategories]);

  // Danh mục KFB phụ thuộc provider đang chọn — provider đổi thì load lại danh sách danh mục riêng của provider đó
  useEffect(() => {
    void fetchKfbCategories(activeProvider);
  }, [activeProvider, fetchKfbCategories]);

  useEffect(() => {
    void fetchProducts(page, section, activeProvider, kfbCategory, statusFilter);
  }, [page, section, activeProvider, kfbCategory, statusFilter, fetchProducts]);

  function handleSectionChange(val: string) {
    setSection(val);
    setPage(1);
  }

  function handleProviderChange(val: string) {
    setActiveProvider(val);
    setKfbCategory(""); // reset danh mục KFB vì danh mục con chỉ thuộc riêng provider đang chọn
    setPage(1);
  }

  function handleKfbCategoryChange(val: string) {
    setKfbCategory(val);
    setPage(1);
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/khuongfb/sync", { method: "POST" });
      const json = await res.json() as { data?: { results: Record<string, SyncProviderResult> }; error?: string };
      if (!res.ok) {
        setSyncMsg({ type: "err", text: `Lỗi: ${json.error ?? `HTTP ${res.status}`}` });
        return;
      }

      const results = json.data?.results ?? {};
      const lines: string[] = [];
      let hasError = false;

      for (const [provId, r] of Object.entries(results)) {
        const label = providerTabs.find(t => t.id === provId)?.name ?? provId;
        if ("error" in r) {
          lines.push(`${label}: ❌ ${r.error}`);
          hasError = true;
        } else {
          const deactivatedNote = r.deactivated > 0 ? `, tắt: ${r.deactivated}` : "";
          lines.push(`${label}: ✓ ${r.total} sp (mới: ${r.created}, cập nhật: ${r.updated}${deactivatedNote}) — ${formatDuration(r.durationMs)}`);
        }
      }

      setSyncMsg({ type: hasError ? "err" : "ok", text: lines.join(" | ") });
      await fetchProducts(1, section, activeProvider, kfbCategory, statusFilter);
      setPage(1);
    } catch {
      setSyncMsg({ type: "err", text: "Đồng bộ thất bại — không kết nối được server" });
    } finally {
      setSyncing(false);
    }
  }

  const enabledCount = products.filter((p) => p.isEnabled).length;

  const SECTION_TABS = [
    { value: "",               label: "Tất cả store" },
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
        <div className="flex items-center gap-3">
          {/* Toggle chỉ hiện sản phẩm đang bán */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            Chỉ đang bán
            <button
              type="button"
              onClick={() => handleStatusChange(statusFilter === "1" ? "" : "1")}
              className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${statusFilter === "1" ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${statusFilter === "1" ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </button>
          </label>

          <ProviderManager onProvidersChanged={() => { void fetchProviders(); void fetchProducts(1, section, activeProvider, kfbCategory, statusFilter); }} />
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

      {/* Provider tabs — 1 tab/provider */}
      {providerTabs.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-1">Provider:</span>
          {[{ id: "", name: "Tất cả" }, ...providerTabs].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleProviderChange(tab.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeProvider === tab.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Section filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-1">Kênh:</span>
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

      {/* KFB category filter */}
      {kfbCategories.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Danh mục KFB:</span>
          <select
            value={kfbCategory}
            onChange={(e) => handleKfbCategoryChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-amber-400 min-w-50"
          >
            <option value="">— Tất cả danh mục —</option>
            {kfbCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {kfbCategory && (
            <button
              onClick={() => handleKfbCategoryChange("")}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Xóa lọc
            </button>
          )}
        </div>
      )}

      {/* Bảng sản phẩm — chỉ unmount khi load lần đầu (products rỗng), còn refresh giữ nguyên để không mất expandedId */}
      {loading && products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : (
        <KhuongfbProductTable
          products={products}
          categories={categories}
          onRefresh={() => void fetchProducts(page, section, activeProvider, kfbCategory, statusFilter)}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
