"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Info, AlertTriangle } from "lucide-react";

interface Props {
  orderId: string;
  itemName: string;
  /** Đã có thread chưa — nếu rồi thì bấm là vào thẳng chat, không cần popup. */
  hasThread: boolean;
}

const REASONS = [
  "Liên hệ gian hàng để nhận sản phẩm",
  "Tôi chưa nhận được sản phẩm",
  "Sản phẩm không sử dụng được",
  "Cần hướng dẫn sử dụng",
  "Khác",
];

export default function PartnerSupportButton({ orderId, itemName, hasThread }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");

  async function openThread(subject: string, content: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/partner-support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, subject, content }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Không mở được cuộc trò chuyện."); return; }
      router.push(`/ho-tro-doi-tac/${json.data.id}`);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (hasThread) {
      // Đã có thread — mở lại bằng subject/content mặc định (API trả thread cũ)
      void openThread("Hỗ trợ đơn hàng", "Tiếp tục trao đổi về đơn hàng.");
      return;
    }
    setOpen(true);
  }

  async function handleSubmit() {
    if (!reason) { setError("Vui lòng chọn lý do."); return; }
    if (detail.trim().length < 5) { setError("Mô tả tối thiểu 5 ký tự."); return; }
    await openThread(reason, detail.trim());
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0d9488]/10 border border-[#0d9488]/30 text-[#0d9488] text-[11px] font-medium hover:bg-[#0d9488]/20 disabled:opacity-60 transition-colors whitespace-nowrap"
        title="Chat trực tiếp với gian hàng đối tác"
      >
        <MessageCircle size={11} /> Chat gian hàng
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0d9488]/10 flex items-center justify-center">
                  <MessageCircle size={15} className="text-[#0d9488]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Chat với gian hàng</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-65">{itemName}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="flex gap-2.5 rounded-xl bg-teal-50 border border-teal-200 px-3.5 py-3">
                <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Gian hàng đối tác sẽ phản hồi và hỗ trợ bạn về đơn hàng này.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lý do <span className="text-red-500">*</span></label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">— Chọn lý do —</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mô tả <span className="text-red-500">*</span></label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Mô tả vấn đề của bạn (tối thiểu 5 ký tự)..."
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button onClick={() => setOpen(false)} className="py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0d9488] text-white text-sm font-bold hover:bg-[#0f766e] disabled:opacity-60 transition-colors"
              >
                <Send size={14} />
                {loading ? "Đang mở..." : "Bắt đầu chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !open && <p className="text-[11px] text-red-500 text-center mt-1">{error}</p>}
    </>
  );
}
