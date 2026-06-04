"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/utils/format";

interface Props {
  id: string;
  referenceCode: string;
  amount: number;
}

export default function ResolveUnmatchedButton({ id, referenceCode, amount }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/deposits/unmatched/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });
      const json = await res.json() as { data?: { resolvedForEmail: string; amount: number }; error?: string };
      if (res.ok && json.data) {
        setResult({ ok: true, msg: `Đã cộng ${formatVnd(json.data.amount)} cho ${json.data.resolvedForEmail}` });
        setOpen(false);
      } else {
        setResult({ ok: false, msg: json.error ?? "Lỗi không xác định" });
      }
    } catch {
      setResult({ ok: false, msg: "Lỗi kết nối" });
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    return <span className="text-[10px] text-emerald-600 font-medium">{result.msg}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-2 py-1 rounded text-[10px] font-medium bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors"
        >
          Gán user
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@user.vn"
            required
            className="border border-gray-300 rounded px-2 py-1 text-[11px] w-44 focus:outline-none focus:border-[#7C3AED]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-2 py-1 rounded text-[10px] font-medium bg-[#7C3AED] text-white disabled:opacity-50 hover:bg-[#6D28D9] transition-colors"
          >
            {loading ? "..." : `Cộng ${formatVnd(amount)}`}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setResult(null); }}
            className="px-1.5 py-1 rounded text-[10px] text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </form>
      )}
      {result && !result.ok && (
        <p className="text-[10px] text-[#EF4444]">{result.msg}</p>
      )}
    </div>
  );
}
