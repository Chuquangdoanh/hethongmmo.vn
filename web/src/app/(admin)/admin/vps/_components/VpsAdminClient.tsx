"use client";

import { useState, useEffect, useCallback } from "react";
import { KhuongfbProductTable } from "../../khuongfb/_components/KhuongfbProductTable";
import ProviderManager from "../../khuongfb/_components/ProviderManager";
import Pagination from "@/components/shared/Pagination";
import type { KhuongfbProduct, ResourceCategoryWithSubs } from "../../khuongfb/page";

interface Meta {
  total:      number;
  page:       number;
  totalPages: number;
}

type SyncProviderResult = { created: number; updated: number; deactivated: number; total: number; durationMs: number } | { error: string };

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

interface Props {
  providerId:   string | null;
  providerName: string | null;
  categories:   ResourceCategoryWithSubs[];
}

export default function VpsAdminClient({ providerId: initialProviderId, providerName, categories }: Props) {
  const [providerId,  setProviderId]  = useState(initialProviderId);
  const [products,    setProducts]    = useState<KhuongfbProduct[]>([]);
  const [meta,        setMeta]        = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [syncing,     setSyncing]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [syncMsg,     setSyncMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [page,        setPage]        = useState(1);
  const [section,     setSection]     = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [groups,      setGroups]      = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchProducts = useCallback(async (p: number, sec: string, provId: string | null, group: string, status: string) => {
    if (!provId) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50", provider: provId });
      if (sec)    params.set("section",     sec);
      if (group)  params.set("kfbCategory", group);
      if (status) params.set("enabled",     status);
      const res  = await fetch(`/api/admin/khuongfb/products?${params.toString()}`);
      const json = await res.json() as { data?: KhuongfbProduct[]; meta?: Meta };
      setProducts(json.data ?? []);
      if (json.meta) setMeta(json.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    const res  = await fetch("/api/admin/khuongfb/products?categoriesOnly=1");
    const json = await res.json() as { data?: string[] };
    setGroups(json.data ?? []);
  }, []);

  const refreshProviderId = useCallback(async () => {
    const res  = await fetch("/api/admin/khuongfb/providers", { credentials: "include" });
    const json = await res.json() as { data?: Array<{ id: string; providerType?: string }> };
    const vncloud = (json.data ?? []).find(p => (p.providerType ?? "khuongfb") === "vncloud");
    setProviderId(vncloud?.id ?? null);
  }, []);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    void fetchProducts(page, section, providerId, groupFilter, statusFilter);
  }, [page, section, providerId, groupFilter, statusFilter, fetchProducts]);

  function handleSectionChange(val: string) {
    setSection(val);
    setPage(1);
  }

  function handleGroupChange(val: string) {
    setGroupFilter(val);
    setPage(1);
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  async function handleSync() {
    if (!providerId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/khuongfb/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ providerId }),
      });
      const json = await res.json() as { data?: { results: Record<string, SyncProviderResult> }; error?: string };
      if (!res.ok) {
        setSyncMsg({ type: "err", text: `Lỗi: ${json.error ?? `HTTP ${res.status}`}` });
        return;
      }

      const r = json.data?.results[providerId];
      if (r && "error" in r) {
        setSyncMsg({ type: "err", text: `❌ ${r.error}` });
      } else if (r) {
        const deactivatedNote = r.deactivated > 0 ? `, tắt: ${r.deactivated}` : "";
        setSyncMsg({ type: "ok", text: `✓ ${r.total} sp (mới: ${r.created}, cập nhật: ${r.updated}${deactivatedNote}) — ${formatDuration(r.durationMs)}` });
      }

      await fetchProducts(1, section, providerId, groupFilter, statusFilter);
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
    <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VPS — VNCloud{providerName ? ` (${providerName})` : ""}</h1>
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

          <ProviderManager
            filterType="vncloud"
            defaultAddType="vncloud"
            onProvidersChanged={() => { void refreshProviderId(); void fetchProducts(1, section, providerId, groupFilter, statusFilter); }}
          />
          <button
            onClick={() => void handleSync()}
            disabled={syncing || !providerId}
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

      {!providerId && (
        <div className="px-4 py-3 rounded-lg text-sm border bg-amber-50 border-amber-200 text-amber-800">
          Chưa cấu hình provider VNCloud — bấm ⚙️ &ldquo;Quản lý API Providers&rdquo; để thêm (API Username/App/Secret).
        </div>
      )}

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

      {/* Nhóm sản phẩm (group_product_name từ VNCloud) */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nhóm sản phẩm:</span>
          <select
            value={groupFilter}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-amber-400 min-w-50"
          >
            <option value="">— Tất cả nhóm —</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {groupFilter && (
            <button
              onClick={() => handleGroupChange("")}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Xóa lọc
            </button>
          )}
        </div>
      )}

      {loading && products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : (
        <KhuongfbProductTable
          products={products}
          categories={categories}
          onRefresh={() => void fetchProducts(page, section, providerId, groupFilter, statusFilter)}
        />
      )}

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
