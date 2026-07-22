"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";

interface Props {
  productIds: string[];
}

export default function BulkVisibilityButtons({ productIds }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState<"hide" | "show" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = productIds.length;

  async function applyVisibility(isActive: boolean) {
    if (count === 0) return;
    const action = isActive ? "hiện" : "ẩn";
    if (!confirm(`Xác nhận ${action} toàn bộ ${count} sản phẩm đang hiển thị trên trang này?`)) return;

    setError(null);
    setLoading(isActive ? "show" : "hide");
    try {
      const res = await fetch("/api/products/mmo/bulk-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: productIds, isActive }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Lỗi không xác định");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setLoading(null);
    }
  }

  const disabled = count === 0 || loading !== null || isPending;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-[#EF4444]">{error}</span>}
      <button
        type="button"
        onClick={() => { void applyVisibility(false); }}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#EF4444] bg-[#EF4444]/8 hover:bg-[#EF4444]/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        <EyeOff size={14} strokeWidth={2} />
        {loading === "hide" ? "Đang ẩn..." : "Ẩn toàn bộ trang"}
      </button>
      <button
        type="button"
        onClick={() => { void applyVisibility(true); }}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#10B981] bg-[#10B981]/8 hover:bg-[#10B981]/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        <Eye size={14} strokeWidth={2} />
        {loading === "show" ? "Đang hiện..." : "Hiện toàn bộ trang"}
      </button>
    </div>
  );
}
