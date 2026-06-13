"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SubCategory {
  id: string;
  name: string;
}

interface Props {
  requestId: string;
  current: SubCategory[];
  available: SubCategory[];
}

export default function SellerCategoryManager({ requestId, current, available }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const notAdded = available.filter((a) => !current.some((c) => c.id === a.id));

  async function handleAdd() {
    if (!selectedId) return;
    setError(null);
    const res = await fetch(`/api/admin/sellers/${requestId}/sub-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subCategoryId: selectedId }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) { setError(json.error ?? "Lỗi không xác định"); return; }
    setSelectedId("");
    startTransition(() => router.refresh());
  }

  async function handleDelete(subId: string) {
    setError(null);
    const res = await fetch(`/api/admin/sellers/${requestId}/sub-categories/${subId}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) { setError(json.error ?? "Lỗi không xác định"); return; }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4">
      <p className="text-[10px] text-gray-500 mb-2">Danh mục con đăng ký</p>

      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
        {current.length === 0 && (
          <span className="text-xs text-gray-400 italic">Chưa có danh mục nào.</span>
        )}
        {current.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium px-2.5 py-0.5"
          >
            {cat.name}
            <button
              type="button"
              onClick={() => handleDelete(cat.id)}
              disabled={isPending}
              className="ml-0.5 leading-none hover:text-red-600 transition-colors disabled:opacity-40"
              title="Xóa danh mục này"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {notAdded.length > 0 && (
        <div className="flex gap-2 items-center">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-violet-400 focus:outline-none"
            disabled={isPending}
          >
            <option value="">-- Chọn danh mục --</option>
            {notAdded.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || isPending}
            className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            + Thêm
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
