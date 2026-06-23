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
  const [dismissing, setDismissing] = useState(false);
  const [done, setDone] = useState<{ type: "resolved" | "dismissed"; msg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deposits/unmatched/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });
      const json = await res.json() as { data?: { resolvedForEmail: string; amount: number }; error?: string };
      if (res.ok && json.data) {
        setDone({ type: "resolved", msg: `Đã cộng ${formatVnd(json.data.amount)} cho ${json.data.resolvedForEmail}` });
        setOpen(false);
      } else {
        setError(json.error ?? "Lỗi không xác định");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    if (!window.confirm(`Từ chối giao dịch ${referenceCode}?\n\nGiao dịch sẽ bị đánh dấu "Bỏ qua" và KHÔNG cộng tiền cho bất kỳ user nào.`)) return;
    setDismissing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deposits/unmatched/${id}`, {
        credentials: "include",
        method: "DELETE",
      });
      const json = await res.json() as { error?: string };
      if (res.ok) {
        setDone({ type: "dismissed", msg: "Đã từ chối" });
      } else {
        setError(json.error ?? "Lỗi không xác định");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setDismissing(false);
    }
  }

  if (done) {
    return (
      <span className={`text-[10px] font-medium ${done.type === "resolved" ? "text-emerald-600" : "text-gray-400"}`}>
        {done.msg}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {!open ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOpen(true)}
            className="px-2 py-1 rounded text-[10px] font-medium bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors"
          >
            Gán user
          </button>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
          >
            {dismissing ? "..." : "Từ chối"}
          </button>
        </div>
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
            onClick={() => { setOpen(false); setError(null); }}
            className="px-1.5 py-1 rounded text-[10px] text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </form>
      )}
      {error && <p className="text-[10px] text-[#EF4444]">{error}</p>}
    </div>
  );
}
