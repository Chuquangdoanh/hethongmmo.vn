"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "PENDING",    label: "Chờ xử lý",     cls: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" },
  { value: "PROCESSING", label: "Đang xử lý",    cls: "bg-[#7C3AED]/10 text-[#A855F7] border border-[#A855F7]/20" },
  { value: "DONE",       label: "Hoàn thành",    cls: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" },
  { value: "FROZEN",     label: "Hủy đơn",       cls: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" },
  { value: "REFUNDED",   label: "Đã hoàn tiền",  cls: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" },
];

export default function InlineStatusCell({
  orderId,
  status: initialStatus,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  function handleOpen() {
    if (loading) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((o) => !o);
  }

  async function handleChange(next: string) {
    if (next === status) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
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

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={loading}
        title="Click để đổi trạng thái"
        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-opacity hover:opacity-75 ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"} ${current?.cls ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}
      >
        {loading ? "..." : (current?.label ?? status)}
        {!loading && <span className="ml-1 opacity-50">▾</span>}
      </button>
      {err && <span className="text-[9px] text-red-500">Lỗi</span>}

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-9998" onClick={() => setOpen(false)} />
          <div
            className="fixed z-9999 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-32.5"
            style={{ top: dropPos.top, left: dropPos.left }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange(opt.value)}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 ${opt.value === status ? "bg-gray-50" : ""}`}
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${opt.cls}`}>
                  {opt.label}
                </span>
                {opt.value === status && <span className="ml-auto text-[#10B981] text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
