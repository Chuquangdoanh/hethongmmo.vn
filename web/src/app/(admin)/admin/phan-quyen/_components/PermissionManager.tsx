"use client";

import { useState, useTransition } from "react";
import { Users, Store, ShieldCheck, Save, Check, X, AlertCircle, Globe, Star, Eye, EyeOff } from "lucide-react";
import type { PageGroup, RolePageGroup } from "@/lib/page-registry";
import type { PublicPageConfigEntry } from "@/lib/services/public-page-config.service";

interface Props {
  registry:             Record<RolePageGroup, PageGroup[]>;
  initialStaff:         Record<string, boolean>;
  initialUser:          Record<string, boolean>;
  initialSeller:        Record<string, boolean>;
  initialPublicConfigs: PublicPageConfigEntry[];
}

type Tab = RolePageGroup | "PUBLIC";

const TAB_CONFIG: { key: Tab; label: string; Icon: typeof Users; color: string; bg: string }[] = [
  { key: "PUBLIC", label: "Trang công khai", Icon: Globe,      color: "#0f9d58", bg: "#d4edda" },
  { key: "STAFF",  label: "Nhân viên",       Icon: ShieldCheck, color: "#7c3aed", bg: "#ede9fe" },
  { key: "USER",   label: "Người dùng",      Icon: Users,       color: "#0066ff", bg: "#dbeafe" },
  { key: "SELLER", label: "Nhà bán hàng",    Icon: Store,       color: "#ec4899", bg: "#fce7f3" },
];

const ROLE_LABELS: Record<RolePageGroup, string> = {
  STAFF:  "nhân viên",
  USER:   "người dùng",
  SELLER: "nhà bán hàng",
};

type PublicState = Record<string, { isVisible: boolean; isFeatured: boolean; customLabel: string }>;

function initPublicState(configs: PublicPageConfigEntry[]): PublicState {
  return Object.fromEntries(
    configs.map((c) => [c.pageKey, {
      isVisible:   c.isVisible,
      isFeatured:  c.isFeatured,
      customLabel: c.customLabel ?? "",
    }])
  );
}

export default function PermissionManager({
  registry, initialStaff, initialUser, initialSeller, initialPublicConfigs,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("PUBLIC");

  // Role-based permission state
  const [perms, setPerms] = useState<Record<RolePageGroup, Record<string, boolean>>>({
    STAFF:  { ...initialStaff },
    USER:   { ...initialUser },
    SELLER: { ...initialSeller },
  });

  // Public page config state
  const [publicState, setPublicState] = useState<PublicState>(initPublicState(initialPublicConfigs));

  const [saveStatus, setSaveStatus] = useState<Record<Tab, "idle" | "success" | "error">>({
    PUBLIC: "idle", STAFF: "idle", USER: "idle", SELLER: "idle",
  });
  const [errorMsg, setErrorMsg] = useState<Record<Tab, string>>({
    PUBLIC: "", STAFF: "", USER: "", SELLER: "",
  });
  const [isPending, startTransition] = useTransition();

  // ── Role tab helpers ──────────────────────────────────────────────────────
  function toggle(pageKey: string) {
    if (activeTab === "PUBLIC") return;
    setPerms((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [pageKey]: !prev[activeTab][pageKey] },
    }));
    resetStatus();
  }

  function toggleGroup(groupKey: string, value: boolean) {
    if (activeTab === "PUBLIC") return;
    const group = registry[activeTab].find((g) => g.key === groupKey);
    if (!group) return;
    const updates = Object.fromEntries(group.pages.map((p) => [p.key, value]));
    setPerms((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...updates } }));
    resetStatus();
  }

  // ── Public tab helpers ────────────────────────────────────────────────────
  function setPublicField<K extends keyof PublicState[string]>(pageKey: string, field: K, value: PublicState[string][K]) {
    setPublicState((prev) => {
      const existing = prev[pageKey] ?? { isVisible: true, isFeatured: false, customLabel: "" };
      return { ...prev, [pageKey]: { ...existing, [field]: value } };
    });
    resetStatus();
  }

  function resetStatus() {
    setSaveStatus((s) => ({ ...s, [activeTab]: "idle" }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    startTransition(async () => {
      try {
        if (activeTab === "PUBLIC") {
          const configs = initialPublicConfigs.map((page) => ({
            pageKey:     page.pageKey,
            isVisible:   publicState[page.pageKey]?.isVisible  ?? true,
            isFeatured:  publicState[page.pageKey]?.isFeatured ?? false,
            customLabel: publicState[page.pageKey]?.customLabel.trim() || null,
          }));
          const res = await fetch("/api/admin/public-page-configs", { credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ configs }),
          });
          if (!res.ok) {
            const json = await res.json() as { error?: string };
            setErrorMsg((e) => ({ ...e, PUBLIC: json.error ?? "Lỗi không xác định" }));
            setSaveStatus((s) => ({ ...s, PUBLIC: "error" }));
            return;
          }
        } else {
          const currentPerms = perms[activeTab];
          const res = await fetch("/api/admin/page-permissions", { credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: activeTab, permissions: currentPerms }),
          });
          if (!res.ok) {
            const json = await res.json() as { error?: string };
            setErrorMsg((e) => ({ ...e, [activeTab]: json.error ?? "Lỗi không xác định" }));
            setSaveStatus((s) => ({ ...s, [activeTab]: "error" }));
            return;
          }
        }
        setSaveStatus((s) => ({ ...s, [activeTab]: "success" }));
        setTimeout(() => setSaveStatus((s) => ({ ...s, [activeTab]: "idle" })), 3000);
      } catch {
        setErrorMsg((e) => ({ ...e, [activeTab]: "Lỗi kết nối" }));
        setSaveStatus((s) => ({ ...s, [activeTab]: "error" }));
      }
    });
  }

  const currentStatus = saveStatus[activeTab];

  // ── Derived counts for role tabs ──────────────────────────────────────────
  const roleCounts = (tab: RolePageGroup) => {
    const vals = Object.values(perms[tab]);
    const enabled = vals.filter(Boolean).length;
    return { enabled, total: vals.length, disabled: vals.length - enabled };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label, Icon, color, bg }) => {
          const active = activeTab === key;
          const disabled = key !== "PUBLIC" ? roleCounts(key as RolePageGroup).disabled : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                active
                  ? "border-current text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={active ? { color, borderColor: color } : undefined}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: active ? bg : "#f1f5f9" }}>
                <Icon size={13} strokeWidth={2} style={{ color: active ? color : "#94a3b8" }} />
              </div>
              {label}
              {active && key !== "PUBLIC" && disabled > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {disabled} tắt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Summary / action bar ── */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          {activeTab === "PUBLIC"
            ? <>Quản lý hiển thị và tên <span className="font-semibold">trang công khai</span></>
            : (() => {
                const { enabled, total } = roleCounts(activeTab as RolePageGroup);
                return <>Đang bật <span className="font-bold text-green-600">{enabled}</span> / {total} trang cho <span className="font-semibold">{ROLE_LABELS[activeTab as RolePageGroup]}</span></>;
              })()
          }
        </p>
        <div className="flex items-center gap-2">
          {currentStatus === "success" && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check size={13} strokeWidth={2.5} /> Đã lưu
            </span>
          )}
          {currentStatus === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <AlertCircle size={13} strokeWidth={2.5} /> {errorMsg[activeTab]}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Save size={13} strokeWidth={2} />
            {isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* ── PUBLIC tab content ── */}
      {activeTab === "PUBLIC" && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Trang</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-52">Tên hiển thị</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">Hiển thị</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">Nổi bật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialPublicConfigs.map((page) => {
                const state = publicState[page.pageKey] ?? { isVisible: true, isFeatured: false, customLabel: "" };
                return (
                  <tr key={page.pageKey} className="hover:bg-gray-50 transition-colors">
                    {/* Page info */}
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">{page.defaultLabel}</p>
                      <p className="text-[11px] text-gray-400">/{page.pageKey || ""}</p>
                    </td>

                    {/* Custom label input */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={state.customLabel}
                        onChange={(e) => setPublicField(page.pageKey, "customLabel", e.target.value)}
                        placeholder={page.defaultLabel}
                        maxLength={200}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                      />
                    </td>

                    {/* Visibility toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setPublicField(page.pageKey, "isVisible", !state.isVisible)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          state.isVisible
                            ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        }`}
                      >
                        {state.isVisible
                          ? <><Eye size={11} strokeWidth={2.5} /> Hiện</>
                          : <><EyeOff size={11} strokeWidth={2.5} /> Ẩn</>
                        }
                      </button>
                    </td>

                    {/* Featured toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setPublicField(page.pageKey, "isFeatured", !state.isFeatured)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          state.isFeatured
                            ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-300"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <Star size={11} strokeWidth={2.5} fill={state.isFeatured ? "currentColor" : "none"} />
                        {state.isFeatured ? "Nổi bật" : "Thường"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── STAFF / USER / SELLER tab content ── */}
      {activeTab !== "PUBLIC" && (
        <div className="divide-y divide-gray-100">
          {registry[activeTab as RolePageGroup].map((group) => {
            const currentPerms  = perms[activeTab as RolePageGroup];
            const groupEnabled  = group.pages.filter((p) => currentPerms[p.key] !== false).length;
            const groupTotal    = group.pages.length;
            const allOn         = groupEnabled === groupTotal;
            const allOff        = groupEnabled === 0;

            return (
              <div key={group.key} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-800">{group.label}</h3>
                    <span className="text-xs text-gray-400">{groupEnabled}/{groupTotal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => toggleGroup(group.key, true)} disabled={allOn}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 transition-colors">
                      Bật tất cả
                    </button>
                    <button type="button" onClick={() => toggleGroup(group.key, false)} disabled={allOff}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors">
                      Tắt tất cả
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.pages.map((page) => {
                    const enabled = perms[activeTab as RolePageGroup][page.key] !== false;
                    return (
                      <button key={page.key} type="button" onClick={() => toggle(page.key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          enabled
                            ? "border-green-200 bg-green-50 hover:bg-green-100"
                            : "border-red-200 bg-red-50 hover:bg-red-100"
                        }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          enabled ? "bg-green-500" : "bg-red-400"
                        }`}>
                          {enabled
                            ? <Check size={11} strokeWidth={3} className="text-white" />
                            : <X    size={11} strokeWidth={3} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${enabled ? "text-gray-800" : "text-gray-500 line-through"}`}>
                            {page.label}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">/{page.key}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          enabled ? "text-green-700 bg-green-100" : "text-red-600 bg-red-100"
                        }`}>
                          {enabled ? "BẬT" : "TẮT"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
