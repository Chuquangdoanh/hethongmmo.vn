import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { getUserPermissions } from "@/lib/services/permission.service";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import ServicesTable from "./_components/ServicesTable";

export const metadata: Metadata = { title: "Admin — Dịch vụ" };

const PAGE_SIZE = 20;

export default async function AdminServicesPage({
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
    if (!perms.includes("services:read")) redirect("/admin/dashboard");
    canCreate = perms.includes("services:create");
    canUpdate = perms.includes("services:update");
    canDelete = perms.includes("services:delete");
  }

  const { page, category, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
  };

  const [services, total, allTotal, activeCount, featuredCount, distinctCategories] =
    await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true, name: true, category: true,
          price: true, isActive: true, isFeatured: true, thumbnail: true,
          successRate: true, processingTime: true,
        },
      }),
      prisma.service.count({ where }),
      prisma.service.count({ where: { deletedAt: null } }),
      prisma.service.count({ where: { deletedAt: null, isActive: true } }),
      prisma.service.count({ where: { deletedAt: null, isFeatured: true } }),
      prisma.service.findMany({
        where: { deletedAt: null },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
    ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const categories = distinctCategories.map((s) => s.category).filter(Boolean);

  const productIds = services.map((s) => s.id);
  const auditEntries = productIds.length > 0
    ? await prisma.auditLog.findMany({
        where: { targetType: "Service", targetId: { in: productIds } },
        orderBy: { createdAt: "desc" },
        take: productIds.length * 5,
        select: { targetId: true, action: true, createdAt: true, actor: { select: { fullName: true } } },
      })
    : [];

  const lastActors: Record<string, { name: string; action: string; at: string }> = {};
  for (const e of auditEntries) {
    if (e.targetId && !lastActors[e.targetId]) {
      lastActors[e.targetId] = { name: e.actor?.fullName ?? "Hệ thống", action: e.action, at: e.createdAt.toISOString() };
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Dịch vụ</h1>
          <p className="text-sm text-gray-500 mt-1">Tăng follow, like, view trên các nền tảng MXH</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/services/tao-moi"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap shrink-0"
          >
            + Thêm dịch vụ
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
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
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên dịch vụ..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q ?? category) && (
          <Link href="/admin/services" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={q ? `/admin/services?q=${encodeURIComponent(q)}` : "/admin/services"}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !category
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
            }`}
          >
            Tất cả
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/admin/services?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === cat
                  ? "bg-[#7C3AED] text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      <ServicesTable
        services={services.map((s) => ({ ...s, price: Number(s.price) }))}
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
          basePath="/admin/services"
          searchParams={{ ...(category ? { category } : {}), ...(q ? { q } : {}) }}
        />
      )}
    </div>
  );
}
