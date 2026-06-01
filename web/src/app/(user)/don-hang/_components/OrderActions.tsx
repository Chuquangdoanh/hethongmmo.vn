"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Copy, Check, Flag, CheckCircle,
  X, Info, AlertTriangle, Send,
} from "lucide-react";

interface Props {
  orderId: string;
  itemName: string;
  isDone: boolean;
  hasComplaint: boolean;
  allowComplaint: boolean;
  orderCreatedAt: string;
}

async function fetchDelivered(orderId: string): Promise<string | null> {
  const res = await fetch(`/api/orders/${orderId}`);
  const json = await res.json() as { success: boolean; data?: { deliveredContent?: string } };
  return json.data?.deliveredContent ?? null;
}

const COMPLAINT_REASONS = [
  "Không nhận được hàng",
  "Bị trừ tiền nhưng không có đơn hàng",
  "Nội dung không đúng mô tả",
  "Sản phẩm không sử dụng được",
  "Khác",
];

function ComplaintPopup({
  orderId, itemName, onClose, onSuccess,
}: {
  orderId: string;
  itemName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!reason) { setError("Vui lòng chọn lý do khiếu nại."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: reason, content: detail || reason, orderId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Gửi khiếu nại thất bại."); return; }
      onSuccess();
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <Flag size={15} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gửi khiếu nại</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-65">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Đơn hàng của bạn sẽ được đội ngũ xem xét và xét duyệt trong thời gian sớm nhất.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Lý do khiếu nại <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">— Chọn lý do —</option>
              {COMPLAINT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mô tả chi tiết vấn đề gặp phải
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Nhập mô tả chi tiết vấn đề bạn gặp phải..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{detail.length}/2000</p>
          </div>

          {error && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            {submitting ? "Đang gửi..." : "Gửi khiếu nại"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderActions({ orderId, itemName, isDone, hasComplaint, allowComplaint, orderCreatedAt }: Props) {
  const [isWithin24h, setIsWithin24h] = useState(false);
  useEffect(() => {
    setIsWithin24h(Date.now() - new Date(orderCreatedAt).getTime() < 24 * 60 * 60 * 1000);
  }, [orderCreatedAt]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [localHasComplaint, setLocalHasComplaint] = useState(hasComplaint);

  async function handleDownload() {
    setBusy(true);
    try {
      const content = await fetchDelivered(orderId);
      if (!content) return;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${itemName.replace(/[/\\?%*:|"<>]/g, "-")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    setBusy(true);
    try {
      const content = await fetchDelivered(orderId);
      if (!content) return;
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  function handleComplaintSuccess() {
    setShowPopup(false);
    setLocalHasComplaint(true);
    router.refresh();
  }

  return (
    <>
      {showPopup && (
        <ComplaintPopup
          orderId={orderId}
          itemName={itemName}
          onClose={() => setShowPopup(false)}
          onSuccess={handleComplaintSuccess}
        />
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {isDone && (
          <>
            <button
              onClick={handleDownload}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Download size={11} /> Tải TXT
            </button>
            <button
              onClick={handleCopy}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {copied
                ? <><Check size={11} className="text-emerald-600" /> <span className="text-emerald-600">Đã sao chép</span></>
                : <><Copy size={11} /> Sao chép</>
              }
            </button>
          </>
        )}
        {allowComplaint && (
          localHasComplaint ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium whitespace-nowrap">
              <CheckCircle size={11} /> Đã khiếu nại
            </span>
          ) : isWithin24h ? (
            <button
              onClick={() => setShowPopup(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <Flag size={11} /> Khiếu nại
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-medium whitespace-nowrap" title="Chỉ có thể khiếu nại trong 24 giờ đầu sau khi mua">
              <Flag size={11} /> Hết hạn KN
            </span>
          )
        )}
      </div>
    </>
  );
}
