"use client";

import { useState, useTransition } from "react";
import { Users, Store, ShieldCheck, Save, Check, X, AlertCircle, Globe, Star, Eye, EyeOff, Lock, Plus, Trash2 } from "lucide-react";
import type { PageGroup, RolePageGroup } from "@/lib/page-registry";
import type { PublicPageConfigEntry } from "@/lib/services/public-page-config.service";
import type { StaffMember } from "@/lib/services/staff-permission.service";
import StaffActionPermissions from "./StaffActionPermissions";

interface Props {
  registry:             Record<RolePageGroup, PageGroup[]>;
  initialStaff:         Record<string, boolean>;
  initialUser:          Record<string, boolean>;
  initialSeller:        Record<string, boolean>;
  initialPublicConfigs: PublicPageConfigEntry[];
  staffMembers:         StaffMember[];
}

type Tab = RolePageGroup | "PUBLIC" | "STAFF_ACTIONS";

const TAB_CONFIG: { key: Tab; label: string; Icon: typeof Users; color: string; bg: string }[] = [
  { key: "PUBLIC",        label: "Trang công khai",    Icon: Globe,      color: "#0f9d58", bg: "#d4edda" },
  { key: "STAFF",         label: "Nhân viên (trang)",  Icon: ShieldCheck, color: "#7c3aed", bg: "#ede9fe" },
  { key: "STAFF_ACTIONS", label: "Nhân viên (CRUD)",   Icon: Lock,        color: "#dc2626", bg: "#fee2e2" },
  { key: "USER",          label: "Người dùng",         Icon: Users,       color: "#0066ff", bg: "#dbeafe" },
  { key: "SELLER",        label: "Nhà bán hàng",       Icon: Store,       color: "#ec4899", bg: "#fce7f3" },
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
  registry, initialStaff, initialUser, initialSeller, initialPublicConfigs, staffMembers,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("PUBLIC");

  // Role-based permission state
  const [perms, setPerms] = useState<Record<RolePageGroup, Record<string, boolean>>>({
    STAFF:  { ...initialStaff },
    USER:   { ...initialUser },
    SELLER: { ...initialSeller },
  });

  // Public page list + config state
  const [publicPages, setPublicPages] = useState(initialPublicConfigs);
  const [publicState, setPublicState] = useState<PublicState>(initPublicState(initialPublicConfigs));

  // Add-page form state
  const [newKey,   setNewKey]   = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addError,  setAddError]  = useState("");

  const [saveStatus, setSaveStatus] = useState<Record<Tab, "idle" | "success" | "error">>({
    PUBLIC: "idle", STAFF: "idle", STAFF_ACTIONS: "idle", USER: "idle", SELLER: "idle",
  });
  const [errorMsg, setErrorMsg] = useState<Record<Tab, string>>({
    PUBLIC: "", STAFF: "", STAFF_ACTIONS: "", USER: "", SELLER: "",
  });
  const [isPending, startTransition] = useTransition();

  // ── Role tab helpers ──────────────────────────────────────────────────────
  function toggle(pageKey: string) {
    if (!isRoleTab(activeTab)) return;
    setPerms((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [pageKey]: !prev[activeTab][pageKey] },
    }));
    resetStatus();
  }

  function toggleGroup(groupKey: string, value: boolean) {
    if (!isRoleTab(activeTab)) return;
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
  async function handleCreate() {
    const key   = newKey.trim();
    const label = newLabel.trim();
    if (!key || !label) { setAddError("Vui lòng nhập đủ URL path và tên trang"); return; }
    setAddStatus("loading");
    setAddError("");
    const res = await fetch("/api/admin/public-page-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageKey: key, label }),
    });
    if (res.ok) {
      const newEntry = { pageKey: key, defaultLabel: label, isVisible: true, isFeatured: false, customLabel: label, isStatic: false };
      setPublicPages((prev) => [...prev, newEntry]);
      setPublicState((prev) => ({ ...prev, [key]: { isVisible: true, isFeatured: false, customLabel: label } }));
      setNewKey(""); setNewLabel("");
      setAddStatus("success");
      setTimeout(() => setAddStatus("idle"), 2500);
    } else {
      const json = await res.json() as { error?: string };
      setAddError(json.error ?? "Lỗi không xác định");
      setAddStatus("error");
    }
  }

  async function handleDelete(pageKey: string) {
    const res = await fetch("/api/admin/public-page-configs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageKey }),
    });
    if (res.ok) {
      setPublicPages((prev) => prev.filter((p) => p.pageKey !== pageKey));
      setPublicState((prev) => { const next = { ...prev }; delete next[pageKey]; return next; });
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        if (activeTab === "PUBLIC") {
          const configs = publicPages.map((page) => ({
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
        } else if (isRoleTab(activeTab)) {
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

  const isRoleTab = (t: Tab): t is RolePageGroup =>
    t === "STAFF" || t === "USER" || t === "SELLER";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label, Icon, color, bg }) => {
          const active   = activeTab === key;
          const disabled = isRoleTab(key) ? roleCounts(key).disabled : 0;
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
              {active && isRoleTab(key) && disabled > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {disabled} tắt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Summary / action bar — ẩn cho STAFF_ACTIONS (tự có bar riêng) ── */}
      {activeTab !== "STAFF_ACTIONS" && (
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
      )}

      {/* ── STAFF_ACTIONS tab content ── */}
      {activeTab === "STAFF_ACTIONS" && (
        <StaffActionPermissions initialMembers={staffMembers} />
      )}

      {/* ── PUBLIC tab content ── */}
      {activeTab === "PUBLIC" && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Trang</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Tên Hiển Thi (X)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">Hiển thị</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">Nổi bật</th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {publicPages.map((page) => {
                const state = publicState[page.pageKey] ?? { isVisible: true, isFeatured: false, customLabel: "" };
                return (
                  <tr key={page.pageKey} className="hover:bg-gray-50 transition-colors">
                    {/* Page info + badge */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{page.defaultLabel}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          page.isStatic
                            ? "bg-gray-100 text-gray-400"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        }`}>
                          {page.isStatic ? "TĨNH" : "TÙY CHỈNH"}
                        </span>
                      </div>
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

                    {/* Delete — chỉ cho trang tùy chỉnh */}
                    <td className="px-4 py-3 text-center">
                      {!page.isStatic && (
                        <button
                          type="button"
                          onClick={() => handleDelete(page.pageKey)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa trang này"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── Add new page row ── */}
            
          </table>
        </div>
      )}

      {/* ── STAFF / USER / SELLER tab content ── */}
      {isRoleTab(activeTab) && (
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
