"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { AlertTriangle } from "lucide-react";

interface Props {
  orderId: string;
  remainingAmount: number;
}

export default function PayRemainingButton({ orderId, remainingAmount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function handlePay() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay-remaining`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Thanh toán thất bại, thử lại sau.");
        setShowConfirm(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600">Xác nhận thanh toán {formatVnd(remainingAmount)}?</span>
        <button
          onClick={handlePay}
          disabled={loading}
          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Xác nhận"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertTriangle size={11} />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
      >
        Thanh toán còn lại {formatVnd(remainingAmount)}
      </button>
    </div>
  );
}
