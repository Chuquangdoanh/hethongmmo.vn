"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Copy, Check, Flag, CheckCircle,
  X, Info, AlertTriangle, Send, Eye,
} from "lucide-react";
import SafeHtml from "@/components/shared/SafeHtml";
import { FaReact } from "react-icons/fa";


interface Props {
  orderId: string;
  itemName: string;
  orderType: string;
  isDone: boolean;
  hasComplaint: boolean;
  allowComplaint: boolean;
  orderCreatedAt: string;
}

interface DeliveredData {
  deliveredContent: string | null;
  tutTrickDocs:     string | null;
  orderCode:        string;
  kfbData:          Record<string, unknown> | null;
  finalPrice:       number | null;
}

async function fetchDeliveredData(orderId: string): Promise<DeliveredData> {
  const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
  const json = await res.json() as {
    success: boolean;
    data?: {
      deliveredContent?: string;
      tutTrickDocs?: string;
      orderCode?: string;
      kfbData?: Record<string, unknown> | null;
      finalPrice?: number | null;
    };
  };
  return {
    deliveredContent: json.data?.deliveredContent ?? null,
    tutTrickDocs:     json.data?.tutTrickDocs ?? null,
    orderCode:        json.data?.orderCode ?? orderId.slice(0, 8).toUpperCase(),
    kfbData:          json.data?.kfbData ?? null,
    finalPrice:       json.data?.finalPrice ?? null,
  };
}

const COMPLAINT_REASONS = [
  "Liên hệ Shop để nhận sản phẩm",
  "Tôi chưa nhận được sản phẩm từ Shop",
  "Sản phẩm không sử dụng được",
  "Tôi chưa biết cách sử dụng, Cần hướng dẫn chi tiết !",
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
    if (detail.trim().length < 20) { setError("Mô tả chi tiết phải có ít nhất 20 ký tự."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/complaints", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: reason, content: detail.trim(), orderId }),
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
              Mô tả chi tiết vấn đề gặp phải <span className="text-red-500">*</span>
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Mô tả cụ thể vấn đề bạn gặp phải (tối thiểu 20 ký tự)..."
              rows={4}
              maxLength={2000}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                detail.length > 0 && detail.trim().length < 20
                  ? "border-red-300 focus:ring-red-400 bg-red-50"
                  : "border-gray-200 focus:ring-blue-500"
              }`}
            />
            <div className="flex items-center justify-between mt-0.5">
              {detail.trim().length > 0 && detail.trim().length < 20 ? (
                <p className="text-[10px] text-red-500">
                  Cần thêm {20 - detail.trim().length} ký tự nữa
                </p>
              ) : detail.trim().length >= 20 ? (
                <p className="text-[10px] text-emerald-600">✓ Đủ yêu cầu</p>
              ) : (
                <p className="text-[10px] text-gray-400">Tối thiểu 20 ký tự</p>
              )}
              <p className="text-[10px] text-gray-400">{detail.length}/2000</p>
            </div>
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

function DetailModal({ orderId, itemName, orderType, onClose }: {
  orderId: string;
  itemName: string;
  orderType: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<DeliveredData | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchDeliveredData(orderId).then((d) => { setData(d); setLoadingContent(false); });
  }, [orderId]);

  const content    = data?.deliveredContent ?? null;
  const docs       = data?.tutTrickDocs ?? null;
  const orderCode  = data?.orderCode ?? "";
  const kfbData    = data?.kfbData ?? null;
  const isTutTrick = orderType === "TUTTRICK";
  const isKfb      = orderType === "KHUONGFB_PRODUCT";
  const isUrl      = !!content && (content.startsWith("http://") || content.startsWith("https://"));

  const kfbRows = (() => {
    if (!kfbData) return [];
    const entries = Object.entries(kfbData).filter(([, v]) => v != null && v !== "");
    const numericKeys = entries.filter(([k]) => /^\d+$/.test(k)).length;
    return entries.map(([k, v]) => ({
      label: /^\d+$/.test(k) ? (numericKeys > 1 ? `Chi tiết đơn hàng ${Number(k) + 1}` : "Chi tiết đơn hàng") : k,
      value: String(v),
    }));
  })();

  const kfbItems: { label: string; value: string }[] = isKfb ? [...kfbRows] : [];

  const hasAnyContent = !!content || !!docs || kfbRows.length > 0;

  function stripHtml(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.innerText ?? div.textContent ?? "").trim();
  }

  function buildFullText(): string {
    const parts: string[] = [`=== ĐƠN HÀNG: ${orderCode} ===`];
    if (content) parts.push(`[LINK NHẬN HÀNG]\n${content}`);
    if (docs) parts.push(`[NỘI DUNG HƯỚNG DẪN]\n${stripHtml(docs)}`);
    return parts.join("\n\n");
  }

  function handleDownload() {
    const text = isTutTrick ? buildFullText() : (content ?? "");
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${itemName.replace(/[/\\?%*:|"<>]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyContent() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(buildFullText());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  async function copyKfbItem(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <FaReact size={14} className="text-emerald-500" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Nội dung nhận hàng</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-3">
          {loadingContent ? (
            <div className="space-y-3">
              <div className="h-6 w-32 rounded bg-gray-100 animate-pulse" />
              <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            </div>
          ) : !hasAnyContent ? (
            <p className="text-sm text-gray-500 text-center py-4">Đơn đang được xử lý — nội dung sẽ hiển thị sau khi hoàn thành.</p>
          ) : isKfb ? (
            /* ── KHUONGFB: popup card-style, giống DeliveryModal sau mua ── */
            <>
              {kfbItems.map((item, idx) => (
                <div key={idx} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{item.label}</span>
                    <button
                      onClick={() => void copyKfbItem(item.value, idx)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                    >
                      {copiedIdx === idx
                        ? <><Check size={11} className="text-emerald-500" /> Đã chép</>
                        : <><Copy size={11} /> Sao chép</>}
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-mono text-gray-900 break-all leading-relaxed whitespace-pre-wrap">{item.value}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Nội dung sau giao — MMO / Seller */}
              {content && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    {isUrl ? "Link hướng dẫn" : " Chi tiết đơn hàng"}
                  </p>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="min-h-22 max-h-48 overflow-y-auto px-4 py-3 flex items-start gap-2">
                      {isUrl ? (
                        <a
                          href={content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-blue-600 hover:underline break-all font-medium leading-relaxed"
                        >
                          {content}
                        </a>
                      ) : (
                        <p className="flex-1 text-sm font-mono text-gray-900 break-all leading-relaxed whitespace-pre-wrap select-all">
                          {content}
                        </p>
                      )}
                      <button
                        onClick={handleCopyContent}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-medium transition-colors whitespace-nowrap"
                      >
                        {copied ? <><Check size={10} className="text-emerald-500" /> Đã chép</> : <><Copy size={10} /> Sao chép</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Nội dung docs — TutTrick */}
              {isTutTrick && docs && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">📄 Nội dung hướng dẫn</p>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="max-h-64 overflow-y-auto px-4 py-3">
                      <SafeHtml
                        html={docs}
                        className="prose prose-sm max-w-none text-gray-900 text-sm [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nút hành động — không hiển thị cho KFB (mỗi card đã có copy riêng) */}
        {hasAnyContent && !loadingContent && !isKfb && (
          <div className="px-5 pb-5 pt-1 flex gap-2 shrink-0 border-t border-gray-100">
            {isTutTrick && (content || docs) ? (
              <>
                <button
                  onClick={handleCopyAll}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                >
                  {copiedAll ? <><Check size={13} className="text-emerald-500" /> Đã sao chép</> : <><Copy size={13} /> Sao chép tất cả</>}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                >
                  <Download size={13} /> Tải file .txt
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyContent}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                >
                  {copied ? <><Check size={13} className="text-emerald-500" /> Đã sao chép</> : <><Copy size={13} /> Sao chép</>}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                >
                  <Download size={13} /> Tải file .txt
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportNoticeButton() {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => { setShow(true); setTimeout(() => setShow(false), 3000); }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
      >
        <Flag size={11} /> Khiếu nại
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-lg bg-red-600 text-white text-[11px] font-semibold px-3 py-1.5 shadow-lg pointer-events-none">
          Liên hệ bộ phận hỗ trợ
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-red-600" />
        </div>
      )}
    </div>
  );
}

export default function OrderActions({ orderId, itemName, orderType, isDone, hasComplaint, allowComplaint, orderCreatedAt }: Props) {
  const [isWithin2h, setIsWithin2h] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsWithin2h(Date.now() - new Date(orderCreatedAt).getTime() < 2 * 60 * 60 * 1000);
  }, [orderCreatedAt]);
  const router = useRouter();
  const [showDetail, setShowDetail] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [localHasComplaint, setLocalHasComplaint] = useState(hasComplaint);

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
      {showDetail && (
        <DetailModal
          orderId={orderId}
          itemName={itemName}
          orderType={orderType}
          onClose={() => setShowDetail(false)}
        />
      )}

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {isDone && (
          <button
            onClick={() => setShowDetail(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Eye size={11} /> Xem chi tiết
          </button>
        )}
        {allowComplaint && (
          orderType !== "SELLER_PRODUCT" ? (
            isWithin2h ? (
              <SupportNoticeButton />
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-medium whitespace-nowrap" title="Chỉ có thể khiếu nại trong 2 giờ đầu sau khi mua">
                <Flag size={11} /> Hết hạn KN
              </span>
            )
          ) : localHasComplaint ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium whitespace-nowrap">
              <CheckCircle size={11} /> Đã khiếu nại
            </span>
          ) : isWithin2h ? (
            <button
              onClick={() => setShowPopup(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <Flag size={11} /> Khiếu nại
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-medium whitespace-nowrap" title="Chỉ có thể khiếu nại trong 2 giờ đầu sau khi mua">
              <Flag size={11} /> Hết hạn KN
            </span>
          )
        )}
      </div>
    </>
  );
}
