"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

const BANKS = [
  "Vietcombank",
  "MBBank",
  "Techcombank",
  "VietinBank",
  "Agribank",
  "VPBank",
  "BIDV",
  "HDBank",
  "SeaBank",
  "Sacombank",
  "OCB",
  "VIB",
  "SHB",
  "LPBank",
];

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
  currentBankName:          string | null;
  currentBankAccountNumber: string | null;
  currentBankAccountHolder: string | null;
  recentRequests:           BankRequest[];
  apiEndpoint:              string;
}

export default function BankChangeRequestForm({
  currentBankName,
  currentBankAccountNumber,
  currentBankAccountHolder,
  recentRequests,
  apiEndpoint,
}: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    bankName:          "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  });

  const pendingRequest = recentRequests.find((r) => r.status === "PENDING");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gửi yêu cầu thất bại");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Thông tin ngân hàng</h2>
        </div>
        {!pendingRequest && (
          <button
            onClick={() => { setOpen((v) => !v); setSuccess(false); setError(""); }}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            {open ? "Đóng" : "Yêu cầu đổi"}
          </button>
        )}
      </div>

      {/* Thông tin hiện tại */}
      <div className="px-5 py-4">
        {currentBankName ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Ngân hàng</p>
              <p className="font-semibold text-gray-800">{currentBankName}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Số tài khoản</p>
              <p className="font-mono font-bold text-gray-800 tracking-wider">{currentBankAccountNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Chủ tài khoản</p>
              <p className="font-semibold text-gray-800 uppercase">{currentBankAccountHolder}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Chưa có thông tin ngân hàng. Gửi yêu cầu để cập nhật.</p>
        )}
      </div>

      {/* Yêu cầu đang chờ */}
      {pendingRequest && (
        <div className="mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
          <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Đang chờ admin duyệt</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Yêu cầu đổi sang <span className="font-medium">{pendingRequest.bankName}</span> — <span className="font-mono">{pendingRequest.bankAccountNumber}</span> gửi lúc {formatDate(pendingRequest.createdAt)}.
            </p>
          </div>
        </div>
      )}

      {/* Form yêu cầu đổi */}
      {open && !pendingRequest && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {success ? (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">Gửi yêu cầu thành công! Admin sẽ xem xét và phản hồi sớm.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs text-gray-500">Điền thông tin ngân hàng mới. Admin sẽ xác minh và cập nhật sau 1-2 ngày làm việc.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Ngân hàng</label>
                  <select
                    required
                    value={form.bankName}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Số tài khoản</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value.replace(/\D/g, "") }))}
                    placeholder="VD: 1234567890"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Chủ tài khoản</label>
                  <input
                    required
                    type="text"
                    value={form.bankAccountHolder}
                    onChange={(e) => setForm((f) => ({ ...f, bankAccountHolder: e.target.value.toUpperCase() }))}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Lịch sử các yêu cầu gần đây */}
      {recentRequests.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Lịch sử yêu cầu</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="shrink-0">
                  {r.status === "APPROVED" && <CheckCircle size={14} className="text-emerald-500" />}
                  {r.status === "PENDING"  && <Clock       size={14} className="text-amber-500"   />}
                  {r.status === "REJECTED" && <XCircle     size={14} className="text-red-400"     />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">
                    {r.bankName} — <span className="font-mono">{r.bankAccountNumber}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatDate(r.createdAt)}
                    {r.rejectReason && <span className="text-red-400"> · Lý do: {r.rejectReason}</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? "text-gray-500"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
