import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Khóa học" };

const PAGE_SIZE = 20;

const BADGE_STYLES: Record<string, string> = {
  HOT:     "bg-[#EF4444]/10 text-[#EF4444]",
  POPULAR: "bg-[#F59E0B]/10 text-[#F59E0B]",
  TREND:   "bg-[#A855F7]/10 text-[#A855F7]",
  NEW:     "bg-[#10B981]/10 text-[#10B981]",
  VIP:     "bg-[#7C3AED]/10 text-[#A855F7]",
};
const BADGE_LABELS: Record<string, string> = {
  HOT: "Hot", POPULAR: "Phổ biến", TREND: "Trending", NEW: "Mới", VIP: "VIP", NONE: "",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const { page, category, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
  };

  const [courses, total, allTotal, activeCount, categories, studentsAgg, ordersAgg] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, thumbnail: true, category: true,
        originalPrice: true, salePrice: true, badge: true,
        studentCount: true, rating: true, isActive: true, totalOrders: true,
      },
    }),
    prisma.course.count({ where }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null, isActive: true } }),
    prisma.course.findMany({
      where: { deletedAt: null },
      select: { category: true },
      distinct: ["category"],
    }),
    prisma.course.aggregate({ where: { deletedAt: null }, _sum: { studentCount: true } }),
    prisma.course.aggregate({ where: { deletedAt: null }, _sum: { totalOrders: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khóa học</h1>
          <p className="text-sm text-gray-500 mt-1">Các khóa học MMO, kiếm tiền online và kỹ năng</p>
        </div>
        <Link
          href="/admin/courses/tao-moi"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap flex-shrink-0"
        >
          + Thêm khóa học
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng khóa học</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đang hoạt động</p>
          <p className="text-3xl font-bold text-[#10B981]">{activeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Ẩn: {(allTotal - activeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 p-5">
          <p className="text-xs font-medium text-[#2563eb] uppercase tracking-wide mb-2">Học viên</p>
          <p className="text-3xl font-bold text-[#2563eb]">{(studentsAgg._sum.studentCount ?? 0).toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tổng tất cả khóa</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Tổng đơn mua</p>
          <p className="text-3xl font-bold text-[#A855F7]">{(ordersAgg._sum.totalOrders ?? 0).toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tất cả khóa học</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên khóa học..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q || category) && (
          <Link href="/admin/courses" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={q ? `/admin/courses?q=${encodeURIComponent(q)}` : "/admin/courses"}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!category ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
        >
          Tất cả
        </Link>
        {categories.map(({ category: cat }) => (
          <Link
            key={cat}
            href={`/admin/courses?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === cat ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} khóa học{category ? ` · ${category}` : ""}{q ? ` · "${q}"` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Khóa học</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Học viên</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đánh giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Badge</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">🎓</p>
                    <p className="text-sm font-medium text-gray-600">Không tìm thấy khóa học</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc thêm khóa học mới</p>
                  </td>
                </tr>
              )}
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {course.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={course.thumbnail} alt={course.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-lg flex-shrink-0">
                          🎓
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{course.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{course.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="text-sm font-bold text-[#A855F7]">{formatVnd(Number(course.salePrice))}</p>
                    {Number(course.originalPrice) !== Number(course.salePrice) && (
                      <p className="text-[10px] text-gray-400 line-through mt-0.5">{formatVnd(Number(course.originalPrice))}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-[#2563eb]">
                    {course.studentCount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-[#F59E0B]">★ {course.rating.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {course.badge !== "NONE" && course.badge in BADGE_STYLES && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_STYLES[course.badge]}`}>
                        {BADGE_LABELS[course.badge] ?? course.badge}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      {course.isActive
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]">Hoạt động</span>
                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Ẩn</span>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/courses/${course.id}/sua`}
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
          basePath="/admin/courses"
          searchParams={{ ...(category ? { category } : {}), ...(q ? { q } : {}) }}
        />
      )}
    </div>
  );
}
