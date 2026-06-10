"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  complaintId: string;
  complaintStatus: string;
}

export default function CloseComplaintButton({ complaintId, complaintStatus }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isResolved = complaintStatus === "RESOLVED" || complaintStatus === "REJECTED";
  if (isResolved || done) return null;

  async function handleClose() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/confirm-order`, { credentials: "include",
        method: "POST",
      });
      const json = await res.json() as { data?: { resolved?: boolean }; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Thất bại");
        setConfirm(false);
        return;
      }
      setDone(true);
      setConfirm(false);
      router.refresh();
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium ml-3"
        title="Đóng khiếu nại — hỗ trợ nhà bán hàng"
      >
        Đóng
      </button>

      {/* Confirm mini-dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => !loading && setConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-gray-800">Xác nhận đóng khiếu nại</span>
              </div>
              <button
                onClick={() => setConfirm(false)}
                disabled={loading}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                Đóng khiếu nại này và xác nhận đơn hàng hợp lệ.
                <br />
                <span className="text-emerald-600 font-medium">Nhà bán hàng sẽ được hỗ trợ rút tiền.</span>
              </p>
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : "Xác nhận đóng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
