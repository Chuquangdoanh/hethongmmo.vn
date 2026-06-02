import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import CoursesTable from "./_components/CoursesTable";

export const metadata: Metadata = { title: "Admin — Khóa học" };

const PAGE_SIZE = 20;

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

  const [courses, total, allTotal, activeCount, categories] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, thumbnail: true, category: true,
        originalPrice: true, salePrice: true, badge: true,
        rating: true, isActive: true,
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
      <div className="grid grid-cols-2 gap-4">
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
        {(q ?? category) && (
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

      <CoursesTable
        courses={courses.map((c) => ({
          ...c,
          originalPrice: Number(c.originalPrice),
          salePrice: Number(c.salePrice),
        }))}
        total={total}
        category={category}
        q={q}
      />

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
