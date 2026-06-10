"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = [
  { value: "USER",   label: "Người dùng", cls: "bg-gray-100 text-gray-600 border border-gray-200" },
  { value: "SELLER", label: "Nhà bán",    cls: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" },
  { value: "STAFF",  label: "Nhân viên",  cls: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" },
  { value: "ADMIN",  label: "Admin",      cls: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" },
];

export default function InlineRoleCell({
  userId,
  role: initialRole,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [role, setRole] = useState(initialRole);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const current = ROLE_OPTIONS.find((o) => o.value === role);

  function openDropdown() {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  }

  async function doChange(next: string) {
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_role", role: next }),
      });
      if (res.ok) {
        setRole(next);
        router.refresh();
      } else {
        setErr(true);
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(next: string) {
    if (next === role) { setOpen(false); return; }
    setOpen(false);
    if (next === "STAFF" || next === "ADMIN") {
      setConfirm(next);
    } else {
      void doChange(next);
    }
  }

  // Cannot change own role — show static badge
  if (isSelf) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${current?.cls ?? "bg-gray-100 text-gray-500"}`}>
        {current?.label ?? role}
      </span>
    );
  }

  return (
    <>
      <div className="inline-flex flex-col items-start gap-0.5">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !loading && (open ? setOpen(false) : openDropdown())}
          disabled={loading}
          title="Click để đổi quyền"
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-opacity hover:opacity-75 ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"} ${current?.cls ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}
        >
          {loading ? "..." : (current?.label ?? role)}
          {!loading && <span className="ml-1 opacity-40">▾</span>}
        </button>
        {err && <span className="text-[9px] text-red-500">Lỗi</span>}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-[130px]"
            style={{ top: dropPos.top, left: dropPos.left }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 ${opt.value === role ? "bg-gray-50" : ""}`}
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${opt.cls}`}>
                  {opt.label}
                </span>
                {opt.value === role && <span className="ml-auto text-[#10B981] text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Confirm for elevated roles */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-sm font-semibold text-gray-900 mb-2">Xác nhận thay đổi quyền?</p>
            <p className="text-xs text-gray-500 mb-4">
              Bạn đang nâng người dùng này lên{" "}
              <span className="font-semibold text-gray-900">
                {ROLE_OPTIONS.find((o) => o.value === confirm)?.label}
              </span>
              . Hành động sẽ được ghi vào audit log.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={() => { void doChange(confirm); setConfirm(null); }}
                className="px-4 py-2 text-xs rounded-lg bg-[#EF4444] text-white hover:bg-red-600"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
