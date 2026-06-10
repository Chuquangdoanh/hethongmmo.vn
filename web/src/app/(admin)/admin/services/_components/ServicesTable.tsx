"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatVnd } from "@/lib/utils/format";

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  price: number;
  isActive: boolean;
  isFeatured: boolean;
  thumbnail: string | null;
  successRate: number;
  processingTime: string | null;
}

interface Props {
  services: ServiceRow[];
  total: number;
  category?: string;
  q?: string;
}

export default function ServicesTable({ services, total, category, q }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const allIds = services.map((s) => s.id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const isIndeterminate = !isAllSelected && allIds.some((id) => selected.has(id));

  function toggleAll() {
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: "delete" | "hide" | "show") {
    if (selected.size === 0) return;

    const confirmMsg =
      action === "delete"
        ? `Xóa ${selected.size} dịch vụ đã chọn? Hành động này không thể hoàn tác.`
        : action === "hide"
          ? `Ẩn ${selected.size} dịch vụ đã chọn?`
          : `Hiện ${selected.size} dịch vụ đã chọn?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/services/bulk", { credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids: Array.from(selected) }),
        });
        const json = (await res.json()) as { success: boolean; message?: string; error?: string };
        if (json.success) {
          setFeedback({ ok: true, msg: json.message ?? "Thành công" });
          setSelected(new Set());
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Table header bar */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">
          {total.toLocaleString("vi-VN")} dịch vụ
          {category ? ` · ${category}` : ""}
          {q ? ` · "${q}"` : ""}
        </span>

        {/* Bulk action toolbar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Đã chọn {selected.size}</span>
            <button
              onClick={() => bulkAction("hide")}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-50"
            >
              Ẩn
            </button>
            <button
              onClick={() => bulkAction("show")}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors disabled:opacity-50"
            >
              Hiện
            </button>
            <button
              onClick={() => bulkAction("delete")}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 transition-colors disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        )}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
            feedback.ok
              ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
              : "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dịch vụ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh mục</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tỷ lệ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-sm font-medium text-gray-600">Không tìm thấy dịch vụ</p>
                  <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </td>
              </tr>
            )}
            {services.map((svc) => (
              <tr
                key={svc.id}
                className={`hover:bg-gray-50 transition-colors ${selected.has(svc.id) ? "bg-[#7C3AED]/4" : ""}`}
              >
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(svc.id)}
                    onChange={() => toggleOne(svc.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {svc.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={svc.thumbnail} alt={svc.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-sm font-bold shrink-0">
                        {svc.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{svc.name}</p>
                      {svc.processingTime && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{svc.processingTime}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {svc.category ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1d4ed8]">
                      {svc.category}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-sm font-bold text-[#A855F7]">
                  {formatVnd(svc.price)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`text-xs font-bold ${svc.successRate >= 90 ? "text-[#10B981]" : svc.successRate >= 70 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>
                    {svc.successRate}%
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {svc.isActive
                      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]">Hoạt động</span>
                      : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Ẩn</span>
                    }
                    {svc.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B]">Nổi bật</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/admin/services/${svc.id}/sua`}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 transition-colors"
                  >
                    Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
