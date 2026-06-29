"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface KfbStatusData {
  transId:     string;
  orderStatus: string;
  kfb: {
    status: string;
    data?: {
      trans_id?:    string;
      status?:      string;
      remains?:     number;
      start_count?: number;
      charge?:      string | number;
    };
  };
}

const KFB_STATUS_LABELS: Record<string, string> = {
  pending:     "Chờ xử lý",
  processing:  "Đang xử lý",
  in_progress: "Đang thực hiện",
  completed:   "Hoàn thành",
  partial:     "Hoàn thành một phần",
  canceled:    "Đã hủy",
  cancelled:   "Đã hủy",
  error:       "Lỗi",
};

export default function KfbLiveStatus({ orderId }: { orderId: string }) {
  const [data,    setData]    = useState<KfbStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res  = await fetch(`/api/orders/${orderId}/kfb-status`, { credentials: "include" });
      const json = await res.json() as { success: boolean; data?: KfbStatusData; error?: string };
      if (!res.ok || !json.data) {
        setErr(json.error ?? "Không thể tải trạng thái từ Khuongfb");
        return;
      }
      setData(json.data);
    } catch {
      setErr("Lỗi kết nối, thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [orderId]);

  const kfbStatus = data?.kfb?.data?.status ?? null;
  const kfbLabel  = kfbStatus ? (KFB_STATUS_LABELS[kfbStatus.toLowerCase()] ?? kfbStatus) : null;
  const remains   = data?.kfb?.data?.remains;
  const charge    = data?.kfb?.data?.charge;

  return (
    <div className="space-y-3">

      {/* Live status */}
      {loading ? (
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
      ) : err ? (
        <p className="text-xs text-gray-400 italic">{err}</p>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kfbLabel && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Trạng thái KFB</p>
              <p className="text-sm font-semibold text-gray-800">{kfbLabel}</p>
            </div>
          )}
          {remains !== undefined && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Còn lại</p>
              <p className="text-sm font-semibold text-gray-800">{remains.toLocaleString("vi-VN")}</p>
            </div>
          )}
          {charge !== undefined && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Chi phí</p>
              <p className="text-sm font-semibold text-gray-800">{String(charge)}</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Refresh */}
      <button
        onClick={() => void refresh()}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        {loading ? "Đang tải..." : "Làm mới trạng thái"}
      </button>
    </div>
  );
}
