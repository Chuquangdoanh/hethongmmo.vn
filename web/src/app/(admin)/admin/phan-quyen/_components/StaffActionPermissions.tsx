"use client";

import { useState, useTransition } from "react";
import { Check, X, Save, AlertCircle, UserCheck, Shield } from "lucide-react";
import {
  STAFF_PERMISSION_GROUPS,
  ACTION_TYPE_STYLE,
  type StaffPermissionKey,
} from "@/lib/constants/staff-permissions";
import { PERMISSION_DEPENDENCIES } from "@/lib/constants/modules";
import type { StaffMember } from "@/lib/services/staff-permission.service";

// ─── Dependency resolution ────────────────────────────────────────────────────

/** Collect all permissions implied by the current set (transitive). */
function resolveImplied(set: Set<StaffPermissionKey>): Set<StaffPermissionKey> {
  const implied = new Set<StaffPermissionKey>();
  for (const code of set) {
    const deps = PERMISSION_DEPENDENCIES[code] ?? [];
    deps.forEach((d) => implied.add(d as StaffPermissionKey));
  }
  return implied;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialMembers: StaffMember[];
}

export default function StaffActionPermissions({ initialMembers }: Props) {
  const [members, setMembers]       = useState<StaffMember[]>(initialMembers);
  const [selectedId, setSelectedId] = useState<string>(initialMembers[0]?.id ?? "");
  const [localPerms, setLocalPerms] = useState<Record<string, Set<StaffPermissionKey>>>(() =>
    Object.fromEntries(initialMembers.map((m) => [m.id, new Set(m.permissions)]))
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]     = useState("");
  const [isPending, startTransition] = useTransition();

  const selected   = members.find((m) => m.id === selectedId);
  const currentSet = localPerms[selectedId] ?? new Set<StaffPermissionKey>();
  const implied    = resolveImplied(currentSet); // keys that are auto-required

  function togglePerm(key: StaffPermissionKey) {
    // If this key is auto-implied by another, it can't be toggled independently
    if (implied.has(key)) return;
    setLocalPerms((prev) => {
      const next = new Set(prev[selectedId] ?? []);
      if (next.has(key)) next.delete(key); else next.add(key);
      return { ...prev, [selectedId]: next };
    });
    setSaveStatus("idle");
  }

  function toggleGroup(keys: StaffPermissionKey[], value: boolean) {
    setLocalPerms((prev) => {
      const next = new Set(prev[selectedId] ?? []);
      // Only toggle keys not forced by dependencies
      keys.filter((k) => !implied.has(k)).forEach((k) => {
        if (value) next.add(k); else next.delete(k);
      });
      return { ...prev, [selectedId]: next };
    });
    setSaveStatus("idle");
  }

  function handleSave() {
    if (!selectedId) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/staff-permissions", {
          credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId:      selectedId,
            permissions: Array.from(currentSet),
          }),
        });
        if (!res.ok) {
          const json = await res.json() as { error?: string };
          setErrorMsg(json.error ?? "Lỗi không xác định");
          setSaveStatus("error");
          return;
        }
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedId
              ? { ...m, permissions: Array.from(currentSet) }
              : m
          )
        );
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setErrorMsg("Lỗi kết nối");
        setSaveStatus("error");
      }
    });
  }

  if (initialMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-3">
        <UserCheck size={40} strokeWidth={1.5} className="text-gray-300" />
        <p className="text-sm font-medium">Chưa có nhân viên nào</p>
        <p className="text-xs">Nâng cấp tài khoản lên STAFF để phân quyền</p>
      </div>
    );
  }

  const permCount = currentSet.size;

  return (
    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

      {/* ── Staff list ── */}
      <div className="lg:w-64 shrink-0 p-4 space-y-1.5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
          Danh sách nhân viên
        </p>
        {members.map((m) => {
          const active = m.id === selectedId;
          const count  = (localPerms[m.id] ?? new Set()).size;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelectedId(m.id); setSaveStatus("idle"); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? "bg-violet-50 border border-violet-200"
                  : "hover:bg-gray-50 border border-transparent"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                active ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {m.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${active ? "text-violet-900" : "text-gray-700"}`}>
                  {m.fullName}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                count > 0
                  ? "bg-violet-100 text-violet-700"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Permission matrix ── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={14} strokeWidth={2} className="text-violet-600" />
            <p className="text-xs text-gray-600">
              <span className="font-bold text-gray-900">{selected?.fullName}</span>
              {" — "}đang có{" "}
              <span className="font-bold text-violet-600">{permCount}</span> quyền
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "success" && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check size={13} strokeWidth={2.5} /> Đã lưu
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={13} strokeWidth={2.5} /> {errorMsg}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Save size={13} strokeWidth={2} />
              {isPending ? "Đang lưu…" : "Lưu quyền"}
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="divide-y divide-gray-100 max-h-[calc(100vh-280px)] overflow-y-auto">
          {STAFF_PERMISSION_GROUPS.map((group) => {
            const groupKeys  = group.actions.map((a) => a.key);
            // Count only directly-enabled keys (not auto-implied)
            const directKeys  = groupKeys.filter((k) => !implied.has(k));
            const enabledCnt  = groupKeys.filter((k) => currentSet.has(k) || implied.has(k)).length;
            const directOn    = directKeys.filter((k) => currentSet.has(k)).length;
            const allOn       = directKeys.length === 0 || directOn === directKeys.length;
            const allOff      = directOn === 0;

            return (
              <div key={group.key} className="p-5">
                {/* Group header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: group.color }}
                    />
                    <h3 className="text-sm font-bold text-gray-800">{group.label}</h3>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: group.bg, color: group.color }}
                    >
                      {enabledCnt}/{groupKeys.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKeys, true)}
                      disabled={allOn}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 transition-colors"
                    >
                      Bật tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKeys, false)}
                      disabled={allOff}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      Tắt tất cả
                    </button>
                  </div>
                </div>

                {/* Action toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.actions.map((action) => {
                    const isImplied = implied.has(action.key);
                    const on        = currentSet.has(action.key) || isImplied;
                    const style     = ACTION_TYPE_STYLE[action.type] ?? ACTION_TYPE_STYLE["read"]!;

                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => togglePerm(action.key)}
                        disabled={isImplied}
                        title={isImplied ? "Tự động bật do quyền khác phụ thuộc" : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          on
                            ? isImplied
                              ? "border-blue-200 bg-blue-50 cursor-default"
                              : "border-green-200 bg-green-50 hover:bg-green-100"
                            : "border-red-200 bg-red-50 hover:bg-red-100"
                        }`}
                      >
                        {/* On/off indicator */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          on
                            ? isImplied ? "bg-blue-400" : "bg-green-500"
                            : "bg-red-400"
                        }`}>
                          {on
                            ? <Check size={11} strokeWidth={3} className="text-white" />
                            : <X    size={11} strokeWidth={3} className="text-white" />
                          }
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            on
                              ? isImplied ? "text-blue-700" : "text-gray-800"
                              : "text-gray-400 line-through"
                          }`}>
                            {action.label}
                            {isImplied && (
                              <span className="ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded uppercase tracking-wide">
                                auto
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">{action.key}</p>
                        </div>

                        {/* CRUD badge */}
                        <span
                          className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-3 items-center">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">
            <span className="w-4 h-4 rounded-full bg-blue-400 flex items-center justify-center">
              <Check size={8} strokeWidth={3} className="text-white" />
            </span>
            Auto (bắt buộc do phụ thuộc)
          </span>
          {Object.entries(ACTION_TYPE_STYLE).map(([type, s]) => (
            <span key={type} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: s.text }}>
              <span
                className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center"
                style={{ background: s.bg, color: s.text }}
              >
                {s.label}
              </span>
              {type === "read" ? "Read" : type === "create" ? "Create" : type === "update" ? "Update" : type === "delete" ? "Delete" : type === "approve" ? "Approve" : type === "reject" ? "Reject" : type === "reply" ? "Reply" : "Close"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
