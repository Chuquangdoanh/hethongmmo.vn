"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "ACTIVE",   label: "Hoạt động", cls: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" },
  { value: "BANNED",   label: "Đã khóa",   cls: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" },
];

export default function InlineUserStatusCell({
  userId,
  status: initialStatus,
  isSelf,
}: {
  userId: string;
  status: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  function openDropdown() {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  }

  async function handleChange(next: string) {
    if (next === status) { setOpen(false); return; }
    setOpen(false);
    setLoading(true);
    setErr(false);
    const action = next === "BANNED" ? "ban" : next === "ACTIVE" ? "unban" : null;
    if (!action) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setStatus(next);
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

  // Cannot change own status
  if (isSelf) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${current?.cls ?? "bg-gray-100 text-gray-500"}`}>
        {current?.label ?? status}
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
          title="Click để đổi trạng thái"
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-opacity hover:opacity-75 ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"} ${current?.cls ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}
        >
          {loading ? "..." : (current?.label ?? status)}
          {!loading && <span className="ml-1 opacity-40">▾</span>}
        </button>
        {err && <span className="text-[9px] text-red-500">Lỗi</span>}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-[120px]"
            style={{ top: dropPos.top, left: dropPos.left }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void handleChange(opt.value)}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 ${opt.value === status ? "bg-gray-50" : ""}`}
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${opt.cls}`}>
                  {opt.label}
                </span>
                {opt.value === status && <span className="ml-auto text-[#10B981] text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
