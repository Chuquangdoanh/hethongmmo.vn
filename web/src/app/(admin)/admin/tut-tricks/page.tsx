import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Tut & Tricks" };

const PAGE_SIZE = 20;

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

export default async function AdminTutTricksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; platform?: string; q?: string; free?: string }>;
}) {
  const { page, platform, q, free } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const isFree = free === "1";

  const where = {
    deletedAt: null,
    ...(platform ? { platform: platform as never } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
    ...(free === "1" ? { price: { equals: 0 as never } } : free === "0" ? { price: { gt: 0 as never } } : {}),
  };

  const [items, total, allTotal, activeCount, freeCount, ordersAgg] = await Promise.all([
    prisma.tutTrick.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, thumbnail: true, platform: true, category: true,
        price: true, isActive: true, isFeatured: true,
        totalOrders: true, successRate: true, rating: true,
      },
    }),
    prisma.tutTrick.count({ where }),
    prisma.tutTrick.count({ where: { deletedAt: null } }),
    prisma.tutTrick.count({ where: { deletedAt: null, isActive: true } }),
    prisma.tutTrick.count({ where: { deletedAt: null, price: { equals: 0 as never } } }),
    prisma.tutTrick.aggregate({ where: { deletedAt: null }, _sum: { totalOrders: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const platforms = ["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tut &amp; Tricks</h1>
          <p className="text-sm text-gray-500 mt-1">Hướng dẫn, thủ thuật và tài liệu kỹ thuật</p>
        </div>
        <Link
          href="/admin/tut-tricks/tao-moi"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap flex-shrink-0"
        >
          + Thêm mới
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng tài liệu</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đang hoạt động</p>
          <p className="text-3xl font-bold text-[#10B981]">{activeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Ẩn: {(allTotal - activeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 p-5">
          <p className="text-xs font-medium text-[#2563eb] uppercase tracking-wide mb-2">Miễn phí</p>
          <p className="text-3xl font-bold text-[#2563eb]">{freeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Có phí: {(allTotal - freeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Tổng đã bán</p>
          <p className="text-3xl font-bold text-[#A855F7]">{(ordersAgg._sum.totalOrders ?? 0).toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tất cả tài liệu</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên tut & trick..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {platform && <input type="hidden" name="platform" value={platform} />}
        {free !== undefined && <input type="hidden" name="free" value={free} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q || platform || free !== undefined) && (
          <Link href="/admin/tut-tricks" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Free/Paid toggle */}
        <Link
          href={`/admin/tut-tricks${platform ? `?platform=${platform}` : ""}${q ? `${platform ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${free === undefined ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"}`}
        >
          Tất cả
        </Link>
        <Link
          href={`/admin/tut-tricks?free=0${platform ? `&platform=${platform}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${free === "0" ? "bg-[#A855F7] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#A855F7] hover:text-[#A855F7]"}`}
        >
          Có phí
        </Link>
        <Link
          href={`/admin/tut-tricks?free=1${platform ? `&platform=${platform}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isFree ? "bg-[#2563eb] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb]"}`}
        >
          Miễn phí
        </Link>
        <span className="text-gray-300 mx-1">|</span>
        {/* Platform filter */}
        <Link
          href={q ? `/admin/tut-tricks?q=${encodeURIComponent(q)}` : "/admin/tut-tricks"}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!platform ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
        >
          Tất cả nền tảng
        </Link>
        {platforms.map((p) => (
          <Link
            key={p}
            href={`/admin/tut-tricks?platform=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${free !== undefined ? `&free=${free}` : ""}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${platform === p ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
          >
            {PLATFORM_ICONS[p] && (
              <span className={`flex items-center justify-center w-4 h-4 rounded p-0.5 shrink-0 ${platform === p ? "bg-white/20" : "bg-white border border-gray-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PLATFORM_ICONS[p]} alt={PLATFORM_LABELS[p]} className="w-full h-full object-contain" />
              </span>
            )}
            {PLATFORM_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} tài liệu
            {platform ? ` · ${PLATFORM_LABELS[platform]}` : ""}
            {q ? ` · "${q}"` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tài liệu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đã bán</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đánh giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">📖</p>
                    <p className="text-sm font-medium text-gray-600">Không tìm thấy tài liệu</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc thêm tài liệu mới</p>
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-lg flex-shrink-0">
                          📖
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                      {PLATFORM_ICONS[item.platform] && (
                        <span className="flex items-center justify-center w-5 h-5 bg-[#f8fafc] rounded border border-gray-200 p-0.5 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={PLATFORM_ICONS[item.platform]} alt={PLATFORM_LABELS[item.platform] ?? item.platform} className="w-full h-full object-contain" />
                        </span>
                      )}
                      {PLATFORM_LABELS[item.platform] ?? item.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {Number(item.price) === 0 ? (
                      <span className="text-sm font-bold text-[#10B981]">Miễn phí</span>
                    ) : (
                      <span className="text-sm font-bold text-[#A855F7]">{formatVnd(Number(item.price))}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-[#2563eb]">
                    {item.totalOrders.toLocaleString("vi-VN")}
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

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/tut-tricks"
          searchParams={{
            ...(platform ? { platform } : {}),
            ...(q ? { q } : {}),
            ...(free !== undefined ? { free } : {}),
          }}
        />
      )}
    </div>
  );
}
