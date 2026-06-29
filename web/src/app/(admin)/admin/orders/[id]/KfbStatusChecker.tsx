"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import CopyButton from "@/components/shared/CopyButton";

interface KfbData {
  transId: string;
  orderStatus: string;
  kfb: {
    status: string;
    data?: {
      trans_id?: string;
      status?: string;
      remains?: number;
      start_count?: number;
      charge?: string | number;
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

export default function KfbStatusChecker({ orderId, transId }: { orderId: string; transId: string }) {
  const [kfbData, setKfbData]   = useState<KfbData | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  async function checkStatus() {
    setChecking(true);
    setErr(null);
    try {
      const res  = await fetch(`/api/orders/${orderId}/kfb-status`, { credentials: "include" });
      const json = await res.json() as { data?: KfbData; error?: string };
      if (!res.ok || !json.data) {
        setErr(json.error ?? "Không thể tra cứu trạng thái");
        return;
      }
      setKfbData(json.data);
    } catch {
      setErr("Lỗi kết nối");
    } finally {
      setChecking(false);
    }
  }

  const kfbStatus = kfbData?.kfb?.data?.status ?? null;
  const kfbLabel  = kfbStatus ? (KFB_STATUS_LABELS[kfbStatus.toLowerCase()] ?? kfbStatus) : null;
  const remains   = kfbData?.kfb?.data?.remains;
  const charge    = kfbData?.kfb?.data?.charge;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
        <span className="text-base shrink-0">🔗</span>
        <span className="flex-1 text-sm font-mono text-gray-800 break-all select-all">{transId}</span>
        <CopyButton text={transId} />
      </div>

      {kfbData && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
          {kfbLabel && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Trạng thái Khuongfb</span>
              <span className="font-semibold text-gray-800">{kfbLabel}</span>
            </div>
          )}
          {remains !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Còn lại</span>
              <span className="font-semibold text-gray-800">{remains.toLocaleString("vi-VN")}</span>
            </div>
          )}
          {charge !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Chi phí</span>
              <span className="font-semibold text-gray-800">{charge}</span>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-xs text-red-500">{err}</p>}

      <button
        onClick={checkStatus}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
        {checking ? "Đang kiểm tra..." : "Kiểm tra trạng thái Khuongfb"}
      </button>
    </div>
  );
}
