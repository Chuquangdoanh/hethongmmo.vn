import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import SellersTableClient, { type SellerRowData } from "./SellersTableClient";

export const metadata: Metadata = { title: "Admin — Sellers" };

const PAGE_SIZE = 20;

const BADGE_COLOR_CLASSES: Record<string, string> = {
  gray:   "bg-gray-100 text-gray-600",
  slate:  "bg-slate-100 text-slate-600",
  amber:  "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  green:  "bg-green-100 text-green-700",
  blue:   "bg-blue-100 text-blue-700",
  rose:   "bg-rose-100 text-rose-700",
  orange: "bg-orange-100 text-orange-700",
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

const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const YEARS = [2024, 2025, 2026, 2027];

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; tier?: string; q?: string; sort?: string; month?: string; year?: string }>;
}) {
  const { page, status, tier, q, sort: sortParam, month, year } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;
  const activeSort = VALID_SORTS.includes(sortParam as SortKey) ? sortParam as SortKey : undefined;

  // Revenue date filter
  const monthNum = month ? parseInt(month, 10) : undefined;
  const yearNum  = year  ? parseInt(year, 10)  : undefined;
  const dateFilter =
    monthNum && yearNum && monthNum >= 1 && monthNum <= 12
      ? { createdAt: { gte: new Date(yearNum, monthNum - 1, 1), lt: new Date(yearNum, monthNum, 1) } }
      : {};
  const hasDateFilter = !!(monthNum && yearNum);

  // Fetch tier definitions from DB
  const tierDefs = await prisma.sellerTierDefinition.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { key: true, label: true, badgeColor: true },
  });
  const tierLabelMap = new Map(tierDefs.map((t) => [t.key, t.label]));
  const tierColorMap = new Map(tierDefs.map((t) => [t.key, t.badgeColor]));

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

  // Revenue sort: fetch ALL matching requests, sort in-memory, then paginate
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
            where: { sellerId: { in: allUserIds }, status: "DONE", ...dateFilter },
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
          where: { sellerId: { in: userIds }, status: "DONE", ...dateFilter },
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

  const shopLockMap     = new Map(shopRows.map((r) => [r.id, r.shop_locked]));
  const maxProductsMap  = new Map(shopRows.map((r) => [r.id, r.max_seller_products ?? 3]));
  const productCountMap = new Map(productCounts.map((r) => [r.sellerId, r._count.id]));
  const revenueMap      = new Map(revenueRows.map((r) => [r.sellerId, Number(r._sum.finalPrice ?? 0)]));
  const sellerRatingMap = new Map(sellerRatingRows.map((r) => [r.seller_id, { avg: r.avg_rating, count: Number(r.review_count) }]));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const nextRevenueSort = activeSort === "revenue_desc" ? "revenue_asc" : "revenue_desc";
  const revenueSortHref = buildHref({ status, tier, q: search, sort: nextRevenueSort, month, year, page: undefined });

  const nextRatingSort = activeSort === "rating_desc" ? "rating_asc" : "rating_desc";
  const ratingSortHref = buildHref({ status, tier, q: search, sort: nextRatingSort, month, year, page: undefined });

  // Serialize data for client component
  const serializedRows: SellerRowData[] = requests.map((r) => {
    const tierColor = tierColorMap.get(r.user.sellerTier) ?? "gray";
    const tierColorClass = BADGE_COLOR_CLASSES[tierColor] ?? "bg-gray-100 text-gray-600";
    const rt = sellerRatingMap.get(r.userId);
    return {
      requestId:    r.id,
      userId:       r.userId,
      fullName:     r.user.fullName,
      email:        r.user.email,
      category:     r.category,
      status:       r.status,
      tierLabel:    tierLabelMap.get(r.user.sellerTier) ?? r.user.sellerTier,
      tierColorClass,
      productUsed:  productCountMap.get(r.userId) ?? 0,
      productMax:   maxProductsMap.get(r.userId) ?? 3,
      revenue:      revenueMap.get(r.userId) ?? 0,
      avgRating:    rt?.avg ?? 0,
      reviewCount:  rt?.count ?? 0,
      shopLocked:   shopLockMap.get(r.userId) ?? false,
      createdAt:    r.createdAt.toISOString(),
    };
  });

  const clearDateHref = buildHref({ status, tier, q: search, sort: activeSort, page: undefined });

  return (
    <div className="space-y-6">
      {/* ── Header row: title + date filter ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách người bán</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} tổng</span>
        </div>

        {/* Revenue date filter — right side */}
        <form method="get" action="/admin/sellers" className="flex items-center gap-2 flex-wrap">
          {status    && <input type="hidden" name="status" value={status} />}
          {tier      && <input type="hidden" name="tier"   value={tier} />}
          {search    && <input type="hidden" name="q"      value={search} />}
          {activeSort && <input type="hidden" name="sort"  value={activeSort} />}

          <span className="text-xs text-gray-500 whitespace-nowrap">Lọc doanh số:</span>

          <select
            name="month"
            defaultValue={month ?? ""}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-violet-400 focus:outline-none transition-colors"
          >
            <option value="">Tháng</option>
            {MONTHS.map((label, idx) => (
              <option key={idx + 1} value={String(idx + 1)}>{label}</option>
            ))}
          </select>

          <select
            name="year"
            defaultValue={year ?? ""}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-violet-400 focus:outline-none transition-colors"
          >
            <option value="">Năm</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
          >
            Lọc
          </button>

          {hasDateFilter && (
            <a
              href={clearDateHref}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              Xóa lọc
            </a>
          )}
        </form>
      </div>

      {/* ── Search + Tier filter ── */}
      <form method="get" action="/admin/sellers" className="flex items-center gap-2 flex-wrap">
        {status && <input type="hidden" name="status" value={status} />}
        {month  && <input type="hidden" name="month"  value={month} />}
        {year   && <input type="hidden" name="year"   value={year} />}
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
        <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
          Tìm kiếm
        </button>
        {search && (
          <a href={buildHref({ status, tier, month, year })} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors">
            Xóa
          </a>
        )}

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* Tier chips */}
        <a
          href={buildHref({ status, tier: undefined, q: search, month, year })}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            !tier ? "bg-[#7C3AED] text-white" : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
          }`}
        >
          Tất cả hạng
        </a>
        {tierDefs.map(({ key, label }) => (
          <a
            key={key}
            href={buildHref({ status, tier: key, q: search, month, year })}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tier === key ? "bg-[#7C3AED] text-white" : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
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
            href={buildHref({ status: key || undefined, tier, q: search, month, year })}
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

      {/* ── Date filter indicator ── */}
      {hasDateFilter && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
            Doanh số: {MONTHS[(monthNum ?? 1) - 1]} {yearNum}
          </span>
          <a href={clearDateHref} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">✕ Xóa</a>
        </div>
      )}

      <SellersTableClient
        rows={serializedRows}
        revenueSortHref={revenueSortHref}
        ratingSortHref={ratingSortHref}
        activeSort={activeSort}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/sellers"
          searchParams={{
            ...(status     ? { status }           : {}),
            ...(tier       ? { tier }             : {}),
            ...(search     ? { q: search }        : {}),
            ...(activeSort ? { sort: activeSort } : {}),
            ...(month      ? { month }            : {}),
            ...(year       ? { year }             : {}),
          }}
        />
      )}
    </div>
  );
}
