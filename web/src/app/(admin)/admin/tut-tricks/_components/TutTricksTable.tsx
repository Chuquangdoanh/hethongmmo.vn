"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { r2Url } from "@/lib/utils/image-url";
import { formatVnd } from "@/lib/utils/format";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "X (Twitter)", ICLOUD: "iCloud", OTHER: "Khác",
};
const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK:  "https://svgl.app/library/facebook-icon.svg",
  TIKTOK:    "https://svgl.app/library/tiktok-icon-light.svg",
  GOOGLE:    "https://svgl.app/library/google.svg",
  INSTAGRAM: "https://svgl.app/library/instagram-icon.svg",
  YOUTUBE:   "https://svgl.app/library/youtube.svg",
  ICLOUD:    "https://svgl.app/library/icloud.svg",
  ZALO:      "https://svgl.app/library/zalo.svg",
  TELEGRAM:  "https://svgl.app/library/telegram.svg",
  TWITTER:   "https://svgl.app/library/x.svg",
};

interface TutTrickRow {
  id: string;
  name: string;
  thumbnail: string | null;
  platform: string;
  category: string;
  tier: string;
  price: number;
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
}

interface DbCategory { name: string; iconUrl: string | null }

interface Props {
  items: TutTrickRow[];
  total: number;
  platform?: string;
  category?: string;
  tier?: string;
  q?: string;
  dbCategories: DbCategory[];
  currentPage: number;
}

export default function TutTricksTable({ items, total, platform, category, tier, q, dbCategories, currentPage }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Icon lookup map from TutTrickCategory
  const categoryIconMap = Object.fromEntries(
    dbCategories.map((c) => [c.name, c.iconUrl ?? null]),
  );

  const allIds = items.map((i) => i.id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const isIndeterminate = !isAllSelected && allIds.some((id) => selected.has(id));

  function toggleAll() {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
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
        ? `Xóa ${selected.size} tài liệu đã chọn? Hành động này không thể hoàn tác.`
        : action === "hide"
          ? `Ẩn ${selected.size} tài liệu đã chọn?`
          : `Hiện ${selected.size} tài liệu đã chọn?`;
    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/tut-tricks/bulk", { credentials: "include",
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

  const filterParts = [
    platform ? `· ${PLATFORM_LABELS[platform] ?? platform}` : "",
    category ? `· ${category}` : "",
    tier ? `· ${tier}` : "",
    q ? `· "${q}"` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">
          {total.toLocaleString("vi-VN")} tài liệu {filterParts}
        </span>

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

      {feedback && (
        <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
          feedback.ok
            ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
            : "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
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
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">STT</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tài liệu</th>
              {/* Danh mục = category field (từ TutTrickCategory) */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh mục</th>
              {/* Loại tut = tier field (Miễn phí / Có phí) */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Loại tut</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đánh giá</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <p className="text-4xl mb-3">📖</p>
                  <p className="text-sm font-medium text-gray-600">Không tìm thấy tài liệu</p>
                  <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc thêm tài liệu mới</p>
                </td>
              </tr>
            )}
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 transition-colors ${selected.has(item.id) ? "bg-[#7C3AED]/4" : ""}`}
              >
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3.5 text-center text-sm text-gray-400 font-medium">
                  {(currentPage - 1) * 20 + idx + 1}
                </td>
                {/* Tên tài liệu + platform enum */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r2Url(item.thumbnail)} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-lg shrink-0">📖</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                      {/* Hiện platform enum nhỏ phía dưới tên */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                        {PLATFORM_ICONS[item.platform] && (
                          <span className="flex items-center justify-center w-3 h-3 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={PLATFORM_ICONS[item.platform]} alt="" className="w-full h-full object-contain" />
                          </span>
                        )}
                        {PLATFORM_LABELS[item.platform] ?? item.platform}
                      </span>
                    </div>
                  </div>
                </td>
                {/* Danh mục = category field (TutTrickCategory) */}
                <td className="px-4 py-3.5">
                  {item.category ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1d4ed8]">
                      {categoryIconMap[item.category] && (
                        <span className="flex items-center justify-center w-4 h-4 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={categoryIconMap[item.category]!} alt={item.category} className="w-full h-full object-contain" />
                        </span>
                      )}
                      {item.category}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                {/* Platform = tier field (Miễn phí / Có phí) */}
                <td className="px-4 py-3.5">
                  {item.tier === "Có phí" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A855F7]/10 text-[#A855F7]">Có phí</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981]">Miễn phí</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {item.price === 0 ? (
                    <span className="text-sm font-bold text-[#10B981]">Miễn phí</span>
                  ) : (
                    <span className="text-sm font-bold text-[#A855F7]">{formatVnd(item.price)}</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="text-sm font-bold text-[#F59E0B]">★ {item.rating.toFixed(1)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1.5">
                    {item.isActive
                      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]">Hoạt động</span>
                      : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Ẩn</span>
                    }
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B]">Nổi bật</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    prefetch={false}
                    href={`/admin/tut-tricks/${item.id}/sua`}
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
