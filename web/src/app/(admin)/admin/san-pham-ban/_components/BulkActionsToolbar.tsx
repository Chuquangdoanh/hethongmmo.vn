"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBulkSelection } from "./BulkSelectionContext";

type BulkAction = "RESTRICT" | "REJECT" | "OPEN";

export default function BulkActionsToolbar() {
  const { selected, clear } = useBulkSelection();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  if (selected.size === 0) return null;

  function runAction(action: BulkAction, actionReason?: string) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/seller-products/bulk", {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids: Array.from(selected), reason: actionReason }),
        });
        const json = (await res.json()) as { success?: boolean; message?: string; error?: string };
        if (res.ok && json.success) {
          setFeedback({ ok: true, msg: json.message ?? "Thành công" });
          setShowReject(false);
          setReason("");
          clear();
          router.refresh();
        } else {
          setFeedback({ ok: false, msg: json.error ?? "Có lỗi xảy ra" });
        }
      } catch {
        setFeedback({ ok: false, msg: "Lỗi kết nối" });
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleRestrictAll() {
    if (!confirm(`Hạn chế ${selected.size} sản phẩm đã chọn? Sản phẩm sẽ ẩn khỏi gian hàng.`)) return;
    runAction("RESTRICT");
  }

  function handleOpenAll() {
    if (!confirm(`Mở lại ${selected.size} sản phẩm đã chọn? Sản phẩm sẽ hiển thị lại trên gian hàng.`)) return;
    runAction("OPEN");
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-blue-50/50 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Đã chọn {selected.size} sản phẩm</span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            type="button"
            onClick={handleOpenAll}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            ✓ Mở tất cả
          </button>
          <button
            type="button"
            onClick={handleRestrictAll}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            🚫 Hạn chế tất cả
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            ✕ Từ chối tất cả
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`mx-4 mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
            feedback.ok
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {showReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowReject(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-gray-800 mb-1">Từ chối {selected.size} sản phẩm</h3>
            <p className="text-xs text-gray-500 mb-4">Các sản phẩm này sẽ ẩn khỏi gian hàng.</p>
            <div className="mb-4">
              <label className="text-[11px] font-medium text-gray-500 block mb-1">Lý do từ chối</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Nội dung không phù hợp, thiếu thông tin bảo hành..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={() => runAction("REJECT", reason)}
                disabled={isPending || !reason.trim()}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
