"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "PENDING",    label: "Chờ xử lý",  cls: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" },
  { value: "PROCESSING", label: "Đang xử lý", cls: "bg-[#7C3AED]/10 text-[#A855F7] border border-[#A855F7]/20" },
  { value: "DONE",       label: "Hoàn thành", cls: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" },
  { value: "FROZEN",     label: "Đóng băng",  cls: "bg-[#0891b2]/10 text-[#0891b2] border border-[#0891b2]/20" },
  
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  async function handleChange(next: string) {
    if (next === status) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
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
    <div className="relative inline-flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
        title="Click để đổi trạng thái"
        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-opacity hover:opacity-75 ${loading ? "opacity-50 cursor-wait" : "cursor-pointer"} ${current?.cls ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}
      >
        {loading ? "..." : (current?.label ?? status)}
        {!loading && <span className="ml-1 opacity-50">▾</span>}
      </button>
      {err && <span className="text-[9px] text-red-500">Lỗi</span>}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-[130px]">
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
        </>
      )}
    </div>
  );
}
