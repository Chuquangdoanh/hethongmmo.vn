import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { getUserPermissions } from "@/lib/services/permission.service";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import CoursesTable from "./_components/CoursesTable";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Admin — Khóa học" };

const PAGE_SIZE = 20;

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;
  if (!me || (me.role !== "ADMIN" && me.role !== "STAFF")) redirect("/");

  const isAdmin = me.role === "ADMIN";
  let canCreate = isAdmin;
  let canUpdate = isAdmin;
  let canDelete = isAdmin;

  if (!isAdmin) {
    const perms = await getUserPermissions(me.id);
    if (!perms.includes("courses:read")) redirect("/admin/dashboard");
    canCreate = perms.includes("courses:create");
    canUpdate = perms.includes("courses:update");
    canDelete = perms.includes("courses:delete");
  }

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

  const courseIds = courses.map((c) => c.id);
  const courseAuditEntries = courseIds.length > 0
    ? await prisma.auditLog.findMany({
        where: { targetType: "Course", targetId: { in: courseIds } },
        orderBy: { createdAt: "desc" },
        take: courseIds.length * 5,
        select: { targetId: true, action: true, createdAt: true, actor: { select: { fullName: true } } },
      })
    : [];

  const lastActors: Record<string, { name: string; action: string; at: string }> = {};
  for (const e of courseAuditEntries) {
    if (e.targetId && !lastActors[e.targetId]) {
      lastActors[e.targetId] = { name: e.actor?.fullName ?? "Hệ thống", action: e.action, at: e.createdAt.toISOString() };
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khóa học</h1>
          <p className="text-sm text-gray-500 mt-1">Các khóa học MMO, kiếm tiền online và kỹ năng</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/courses/tao-moi"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap shrink-0"
          >
            + Thêm khóa học
          </Link>
        )}
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
      <AdminFilterBar
        basePath="/admin/courses"
        search={{ placeholder: "Tìm theo tên khóa học..." }}
        preserveParams={["category"]}
      />

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
        currentPage={currentPage}
        canUpdate={canUpdate}
        canDelete={canDelete}
        lastActors={lastActors}
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
