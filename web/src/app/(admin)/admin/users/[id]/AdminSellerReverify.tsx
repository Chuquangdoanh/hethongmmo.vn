"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import ImageZoom from "@/app/(admin)/admin/sellers/[id]/ImageZoom";

interface ReverifyRequest {
  id: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  cccdImageUrl: string;
  portraitImageUrl: string;
}

interface Props {
  userId: string;
  sellerReverifyRequired: boolean;
  sellerReverifyApproved: boolean;
  requests: ReverifyRequest[];
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

export default function AdminSellerReverify({ userId, sellerReverifyRequired, sellerReverifyApproved, requests }: Props) {
  const router = useRouter();
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  async function toggleRequired(action: "request_seller_reverify" | "cancel_seller_reverify") {
    setToggleLoading(true);
    setToggleError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setToggleError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.refresh();
    } finally {
      setToggleLoading(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setError((e) => ({ ...e, [id]: "" }));
    const reason = rejectReason[id] ?? "";
    if (action === "reject" && !reason.trim()) {
      setError((e) => ({ ...e, [id]: "Vui lòng nhập lý do từ chối" }));
      return;
    }
    setLoading(id + action);
    try {
      const body = action === "approve" ? { action } : { action, rejectReason: reason };
      const res = await fetch(`/api/admin/reverify-requests/${id}`, {
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

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-500 font-medium">
          Xác minh lại danh tính:{" "}
          <span className={`font-semibold ${sellerReverifyApproved ? "text-emerald-600" : sellerReverifyRequired ? "text-red-600" : "text-gray-500"}`}>
            {sellerReverifyApproved ? "Đã xác minh" : sellerReverifyRequired ? "Đang yêu cầu — chờ seller nộp" : "Không yêu cầu"}
          </span>
        </p>
        {pending.length === 0 && (
          <div className="flex items-center gap-2">
            {/* Admin có thể bấm xác thực lại bất cứ lúc nào, kể cả khi đã từng được duyệt trước đó */}
            <button
              onClick={() => { void toggleRequired("request_seller_reverify"); }}
              disabled={toggleLoading}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {toggleLoading ? "..." : "Xác thực lại"}
            </button>
            {sellerReverifyRequired && !sellerReverifyApproved && (
              <button
                onClick={() => { void toggleRequired("cancel_seller_reverify"); }}
                disabled={toggleLoading}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 text-xs font-semibold hover:border-gray-300 disabled:opacity-60 transition-colors"
              >
                {toggleLoading ? "..." : "Hủy yêu cầu"}
              </button>
            )}
          </div>
        )}
      </div>
      {toggleError && <p className="text-xs text-[#EF4444]">{toggleError}</p>}

      {/* Pending requests */}
      {pending.map((r) => (
        <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 mb-2">Ảnh xác minh lại (chờ duyệt)</p>
              <div className="flex gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">CCCD</p>
                  <ImageZoom src={r.cccdImageUrl} alt="CCCD" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Ảnh chân dung</p>
                  <ImageZoom src={r.portraitImageUrl} alt="Ảnh chân dung" />
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
            <textarea
              rows={2}
              value={rejectReason[r.id] ?? ""}
              onChange={(e) => setRejectReason((p) => ({ ...p, [r.id]: e.target.value }))}
              placeholder="Lý do từ chối..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => { void handleAction(r.id, "approve"); }}
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
                  onClick={() => { void handleAction(r.id, "reject"); }}
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
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {history.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="shrink-0">
                {r.status === "APPROVED" && <CheckCircle size={14} className="text-emerald-500" />}
                {r.status === "REJECTED" && <XCircle     size={14} className="text-red-400"     />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">Nộp lúc {new Date(r.createdAt).toLocaleDateString("vi-VN")}</p>
                {r.rejectReason && <p className="text-[10px] text-red-400">Lý do: {r.rejectReason}</p>}
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
