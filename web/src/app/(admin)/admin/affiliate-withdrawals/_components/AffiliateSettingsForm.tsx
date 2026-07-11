"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, CheckCircle, AlertTriangle } from "lucide-react";

interface AffiliateSettingsValue {
  hold_days: number;
  min_withdrawal_amount: number;
  withdrawal_fee_percent: number;
}

export default function AffiliateSettingsForm({ initial }: { initial: AffiliateSettingsValue }) {
  const router = useRouter();
  const [form, setForm]       = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/affiliate-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Cập nhật thất bại");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Settings size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-800">Cấu hình rút hoa hồng affiliate</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Số ngày hold đơn</label>
            <input
              type="number"
              min={0}
              max={30}
              required
              value={form.hold_days}
              onChange={(e) => setForm((f) => ({ ...f, hold_days: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Số tiền rút tối thiểu (đ)</label>
            <input
              type="number"
              min={0}
              required
              value={form.min_withdrawal_amount}
              onChange={(e) => setForm((f) => ({ ...f, min_withdrawal_amount: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Phí rút (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.1}
              required
              value={form.withdrawal_fee_percent}
              onChange={(e) => setForm((f) => ({ ...f, withdrawal_fee_percent: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <CheckCircle size={13} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">Đã lưu cấu hình</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
}
