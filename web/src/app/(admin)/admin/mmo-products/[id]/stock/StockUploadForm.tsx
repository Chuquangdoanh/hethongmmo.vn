"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
}

export default function StockUploadForm({ productId }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; totalAvailable: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const items = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (items.length === 0) {
      setError("Không có dữ liệu hợp lệ.");
      return;
    }
    if (items.length > 500) {
      setError("Tối đa 500 items mỗi lần.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/mmo/${productId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json() as {
        success: boolean;
        error?: string;
        data?: { inserted: number; skipped: number; totalAvailable: number };
      };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Nhập kho thất bại.");
        return;
      }
      setResult(json.data!);
      setText("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Nhập kho mới</h2>
      <p className="text-xs text-gray-500">Mỗi dòng = 1 item (tài khoản/mã). Tối đa 500 items/lần. Dữ liệu sẽ được mã hóa AES-GCM.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"user1:pass1\nuser2:pass2\n..."}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none resize-none font-mono"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {text.split("\n").filter((l) => l.trim()).length} dòng
          </p>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="px-4 py-2 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-green-500 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang nhập..." : "Nhập kho"}
          </button>
        </div>
      </form>

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      {result && (
        <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
          <p className="text-xs text-[#10B981] font-medium">
            Thành công: +{result.inserted} items · Bỏ qua trùng: {result.skipped} · Tổng có sẵn: {result.totalAvailable}
          </p>
        </div>
      )}
    </div>
  );
}
