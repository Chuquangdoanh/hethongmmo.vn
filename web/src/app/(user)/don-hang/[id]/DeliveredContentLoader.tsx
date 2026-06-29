"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Download, XCircle, CheckCircle2 } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";
import CopyButton from "@/components/shared/CopyButton";
import SafeHtml from "@/components/shared/SafeHtml";

interface Props {
  orderId:     string;
  orderType?:  string;
  orderStatus?: string;
}

interface OrderData {
  deliveredContent?: string | null;
  tutTrickDocs?:     string | null;
  orderCode?:        string;
  externalOrderId?:  string | null;
  kfbData?:          Record<string, unknown> | null;
  finalPrice?:       number | null;
}

export default function DeliveredContentLoader({ orderId, orderType, orderStatus }: Props) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: OrderData }) => {
        setData(json.data ?? null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />;
  }

  const content = data?.deliveredContent ?? null;
  const orderCode = data?.orderCode ?? orderId.slice(0, 8).toUpperCase();

  if (orderType === "KHUONGFB_PRODUCT") {
    return (
      <KfbStatusBlock
        orderCode={orderCode}
        storedKfbData={data?.kfbData ?? null}
        finalPrice={data?.finalPrice ?? null}
        orderStatus={orderStatus}
      />
    );
  }

  // TutTrick: link + docs
  if (orderType === "TUTTRICK") {
    const docs = data?.tutTrickDocs ?? null;

    if (!content && !docs) {
      return <p className="text-xs text-gray-500">Không có nội dung giao hàng.</p>;
    }

    const isUrl = !!content && (content.startsWith("http://") || content.startsWith("https://"));

    function stripHtml(html: string): string {
      const div = document.createElement("div");
      div.innerHTML = html;
      return (div.innerText || div.textContent || "").trim();
    }

    function buildFullText(): string {
      const parts: string[] = [`=== ĐƠN HÀNG: ${orderCode} ===`];
      if (content) parts.push(`[LINK NHẬN HÀNG]\n${content}`);
      if (docs) parts.push(`[NỘI DUNG HƯỚNG DẪN]\n${stripHtml(docs)}`);
      return parts.join("\n\n");
    }

    async function handleCopyAll() {
      await navigator.clipboard.writeText(buildFullText());
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }

    function handleDownload() {
      const text = buildFullText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tuttrick-${orderCode}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return (
      <div className="space-y-4">
        {/* Link nhận hàng */}
        {content && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              {isUrl ? "Link nhận hàng" : "Nội dung nhận hàng"}
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
              <span className="text-base shrink-0">{isUrl ? "📁" : "🔑"}</span>
              {isUrl ? (
                <a
                  href={content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-medium"
                >
                  {content}
                </a>
              ) : (
                <span className="flex-1 text-sm text-gray-800 break-all font-medium select-all">
                  {content}
                </span>
              )}
              <CopyButton text={content} />
            </div>
          </div>
        )}

        {/* Docs */}
        {docs && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Hướng dẫn chi tiết</p>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <SafeHtml
                html={docs}
                className="prose prose-sm max-w-none text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              />
            </div>
          </div>
        )}

        {/* Sao chép tất cả + Tải .txt */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCopyAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
          >
            {copiedAll
              ? <><Check size={13} className="text-emerald-500" /> Đã sao chép</>
              : <><Copy size={13} /> Sao chép tất cả</>}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
          >
            <Download size={13} /> Tải file .txt
          </button>
        </div>
      </div>
    );
  }

  // Default: show as monospace code with copy button
  if (!content) {
    return <p className="text-xs text-gray-500">Không có nội dung giao hàng.</p>;
  }

  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
      <code className="flex-1 text-xs text-gray-900 font-mono break-all whitespace-pre-wrap">{content}</code>
      <CopyButton text={content} />
    </div>
  );
}

// ── KFB order content block ──────────────────────────────────────────────────

function KfbStatusBlock({
  orderCode, storedKfbData, finalPrice, orderStatus,
}: {
  orderCode:     string;
  storedKfbData: Record<string, unknown> | null;
  finalPrice:    number | null;
  orderStatus?:  string;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function copyItem(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  const kfbRows = (() => {
    if (!storedKfbData) return [];
    const entries = Object.entries(storedKfbData).filter(([, v]) => v != null && v !== "");
    const numericKeys = entries.filter(([k]) => /^\d+$/.test(k)).length;
    return entries.map(([k, v]) => ({
      label: /^\d+$/.test(k) ? (numericKeys > 1 ? `Chi tiết đơn hàng ${Number(k) + 1}` : "Chi tiết đơn hàng") : k,
      value: String(v),
    }));
  })();

  // REFUNDED: hiển thị block lỗi đỏ
  if (orderStatus === "REFUNDED") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700">Đặt hàng thất bại</p>
          <p className="text-xs text-red-600 mt-1 leading-relaxed">
            Kiểm tra lại tiền trong ví trước khi đặt hàng.
          </p>
        </div>
      </div>
    );
  }

  // DONE + không có kfbData: success message
  if (kfbRows.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-emerald-700">Giao hàng tự động!</p>
          <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
            Sản phẩm của bạn đã được giao thành công. Lưu thông tin bên dưới.
          </p>
        </div>
      </div>
    );
  }

  const items: { label: string; value: string }[] = [
    { label: "Mã đơn hàng", value: orderCode },
    ...kfbRows,
    ...(finalPrice != null ? [{ label: "Tổng tiền", value: formatVnd(finalPrice) }] : []),
  ];

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{item.label}</span>
            <button
              onClick={() => void copyItem(item.value, idx)}
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
    </div>
  );
}
