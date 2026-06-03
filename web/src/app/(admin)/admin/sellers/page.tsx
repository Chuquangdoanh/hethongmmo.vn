import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate, formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import ShopLockAdminButton from "./[id]/ShopLockAdminButton";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Sellers" };

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-[#F59E0B]/10 text-[#F59E0B]",
  APPROVED: "bg-[#10B981]/10 text-[#10B981]",
  REJECTED: "bg-[#EF4444]/10 text-[#EF4444]",
  REVOKED:  "bg-[#71717A]/10 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt", APPROVED: "Đã duyệt",
  REJECTED: "Từ chối", REVOKED: "Thu hồi",
};

const TIER_STYLES: Record<string, string> = {
  STANDARD: "bg-gray-100 text-gray-600",
  SILVER:   "bg-slate-100 text-slate-600",
  GOLD:     "bg-amber-100 text-amber-700",
  VIP:      "bg-violet-100 text-violet-700",
};

const TIER_LABELS: Record<string, string> = {
  STANDARD: "Standard", SILVER: "Silver", GOLD: "Gold", VIP: "VIP",
};

type SortKey = "revenue_desc" | "revenue_asc" | "rating_desc" | "rating_asc";
const VALID_SORTS: SortKey[] = ["revenue_desc", "revenue_asc", "rating_desc", "rating_asc"];

function buildHref(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `/admin/sellers?${s}` : "/admin/sellers";
}

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; tier?: string; q?: string; sort?: string }>;
}) {
  const { page, status, tier, q, sort: sortParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;
  const activeSort = VALID_SORTS.includes(sortParam as SortKey)
    ? sortParam as SortKey
    : undefined;

  const userFilter: Record<string, unknown> = {};
  if (tier)   userFilter.sellerTier = tier;
  if (search) userFilter.OR = [
    { fullName: { contains: search, mode: "insensitive" } },
    { email:    { contains: search, mode: "insensitive" } },
  ];

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(Object.keys(userFilter).length > 0 ? { user: userFilter } : {}),
  };

  // Revenue sort: fetch ALL requests + revenues first, sort in-memory, then paginate
  let requests: Awaited<ReturnType<typeof prisma.sellerRequest.findMany<{
    include: { user: { select: { id: true; email: true; fullName: true; sellerTier: true } } }
  }>>>;
  let total: number;

  if (activeSort) {
    const allRequests = await prisma.sellerRequest.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true, sellerTier: true } } },
    });
    const allUserIds = allRequests.map((r) => r.userId);

    type AllRatingRow = { seller_id: string; avg_rating: number };

    const [allRevenueRows, allRatingRows] = await Promise.all([
      (activeSort === "revenue_desc" || activeSort === "revenue_asc") && allUserIds.length > 0
        ? prisma.order.groupBy({
            by: ["sellerId"],
            where: { sellerId: { in: allUserIds }, status: "DONE" },
            _sum: { finalPrice: true },
          })
        : Promise.resolve([]),
      (activeSort === "rating_desc" || activeSort === "rating_asc") && allUserIds.length > 0
        ? prisma.$queryRaw<AllRatingRow[]>`
            SELECT sp.seller_id,
                   AVG(r.rating)::float AS avg_rating
            FROM   reviews r
            JOIN   seller_products sp ON r.product_id = sp.id
            WHERE  r.product_type = 'SELLER_PRODUCT'
              AND  sp.seller_id = ANY(${allUserIds}::uuid[])
            GROUP  BY sp.seller_id
          `
        : Promise.resolve([] as AllRatingRow[]),
    ]);

    const allRevenueMap = new Map(allRevenueRows.map((r) => [r.sellerId, Number(r._sum.finalPrice ?? 0)]));
    const allRatingMap  = new Map(allRatingRows.map((r) => [r.seller_id, r.avg_rating ?? 0]));

    allRequests.sort((a, b) => {
      if (activeSort === "revenue_desc") return (allRevenueMap.get(b.userId) ?? 0) - (allRevenueMap.get(a.userId) ?? 0);
      if (activeSort === "revenue_asc")  return (allRevenueMap.get(a.userId) ?? 0) - (allRevenueMap.get(b.userId) ?? 0);
      if (activeSort === "rating_desc")  return (allRatingMap.get(b.userId) ?? 0) - (allRatingMap.get(a.userId) ?? 0);
      /* rating_asc */                   return (allRatingMap.get(a.userId) ?? 0) - (allRatingMap.get(b.userId) ?? 0);
    });

    total = allRequests.length;
    requests = allRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  } else {
    [requests, total] = await Promise.all([
      prisma.sellerRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { id: true, email: true, fullName: true, sellerTier: true } } },
      }),
      prisma.sellerRequest.count({ where }),
    ]);
  }

  const userIds = requests.map((r) => r.userId);

  // Fetch shop_locked, max_seller_products for all users in this page
  type ShopRow = { id: string; shop_locked: boolean; max_seller_products: number };
  const [shopRows, productCounts] = await Promise.all([
    userIds.length > 0
      ? prisma.$queryRaw<ShopRow[]>`SELECT id, shop_locked, max_seller_products FROM users WHERE id = ANY(${userIds}::uuid[])`
      : Promise.resolve([] as ShopRow[]),
    userIds.length > 0
      ? prisma.sellerProduct.groupBy({
          by: ["sellerId"],
          where: { sellerId: { in: userIds }, deletedAt: null },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);

  type RatingRow = { seller_id: string; avg_rating: number; review_count: string };
  const [revenueRows, sellerRatingRows] = await Promise.all([
    userIds.length > 0
      ? prisma.order.groupBy({
          by: ["sellerId"],
          where: { sellerId: { in: userIds }, status: "DONE" },
          _sum: { finalPrice: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.$queryRaw<RatingRow[]>`
          SELECT sp.seller_id,
                 AVG(r.rating)::float  AS avg_rating,
                 COUNT(r.id)::text     AS review_count
          FROM   reviews r
          JOIN   seller_products sp ON r.product_id = sp.id
          WHERE  r.product_type = 'SELLER_PRODUCT'
            AND  sp.seller_id = ANY(${userIds}::uuid[])
          GROUP  BY sp.seller_id
        `
      : Promise.resolve([] as RatingRow[]),
  ]);

  const shopLockMap    = new Map(shopRows.map((r) => [r.id, r.shop_locked]));
  const maxProductsMap = new Map(shopRows.map((r) => [r.id, r.max_seller_products ?? 3]));
  const productCountMap = new Map(productCounts.map((r) => [r.sellerId, r._count.id]));
  const revenueMap     = new Map(revenueRows.map((r) => [r.sellerId, Number(r._sum.finalPrice ?? 0)]));
  const sellerRatingMap = new Map(sellerRatingRows.map((r) => [r.seller_id, { avg: r.avg_rating, count: Number(r.review_count) }]));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Sort toggle links
  const nextRevenueSort = activeSort === "revenue_desc" ? "revenue_asc" : "revenue_desc";
  const revenueSortHref = buildHref({ status, tier, q: search, sort: nextRevenueSort, page: undefined });

  const nextRatingSort = activeSort === "rating_desc" ? "rating_asc" : "rating_desc";
  const ratingSortHref = buildHref({ status, tier, q: search, sort: nextRatingSort, page: undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Seller Requests</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} tổng</span>
      </div>

      {/* ── Search + Tier filter ── */}
      <form method="get" action="/admin/sellers" className="flex items-center gap-2 flex-wrap">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Tìm tên hoặc email người bán..."
            className="w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Tìm kiếm
        </button>
        {search && (
          <a
            href={buildHref({ status, tier })}
            className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            Xóa
          </a>
        )}

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* Tier chips — hidden inputs keep other params when submitting search */}
        {[
          { key: "",         label: "Tất cả hạng" },
          { key: "STANDARD", label: "Standard" },
          { key: "SILVER",   label: "Silver" },
          { key: "GOLD",     label: "Gold" },
          { key: "VIP",      label: "VIP" },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={buildHref({ status, tier: key || undefined, q: search })}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tier === key || (!tier && !key)
                ? "bg-[#7C3AED] text-white"
                : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
            }`}
          >
            {label}
          </a>
        ))}
      </form>

      {/* ── Status filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Trạng thái:</span>
        {[
          { key: "",         label: "Tất cả" },
          { key: "PENDING",  label: "Chờ duyệt" },
          { key: "APPROVED", label: "Đã duyệt" },
          { key: "REJECTED", label: "Từ chối" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={buildHref({ status: key || undefined, tier, q: search })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === key || (!status && !key)
                ? "bg-[#7C3AED] text-white"
                : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày đăng ký</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Danh mục</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hạng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Slot gian hàng</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                <Link
                  href={revenueSortHref}
                  className="inline-flex items-center gap-1 justify-end hover:text-violet-600 transition-colors"
                >
                  Tổng doanh số
                  {activeSort === "revenue_desc" ? (
                    <ChevronDown size={13} strokeWidth={2.5} className="text-violet-600" />
                  ) : activeSort === "revenue_asc" ? (
                    <ChevronUp size={13} strokeWidth={2.5} className="text-violet-600" />
                  ) : (
                    <ChevronsUpDown size={13} strokeWidth={2} className="text-gray-400" />
                  )}
                </Link>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                <Link
                  href={ratingSortHref}
                  className="inline-flex items-center gap-1 hover:text-violet-600 transition-colors"
                >
                  Đánh giá TB
                  {activeSort === "rating_desc" ? (
                    <ChevronDown size={13} strokeWidth={2.5} className="text-violet-600" />
                  ) : activeSort === "rating_asc" ? (
                    <ChevronUp size={13} strokeWidth={2.5} className="text-violet-600" />
                  ) : (
                    <ChevronsUpDown size={13} strokeWidth={2} className="text-gray-400" />
                  )}
                </Link>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Shop</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r, i) => (
              <tr key={r.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{r.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{r.user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.category}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.status === "APPROVED" ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TIER_STYLES[r.user.sellerTier] ?? TIER_STYLES.STANDARD}`}>
                      {TIER_LABELS[r.user.sellerTier] ?? r.user.sellerTier}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.status === "APPROVED" ? (() => {
                    const used = productCountMap.get(r.userId) ?? 0;
                    const max  = maxProductsMap.get(r.userId) ?? 3;
                    const full = used >= max;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        full
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {used}/{max}
                      </span>
                    );
                  })() : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "APPROVED" ? (
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatVnd(revenueMap.get(r.userId) ?? 0)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.status === "APPROVED" ? (() => {
                    const rt = sellerRatingMap.get(r.userId);
                    if (!rt || rt.count === 0) return <span className="text-xs text-gray-300">—</span>;
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 text-sm leading-none">★</span>
                        <span className="text-xs font-semibold text-amber-500">{rt.avg.toFixed(1)}</span>
                        <span className="text-[10px] text-gray-400">({rt.count})</span>
                      </div>
                    );
                  })() : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.status === "APPROVED" ? (
                    <ShopLockAdminButton
                      requestId={r.id}
                      locked={shopLockMap.get(r.userId) ?? false}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/sellers/${r.id}`} className="text-xs text-[#7C3AED] hover:text-[#A855F7]">
                    {r.status === "PENDING" ? "Duyệt" : "Chi tiết"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/sellers"
          searchParams={{
            ...(status     ? { status }         : {}),
            ...(tier       ? { tier }           : {}),
            ...(search     ? { q: search }      : {}),
            ...(activeSort ? { sort: activeSort } : {}),
          }}
        />
      )}
    </div>
  );
}
