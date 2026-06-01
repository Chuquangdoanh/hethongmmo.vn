"use client";

import { useState, useEffect } from "react";
import CopyButton from "@/components/shared/CopyButton";
import SafeHtml from "@/components/shared/SafeHtml";

interface Props {
  orderId: string;
  orderType?: string;
}

interface OrderData {
  deliveredContent?: string | null;
  tutTrickDocs?: string | null;
}

export default function DeliveredContentLoader({ orderId, orderType }: Props) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
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

  if (!content) {
    return <p className="text-xs text-gray-500">Không có nội dung giao hàng.</p>;
  }

  // TutTrick: content is a Google Drive link + optional docs
  if (orderType === "TUTTRICK") {
    const docs = data?.tutTrickDocs ?? null;
    return (
      <div className="space-y-4">
        {/* Drive link */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Link tài liệu Google Drive</p>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
            <span className="text-base shrink-0">📁</span>
            <a
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-medium"
            >
              {content}
            </a>
            <CopyButton text={content} />
          </div>
        </div>

        {/* Docs content */}
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
      </div>
    );
  }

  // Default: show as monospace code with copy button
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
      <code className="flex-1 text-xs text-gray-900 font-mono break-all whitespace-pre-wrap">{content}</code>
      <CopyButton text={content} />
    </div>
  );
}
