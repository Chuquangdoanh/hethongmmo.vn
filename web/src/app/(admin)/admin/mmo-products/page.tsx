import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { getUserPermissions } from "@/lib/services/permission.service";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Tài nguyên MMO" };

const PAGE_SIZE = 20;

export default async function AdminMmoProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; group?: string; q?: string }>;
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
    if (!perms.includes("resources:read")) redirect("/admin/dashboard");
    canCreate = perms.includes("resources:create");
    canUpdate = perms.includes("resources:update");
    canDelete = perms.includes("resources:delete");
  }

  const { page, group, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null,
    ...(group ? { categoryGroup: group } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
  };

  const [products, total, allTotal, activeCount, groups, outOfStockCount, ordersAgg] = await Promise.all([
    prisma.mmoProduct.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        category: true, categoryGroup: true,
        price: true, isActive: true, isFeatured: true,
        totalOrders: true, totalViews: true,
        _count: { select: { items: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.mmoProduct.count({ where }),
    prisma.mmoProduct.count({ where: { deletedAt: null } }),
    prisma.mmoProduct.count({ where: { deletedAt: null, isActive: true } }),
    prisma.mmoProduct.findMany({
      where: { deletedAt: null },
      select: { categoryGroup: true },
      distinct: ["categoryGroup"],
      orderBy: { categoryGroup: "asc" },
    }),
    // products with 0 available items
    prisma.mmoProduct.count({
      where: {
        deletedAt: null,
        items: { none: { status: "AVAILABLE" } },
      },
    }),
    prisma.mmoProduct.aggregate({ where: { deletedAt: null }, _sum: { totalOrders: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const mmoIds = products.map((p) => p.id);
  const mmoAuditEntries = mmoIds.length > 0
    ? await prisma.auditLog.findMany({
        where: { targetType: "MmoProduct", targetId: { in: mmoIds } },
        orderBy: { createdAt: "desc" },
        take: mmoIds.length * 5,
        select: { targetId: true, action: true, createdAt: true, actor: { select: { fullName: true } } },
      })
    : [];

  const lastActors: Record<string, { name: string; action: string; at: string }> = {};
  for (const e of mmoAuditEntries) {
    if (e.targetId && !lastActors[e.targetId]) {
      lastActors[e.targetId] = { name: e.actor?.fullName ?? "Hệ thống", action: e.action, at: e.createdAt.toISOString() };
    }
  }

  function actionLabel(action: string) {
    if (action.endsWith("_CREATE")) return "Thêm mới";
    if (action.endsWith("_UPDATE")) return "Cập nhật";
    if (action.includes("DELETE")) return "Đã xóa";
    return "Cập nhật";
  }

  function relativeTime(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài nguyên MMO</h1>
          <p className="text-sm text-gray-500 mt-1">Tài khoản, cookie, proxy và các tài nguyên MMO</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/mmo-products/tao-moi"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap shrink-0"
          >
            + Thêm sản phẩm
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng sản phẩm</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đang bán</p>
          <p className="text-3xl font-bold text-[#10B981]">{activeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Ẩn: {(allTotal - activeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-5">
          <p className="text-xs font-medium text-[#EF4444] uppercase tracking-wide mb-2">Hết hàng</p>
          <p className="text-3xl font-bold text-[#EF4444]">{outOfStockCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Cần nhập thêm hàng</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Tổng đã bán</p>
          <p className="text-3xl font-bold text-[#A855F7]">{(ordersAgg._sum.totalOrders ?? 0).toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tất cả sản phẩm</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên sản phẩm..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {group && <input type="hidden" name="group" value={group} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q || group) && (
          <Link href="/admin/mmo-products" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Group filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={q ? `/admin/mmo-products?q=${encodeURIComponent(q)}` : "/admin/mmo-products"}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!group ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
        >
          Tất cả nhóm
        </Link>
        {groups.map(({ categoryGroup }) => (
          <Link
            key={categoryGroup}
            href={`/admin/mmo-products?group=${encodeURIComponent(categoryGroup)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${group === categoryGroup ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
          >
            {categoryGroup}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} sản phẩm{group ? ` · ${group}` : ""}{q ? ` · "${q}"` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">STT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nhóm / Danh mục</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tồn kho</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đã bán</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Lượt xem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Người c.nhật</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="text-sm font-medium text-gray-600">Không tìm thấy sản phẩm</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc thêm sản phẩm mới</p>
                  </td>
                </tr>
              )}
              {products.map((product, idx) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-center text-sm text-gray-400 font-medium">
                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {product.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r2Url(product.thumbnail)} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-sm font-bold flex-shrink-0">
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-semibold text-gray-700">{product.categoryGroup}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{product.category}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#A855F7]">
                    {formatVnd(Number(product.price))}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-bold ${product._count.items === 0 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                      {product._count.items.toLocaleString("vi-VN")}
                    </span>
                    {product._count.items === 0 && (
                      <p className="text-[9px] text-[#EF4444] mt-0.5">Hết hàng</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-[#2563eb]">
                    {product.totalOrders.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm text-gray-500">
                    {product.totalViews.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5 flex-wrap">
                      {product.isActive
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]">Hiển thị</span>
                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Ẩn</span>
                      }
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B]">Nổi bật</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {lastActors[product.id] ? (
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate max-w-30">{lastActors[product.id]!.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{actionLabel(lastActors[product.id]!.action)} · {relativeTime(lastActors[product.id]!.at)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        prefetch={false}
                        href={`/admin/mmo-products/${product.id}/stock`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#10B981] bg-[#10B981]/8 hover:bg-[#10B981]/15 transition-colors"
                      >
                        Kho
                      </Link>
                      {canUpdate && (
                        <Link
                          prefetch={false}
                          href={`/admin/mmo-products/${product.id}/sua`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 transition-colors"
                        >
                          Sửa
                        </Link>
                      )}
                    </div>
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
          basePath="/admin/mmo-products"
          searchParams={{ ...(group ? { group } : {}), ...(q ? { q } : {}) }}
        />
      )}
    </div>
  );
}
