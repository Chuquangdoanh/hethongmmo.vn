import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import RestrictButton from "./_components/RestrictButton";

export const metadata: Metadata = { title: "Sản phẩm nhà bán" };

const PAGE_SIZE = 20;

export default async function AdminSellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sellerId?: string; restricted?: string }>;
}) {
  const session = await auth();
  requireStaff(session);

  const { page, sellerId, restricted } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null as null,
    ...(sellerId ? { sellerId } : {}),
    ...(restricted === "1" ? { isRestricted: true } : restricted === "0" ? { isRestricted: false } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.sellerProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, price: true, isActive: true,
        isRestricted: true, isHidden: true, createdAt: true,
        seller: { select: { id: true, fullName: true, email: true, sellerCategory: true } },
        _count: {
          select: {
            orders: true,
            stockItems: { where: { status: "AVAILABLE" } },
          },
        },
      },
    }),
    prisma.sellerProduct.count({ where }),
  ]);

  const productIds = products.map((p) => p.id);
  const ratingRows = productIds.length > 0
    ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productType: "SELLER_PRODUCT", productId: { in: productIds } },
        _avg: { rating: true },
        _count: { id: true },
      })
    : [];
  const ratingMap = new Map(ratingRows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count.id }]));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const searchParamsObj: Record<string, string> = {};
  if (sellerId) searchParamsObj.sellerId = sellerId;
  if (restricted) searchParamsObj.restricted = restricted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm nhà bán</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và kiểm duyệt sản phẩm của tất cả seller</p>
        </div>
        <div className="text-sm text-gray-500">
          Tổng: <strong className="text-gray-800">{total}</strong> sản phẩm
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: "Tất cả", href: "/admin/san-pham-ban" },
          { label: "Bị hạn chế", href: "/admin/san-pham-ban?restricted=1" },
          { label: "Bình thường", href: "/admin/san-pham-ban?restricted=0" },
        ].map(({ label, href }) => {
          const isActive =
            href === "/admin/san-pham-ban"
              ? !restricted
              : href.includes("restricted=1")
              ? restricted === "1"
              : restricted === "0";
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-500">Không có sản phẩm nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Nhà bán</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Giá</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Đánh giá</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày tạo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`${i !== 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50/60 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.seller.sellerCategory}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/sellers/${p.seller.id}`}
                          className="text-xs font-medium text-blue-600 hover:underline block truncate max-w-[120px]"
                        >
                          {p.seller.fullName}
                        </Link>
                        <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{p.seller.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                        {formatVnd(Number(p.price))}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const r = ratingMap.get(p.id);
                          if (!r || r.count === 0) return <span className="text-[11px] text-gray-300">—</span>;
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 text-sm leading-none">★</span>
                              <span className="text-xs font-semibold text-amber-500">{r.avg.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400">({r.count})</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p._count.orders}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p._count.stockItems === 0 ? (
                          <span className="text-red-500 text-xs font-medium">Hết hàng</span>
                        ) : (
                          <span className="text-gray-600">{p._count.stockItems}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {p.isRestricted && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600 border border-red-200">
                              Bị hạn chế
                            </span>
                          )}
                          {!p.isRestricted && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}>
                              {p.isActive ? "Đang bán" : "Ẩn"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/san-pham-ban/${p.id}`}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            Chi tiết
                          </Link>
                          <RestrictButton
                            productId={p.id}
                            productName={p.name}
                            isRestricted={p.isRestricted}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/admin/san-pham-ban"
                  searchParams={searchParamsObj}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
