"use client";

import { useState, useTransition } from "react";
import { Users, Store, ShieldCheck, Save, Check, X, AlertCircle } from "lucide-react";
import type { PageGroup, RolePageGroup } from "@/lib/page-registry";

interface Props {
  registry: Record<RolePageGroup, PageGroup[]>;
  initialStaff:  Record<string, boolean>;
  initialUser:   Record<string, boolean>;
  initialSeller: Record<string, boolean>;
}

type Tab = RolePageGroup;

const TAB_CONFIG: { key: Tab; label: string; Icon: typeof Users; color: string; bg: string }[] = [
  { key: "STAFF",  label: "Nhân viên",      Icon: ShieldCheck, color: "#7c3aed", bg: "#ede9fe" },
  { key: "USER",   label: "Người dùng",     Icon: Users,       color: "#0066ff", bg: "#dbeafe" },
  { key: "SELLER", label: "Nhà bán hàng",   Icon: Store,       color: "#ec4899", bg: "#fce7f3" },
];

const ROLE_LABELS: Record<Tab, string> = {
  STAFF:  "nhân viên",
  USER:   "người dùng",
  SELLER: "nhà bán hàng",
};

export default function PermissionManager({ registry, initialStaff, initialUser, initialSeller }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("STAFF");
  const [perms, setPerms] = useState<Record<Tab, Record<string, boolean>>>({
    STAFF:  { ...initialStaff },
    USER:   { ...initialUser },
    SELLER: { ...initialSeller },
  });
  const [saveStatus, setSaveStatus] = useState<Record<Tab, "idle" | "success" | "error">>({
    STAFF: "idle", USER: "idle", SELLER: "idle",
  });
  const [errorMsg, setErrorMsg] = useState<Record<Tab, string>>({ STAFF: "", USER: "", SELLER: "" });
  const [isPending, startTransition] = useTransition();

  const currentGroups = registry[activeTab];
  const currentPerms  = perms[activeTab];
  const currentStatus = saveStatus[activeTab];

  function toggle(pageKey: string) {
    setPerms((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [pageKey]: !prev[activeTab][pageKey] },
    }));
    if (saveStatus[activeTab] !== "idle") {
      setSaveStatus((s) => ({ ...s, [activeTab]: "idle" }));
    }
  }

  function toggleGroup(groupKey: string, value: boolean) {
    const group = currentGroups.find((g) => g.key === groupKey);
    if (!group) return;
    const updates = Object.fromEntries(group.pages.map((p) => [p.key, value]));
    setPerms((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...updates } }));
    if (saveStatus[activeTab] !== "idle") {
      setSaveStatus((s) => ({ ...s, [activeTab]: "idle" }));
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/page-permissions", {
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
        setSaveStatus((s) => ({ ...s, [activeTab]: "success" }));
        setTimeout(() => setSaveStatus((s) => ({ ...s, [activeTab]: "idle" })), 3000);
      } catch {
        setErrorMsg((e) => ({ ...e, [activeTab]: "Lỗi kết nối" }));
        setSaveStatus((s) => ({ ...s, [activeTab]: "error" }));
      }
    });
  }

  const enabledCount  = Object.values(currentPerms).filter(Boolean).length;
  const totalCount    = Object.values(currentPerms).length;
  const disabledCount = totalCount - enabledCount;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200">
        {TAB_CONFIG.map(({ key, label, Icon, color, bg }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                active
                  ? "border-current text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={active ? { color, borderColor: color } : undefined}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: active ? bg : "#f1f5f9" }}>
                <Icon size={13} strokeWidth={2} style={{ color: active ? color : "#94a3b8" }} />
              </div>
              {label}
              {active && disabledCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {disabledCount} tắt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Summary bar ── */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Đang bật <span className="font-bold text-green-600">{enabledCount}</span> / {totalCount} trang cho{" "}
          <span className="font-semibold">{ROLE_LABELS[activeTab]}</span>
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

      {/* ── Permission groups ── */}
      <div className="divide-y divide-gray-100">
        {currentGroups.map((group) => {
          const groupEnabled  = group.pages.filter((p) => currentPerms[p.key] !== false).length;
          const groupTotal    = group.pages.length;
          const allOn         = groupEnabled === groupTotal;
          const allOff        = groupEnabled === 0;

          return (
            <div key={group.key} className="p-5">
              {/* Group header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">{group.label}</h3>
                  <span className="text-xs text-gray-400">{groupEnabled}/{groupTotal}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key, true)}
                    disabled={allOn}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 transition-colors"
                  >
                    Bật tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key, false)}
                    disabled={allOff}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
                  >
                    Tắt tất cả
                  </button>
                </div>
              </div>

              {/* Pages grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.pages.map((page) => {
                  const enabled = currentPerms[page.key] !== false;
                  return (
                    <button
                      key={page.key}
                      type="button"
                      onClick={() => toggle(page.key)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        enabled
                          ? "border-green-200 bg-green-50 hover:bg-green-100"
                          : "border-red-200 bg-red-50 hover:bg-red-100"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        enabled ? "bg-green-500" : "bg-red-400"
                      }`}>
                        {enabled
                          ? <Check size={11} strokeWidth={3} className="text-white" />
                          : <X    size={11} strokeWidth={3} className="text-white" />
                        }
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
    </div>
  );
}
