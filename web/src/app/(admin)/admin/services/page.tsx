import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Dịch vụ" };

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
  TELEGRAM:  "https://svgl.app/library/telegram.svg",
  TWITTER:   "https://svgl.app/library/x.svg",
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; platform?: string; q?: string }>;
}) {
  const { page, platform, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null,
    ...(platform ? { platform: platform as never } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
  };

  const [services, total, allTotal, activeCount, featuredCount, ordersAgg] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, platform: true, category: true,
        price: true, isActive: true, isFeatured: true, thumbnail: true,
        totalOrders: true, successRate: true, processingTime: true,
      },
    }),
    prisma.service.count({ where }),
    prisma.service.count({ where: { deletedAt: null } }),
    prisma.service.count({ where: { deletedAt: null, isActive: true } }),
    prisma.service.count({ where: { deletedAt: null, isFeatured: true } }),
    prisma.service.aggregate({ where: { deletedAt: null }, _sum: { totalOrders: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const platforms = ["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Dịch vụ</h1>
          <p className="text-sm text-gray-500 mt-1">Tăng follow, like, view trên các nền tảng MXH</p>
        </div>
        <Link
          href="/admin/services/tao-moi"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap flex-shrink-0"
        >
          + Thêm dịch vụ
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng dịch vụ</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đang hoạt động</p>
          <p className="text-3xl font-bold text-[#10B981]">{activeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Ẩn: {(allTotal - activeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide mb-2">Nổi bật</p>
          <p className="text-3xl font-bold text-[#F59E0B]">{featuredCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Được ghim lên đầu</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Tổng đơn hàng</p>
          <p className="text-3xl font-bold text-[#A855F7]">{(ordersAgg._sum.totalOrders ?? 0).toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tất cả dịch vụ</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên dịch vụ..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {platform && <input type="hidden" name="platform" value={platform} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q || platform) && (
          <Link href="/admin/services" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Platform filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={q ? `/admin/services?q=${encodeURIComponent(q)}` : "/admin/services"}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!platform ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
        >
          Tất cả
        </Link>
        {platforms.map((p) => (
          <Link
            key={p}
            href={`/admin/services?platform=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${platform === p ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
          >
            {PLATFORM_ICONS[p] && (
              <span className="flex items-center justify-center w-4 h-4 bg-white rounded-sm p-0.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PLATFORM_ICONS[p] ?? ""} alt="" className="w-full h-full object-contain" />
              </span>
            )}
            {PLATFORM_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} dịch vụ{platform ? ` · ${PLATFORM_LABELS[platform]}` : ""}{q ? ` · "${q}"` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dịch vụ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Đơn hàng</th>
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
                <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {svc.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={svc.thumbnail} alt={svc.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-sm font-bold flex-shrink-0">
                          {svc.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{svc.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{svc.category}{svc.processingTime ? ` · ${svc.processingTime}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                      {PLATFORM_ICONS[svc.platform] && (
                        <span className="flex items-center justify-center w-4 h-4 bg-[#f8fafc] rounded-sm p-0.5 shrink-0 border border-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={PLATFORM_ICONS[svc.platform] ?? ""} alt="" className="w-full h-full object-contain" />
                        </span>
                      )}
                      {PLATFORM_LABELS[svc.platform] ?? svc.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#A855F7]">
                    {formatVnd(Number(svc.price))}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#2563eb]">
                    {svc.totalOrders.toLocaleString("vi-VN")}
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

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/services"
          searchParams={{ ...(platform ? { platform } : {}), ...(q ? { q } : {}) }}
        />
      )}
    </div>
  );
}
