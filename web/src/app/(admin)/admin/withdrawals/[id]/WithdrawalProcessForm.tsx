"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface Props {
  withdrawalId: string;
  netAmount: number;
  completeOnly?: boolean;
}

export default function WithdrawalProcessForm({ withdrawalId, netAmount, completeOnly = false }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"approve" | "reject" | "complete" | null>(
    completeOnly ? "complete" : null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    if (action === "reject" && !rejectReason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const body =
        action === "approve"
          ? { action: "approve" }
          : action === "complete"
            ? { action: "complete" }
            : { action: "reject", rejectReason: rejectReason.trim() };

      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.push("/admin/withdrawals");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (completeOnly) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Xác nhận đã chuyển khoản</h2>
        <p className="text-xs text-gray-500">
          Thực nhận: <span className="text-emerald-600 font-semibold" suppressHydrationWarning>{formatVnd(netAmount)}</span>
          <span className="ml-2 text-gray-400">— Xác nhận sau khi đã chuyển khoản ngân hàng thành công</span>
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : "✅ Xác nhận đã chuyển khoản"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Xử lý yêu cầu</h2>
      <p className="text-xs text-gray-500">
        Thực nhận: <span className="text-emerald-600 font-semibold" suppressHydrationWarning>{formatVnd(netAmount)}</span>
        <span className="ml-2 text-amber-600">← Số tiền admin cần chuyển khoản thủ công</span>
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAction("approve")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            action === "approve"
              ? "bg-emerald-500 text-white"
              : "border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
          }`}
        >
          ✅ Duyệt
        </button>
        <button
          type="button"
          onClick={() => setAction("reject")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            action === "reject"
              ? "bg-red-500 text-white"
              : "border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600"
          }`}
        >
          ❌ Từ chối
        </button>
      </div>

      {action === "approve" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">Khi duyệt:</p>
            <ul className="text-xs text-emerald-600 mt-1 space-y-0.5 list-disc list-inside">
              <li>Các đơn hàng trong yêu cầu được đánh dấu đã rút</li>
              <li>Số dư seller bị trừ tương ứng</li>
              <li>Bạn cần chuyển khoản ngân hàng thủ công</li>
            </ul>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : "Xác nhận duyệt"}
          </button>
        </form>
      )}

      {action === "reject" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">Khi từ chối: đơn hàng vẫn withdrawn=false — seller có thể gửi lại yêu cầu.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Lý do từ chối *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="Nhập lý do từ chối..."
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </form>
      )}
    </div>
  );
}
