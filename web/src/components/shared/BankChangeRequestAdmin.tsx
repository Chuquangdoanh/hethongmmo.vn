"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface BankRequest {
  id: string;
  status: string;
  rejectReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

interface Props {
  requests: BankRequest[];
}

export default function BankChangeRequestAdmin({ requests }: Props) {
  const router  = useRouter();
  const [loading, setLoading]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showReject, setShowReject]  = useState<Record<string, boolean>>({});
  const [error, setError]           = useState<Record<string, string>>({});

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  async function handleAction(id: string, action: "approve" | "reject") {
    setError((e) => ({ ...e, [id]: "" }));
    const reason = rejectReason[id] ?? "";
    if (action === "reject" && !reason.trim()) {
      setError((e) => ({ ...e, [id]: "Vui lòng nhập lý do từ chối" }));
      return;
    }
    setLoading(id + action);
    try {
      const body = action === "approve"
        ? { action }
        : { action, rejectReason: reason };
      const res = await fetch(`/api/admin/bank-change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError((e) => ({ ...e, [id]: json.error ?? "Thao tác thất bại" }));
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (requests.length === 0) return null;

  const STATUS_LABEL: Record<string, string> = {
    PENDING:  "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
  };
  const STATUS_COLOR: Record<string, string> = {
    PENDING:  "text-amber-600 bg-amber-50 border-amber-200",
    APPROVED: "text-emerald-600 bg-emerald-50 border-emerald-200",
    REJECTED: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Building2 size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Yêu cầu đổi thông tin ngân hàng</h2>
        {pending.length > 0 && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
            {pending.length} chờ duyệt
          </span>
        )}
      </div>

      {/* Pending requests */}
      {pending.map((r) => (
        <div key={r.id} className="border-b border-amber-100 bg-amber-50 px-5 py-4 space-y-3">
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 mb-2">Thông tin ngân hàng mới (chờ duyệt)</p>
              <div className="grid grid-cols-3 gap-3 bg-white rounded-lg border border-amber-200 p-3">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Ngân hàng</p>
                  <p className="text-sm font-semibold text-gray-800">{r.bankName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Số tài khoản</p>
                  <p className="text-sm font-mono font-bold text-gray-800 tracking-wider">{r.bankAccountNumber ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Chủ tài khoản</p>
                  <p className="text-sm font-semibold text-gray-800 uppercase">{r.bankAccountHolder ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {error[r.id] && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <AlertTriangle size={12} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{error[r.id]}</p>
            </div>
          )}

          {showReject[r.id] && (
            <div className="space-y-2">
              <textarea
                rows={2}
                value={rejectReason[r.id] ?? ""}
                onChange={(e) => setRejectReason((p) => ({ ...p, [r.id]: e.target.value }))}
                placeholder="Lý do từ chối..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction(r.id, "approve")}
              disabled={loading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              <CheckCircle size={12} />
              {loading === r.id + "approve" ? "Đang duyệt..." : "Duyệt"}
            </button>
            {!showReject[r.id] ? (
              <button
                onClick={() => setShowReject((p) => ({ ...p, [r.id]: true }))}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
              >
                <XCircle size={12} />
                Từ chối
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction(r.id, "reject")}
                  disabled={loading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {loading === r.id + "reject" ? "Đang từ chối..." : "Xác nhận từ chối"}
                </button>
                <button
                  onClick={() => setShowReject((p) => ({ ...p, [r.id]: false }))}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* History */}
      {history.length > 0 && (
        <div className="divide-y divide-gray-100">
          {history.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="shrink-0">
                {r.status === "APPROVED" && <CheckCircle size={14} className="text-emerald-500" />}
                {r.status === "REJECTED" && <XCircle     size={14} className="text-red-400"     />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">
                  {r.bankName} — <span className="font-mono">{r.bankAccountNumber}</span> — {r.bankAccountHolder}
                </p>
                {r.rejectReason && (
                  <p className="text-[10px] text-red-400">Lý do: {r.rejectReason}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? "text-gray-500"}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
