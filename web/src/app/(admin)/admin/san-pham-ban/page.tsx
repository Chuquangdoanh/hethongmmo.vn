import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import RestrictButton from "./_components/RestrictButton";
import ApprovalButton from "./_components/ApprovalButton";

export const metadata: Metadata = { title: "Sản phẩm nhà bán" };

const PAGE_SIZE = 20;

const PRODUCT_SELECT = {
  id: true, name: true, price: true, isActive: true, sellerCategory: true,
  isRestricted: true, isHidden: true, approvalStatus: true, approvalRejectReason: true, createdAt: true,
  seller: { select: { id: true, fullName: true, email: true, sellerRequest: { select: { id: true } } } },
  _count: {
    select: {
      orders: true,
      stockItems: { where: { status: "AVAILABLE" as const } },
    },
  },
} satisfies Prisma.SellerProductSelect;

export default async function AdminSellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sellerId?: string; restricted?: string; sort?: string; approvalStatus?: string }>;
}) {
  const session = await auth();
  requireStaff(session);

  const { page, sellerId, restricted, sort, approvalStatus } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const offset      = (currentPage - 1) * PAGE_SIZE;
  const isValidApprovalStatus = approvalStatus === "PENDING" || approvalStatus === "APPROVED" || approvalStatus === "REJECTED";

  const isRatingSort = sort === "rating_desc" || sort === "rating_asc";

  // WHERE fragments (shared between raw + Prisma)
  const sellerFilter     = sellerId
    ? Prisma.sql`AND p.seller_id = ${sellerId}::uuid`
    : Prisma.empty;
  const restrictedFilter =
    restricted === "1" ? Prisma.sql`AND p.is_restricted = true`
    : restricted === "0" ? Prisma.sql`AND p.is_restricted = false`
    : Prisma.empty;
  const approvalStatusFilter = isValidApprovalStatus
    ? Prisma.sql`AND p.approval_status = ${approvalStatus}::"SellerProductApprovalStatus"`
    : Prisma.empty;

  const where = {
    deletedAt: null as null,
    ...(sellerId ? { sellerId } : {}),
    ...(restricted === "1" ? { isRestricted: true } : restricted === "0" ? { isRestricted: false } : {}),
    ...(isValidApprovalStatus ? { approvalStatus: approvalStatus as "PENDING" | "APPROVED" | "REJECTED" } : {}),
  };

  // Total count (always via Prisma)
  const total = await prisma.sellerProduct.count({ where });

  type RawRatingRow = { id: string; avg_rating: number | null; review_count: number };

  let products: Awaited<ReturnType<typeof prisma.sellerProduct.findMany<{ select: typeof PRODUCT_SELECT }>>>;
  let ratingMap: Map<string, { avg: number; count: number }>;

  if (isRatingSort) {
    // Raw query: sort by avg rating, keeping filters
    const sortDir = sort === "rating_asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const rawRows = await prisma.$queryRaw<RawRatingRow[]>`
      SELECT p.id::text,
             AVG(r.rating)::float          AS avg_rating,
             COUNT(r.id)::int              AS review_count
      FROM seller_products p
      LEFT JOIN reviews r
        ON r.product_id = p.id AND r.product_type = 'SELLER_PRODUCT'
      WHERE p.deleted_at IS NULL
      ${sellerFilter}
      ${restrictedFilter}
      ${approvalStatusFilter}
      GROUP BY p.id
      ORDER BY avg_rating ${sortDir} NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const idList = rawRows.map((r) => r.id);
    ratingMap = new Map(rawRows.map((r) => [r.id, { avg: r.avg_rating ?? 0, count: r.review_count ?? 0 }]));

    const details = await prisma.sellerProduct.findMany({
      where: { id: { in: idList } },
      select: PRODUCT_SELECT,
    });

    // Re-sort to match raw query order
    const detailMap = new Map(details.map((p) => [p.id, p]));
    products = idList.map((id) => detailMap.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  } else {
    // Default: newest first
    const list = await prisma.sellerProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
      select: PRODUCT_SELECT,
    });
    products = list;

    const productIds = list.map((p) => p.id);
    const ratingRows = productIds.length > 0
      ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productType: "SELLER_PRODUCT", productId: { in: productIds } },
          _avg: { rating: true },
          _count: { id: true },
        })
      : [];
    ratingMap = new Map(ratingRows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count.id }]));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const searchParamsObj: Record<string, string> = {};
  if (sellerId)       searchParamsObj.sellerId       = sellerId;
  if (restricted)      searchParamsObj.restricted     = restricted;
  if (sort)            searchParamsObj.sort           = sort;
  if (isValidApprovalStatus) searchParamsObj.approvalStatus = approvalStatus;

  // Build URL helper preserving current filters
  function filterUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { sellerId, restricted, sort, approvalStatus, ...overrides };
    if (merged.sellerId)   sp.set("sellerId",   merged.sellerId);
    if (merged.restricted) sp.set("restricted", merged.restricted);
    if (merged.sort)       sp.set("sort",        merged.sort);
    if (merged.approvalStatus) sp.set("approvalStatus", merged.approvalStatus);
    const str = sp.toString();
    return `/admin/san-pham-ban${str ? `?${str}` : ""}`;
  }

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
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        {[
          { label: "Tất cả",     val: undefined },
          { label: "Bị hạn chế", val: "1"       },
          { label: "Bình thường", val: "0"       },
        ].map(({ label, val }) => {
          const active = val === undefined ? !restricted : restricted === val;
          return (
            <Link
              key={label}
              href={filterUrl({ restricted: val, page: undefined })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {label}
            </Link>
          );
        })}

        {/* Divider */}
        <span className="text-gray-200 select-none">|</span>

        {/* Approval status filter */}
        {[
          { label: "Chờ duyệt",  val: "PENDING"  },
          { label: "Đã duyệt",   val: "APPROVED" },
          { label: "Bị từ chối", val: "REJECTED" },
        ].map(({ label, val }) => {
          const active = approvalStatus === val;
          return (
            <Link
              key={label}
              href={filterUrl({ approvalStatus: active ? undefined : val, page: undefined })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                active
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600"
              }`}
            >
              {label}
            </Link>
          );
        })}

        {/* Divider */}
        <span className="text-gray-200 select-none">|</span>

        {/* Rating sort dropdown */}
        <form method="get" action="/admin/san-pham-ban">
          {sellerId   && <input type="hidden" name="sellerId"   value={sellerId} />}
          {restricted && <input type="hidden" name="restricted" value={restricted} />}
          {isValidApprovalStatus && <input type="hidden" name="approvalStatus" value={approvalStatus} />}
          <div className="flex items-center gap-1">
            <select
              name="sort"
              defaultValue={sort ?? ""}
              className="h-8 px-2 pr-7 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-amber-400 hover:border-amber-400 transition-colors cursor-pointer"
            >
              <option value="">Mặc định</option>
              <option value="rating_desc">★ Cao → Thấp</option>
              <option value="rating_asc">★ Thấp → Cao</option>
            </select>
            <button
              type="submit"
              className="h-8 px-2.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors border border-amber-500"
            >
              Lọc
            </button>
          </div>
        </form>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                      {isRatingSort ? (
                        <span className="flex items-center gap-1">
                          Đánh giá
                          <span className="text-amber-400">{sort === "rating_asc" ? "↑" : "↓"}</span>
                        </span>
                      ) : "Đánh giá"}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày tạo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const r = ratingMap.get(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`${i !== 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50/60 transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-50">{p.name}</p>
                          <p className="text-[11px] text-gray-400">{p.sellerCategory}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            prefetch={false}
                            href={p.seller.sellerRequest ? `/admin/sellers/${p.seller.sellerRequest.id}` : `/admin/sellers`}
                            className="text-xs font-medium text-blue-600 hover:underline block truncate max-w-30"
                          >
                            {p.seller.fullName}
                          </Link>
                          <p className="text-[11px] text-gray-400 truncate max-w-30">{p.seller.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                          {formatVnd(Number(p.price))}
                        </td>
                        <td className="px-4 py-3">
                          {!r || r.count === 0 ? (
                            <span className="text-[11px] text-gray-300">—</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 text-sm leading-none">★</span>
                              <span className="text-xs font-semibold text-amber-500">{r.avg.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400">({r.count})</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p._count.orders}</td>
                        <td className="px-4 py-3 text-sm">
                          {p._count.stockItems === 0 ? (
                            <span className="text-red-500 text-xs font-medium">Hết hàng</span>
                          ) : (
                            <span className="text-gray-600">{p._count.stockItems}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {p.isRestricted ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600 border border-red-200">
                                Bị hạn chế
                              </span>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                p.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}>
                                {p.isActive ? "Đang bán" : "Ẩn"}
                              </span>
                            )}
                            {p.approvalStatus === "PENDING" && (
                              <span
                                title="Sản phẩm đang chờ admin duyệt, chưa hiển thị công khai"
                                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 cursor-help"
                              >
                                Chờ duyệt
                              </span>
                            )}
                            {p.approvalStatus === "REJECTED" && (
                              <span
                                title={p.approvalRejectReason ?? "Không có lý do"}
                                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 cursor-help"
                              >
                                Bị từ chối
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Link
                              prefetch={false}
                              href={`/admin/san-pham-ban/${p.id}`}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                            >
                              Chi tiết
                            </Link>
                            <ApprovalButton
                              productId={p.id}
                              productName={p.name}
                              approvalStatus={p.approvalStatus}
                            />
                            <RestrictButton
                              productId={p.id}
                              productName={p.name}
                              isRestricted={p.isRestricted}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
