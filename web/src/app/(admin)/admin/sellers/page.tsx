import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import SellersTableClient, { type SellerRowData } from "./SellersTableClient";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";
import CategorySubCategoryFilter from "@/components/admin/filters/CategorySubCategoryFilter";
import RealtimeSelectFilter from "@/components/admin/filters/RealtimeSelectFilter";
import { Warehouse, Store } from "lucide-react";

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

type SortKey = "revenue_desc" | "revenue_asc" | "rating_desc" | "rating_asc" | "escrow_desc" | "escrow_asc";
const VALID_SORTS: SortKey[] = ["revenue_desc", "revenue_asc", "rating_desc", "rating_asc", "escrow_desc", "escrow_asc"];

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
  searchParams: Promise<{ page?: string; status?: string; tier?: string; q?: string; sort?: string; dateFrom?: string; dateTo?: string; storeType?: string; category?: string; subCategoryId?: string; sellerId?: string }>;
}) {
  const { page, status, tier, q, sort: sortParam, dateFrom, dateTo, storeType, category, subCategoryId, sellerId } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;
  const activeSort = VALID_SORTS.includes(sortParam as SortKey) ? sortParam as SortKey : undefined;

  // Danh mục cha/con để lọc theo danh mục sản phẩm seller đăng ký
  const [resourceCategories, sellerSubCategories] = await Promise.all([
    prisma.resourceCategory.findMany({ orderBy: { displayOrder: "asc" }, select: { name: true } }),
    prisma.sellerSubCategory.findMany({ orderBy: [{ categoryName: "asc" }, { displayOrder: "asc" }], select: { id: true, name: true, categoryName: true } }),
  ]);
  const isValidCategory = !!category && resourceCategories.some((c) => c.name === category);
  const isValidSubCategory = !!subCategoryId && sellerSubCategories.some((s) => s.id === subCategoryId);

  // Revenue date filter from dateFrom/dateTo params
  const isAllTime = dateFrom === "all";
  const dateFilter =
    !isAllTime && dateFrom
      ? {
          createdAt: {
            gte: new Date(dateFrom + "T00:00:00"),
            lte: dateTo ? new Date(dateTo + "T23:59:59") : new Date(dateFrom + "T23:59:59"),
          },
        }
      : {};

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
  if (isValidSubCategory) userFilter.subCategories = { some: { subCategoryId } };

  const validStoreType = storeType === "TAI_NGUYEN_MMO" || storeType === "KHO_TAI_NGUYEN" ? storeType : undefined;

  // Danh sách seller để lọc — chỉ gồm seller thuộc kho hàng + danh mục cha/con đang chọn
  const sellerOptionRequests = await prisma.sellerRequest.findMany({
    where: {
      ...(status          ? { status: status as never }            : {}),
      ...(validStoreType  ? { storeType: validStoreType as never } : {}),
      ...(isValidCategory ? { category }                           : {}),
      ...(isValidSubCategory ? { user: { subCategories: { some: { subCategoryId } } } } : {}),
    },
    select: { userId: true, user: { select: { fullName: true, email: true } } },
    orderBy: { user: { fullName: "asc" } },
  });
  const sellerOptionsMap = new Map<string, { value: string; label: string }>();
  for (const r of sellerOptionRequests) {
    if (!sellerOptionsMap.has(r.userId)) {
      sellerOptionsMap.set(r.userId, { value: r.userId, label: r.user.fullName || r.user.email });
    }
  }
  const sellerOptions = Array.from(sellerOptionsMap.values());

  const isValidSeller = !!sellerId && sellerOptionsMap.has(sellerId);
  if (isValidSeller) userFilter.id = sellerId;

  const where = {
    ...(status          ? { status: status as never }            : {}),
    ...(validStoreType  ? { storeType: validStoreType as never } : {}),
    ...(isValidCategory ? { category }                           : {}),
    ...(Object.keys(userFilter).length > 0 ? { user: userFilter } : {}),
  };

  // Chờ duyệt STK lên đầu — tương tự trang /admin/affiliates
  const pendingBankSellerRequests = await prisma.bankChangeRequest.findMany({
    where: { status: "PENDING" },
    select: { sellerId: true },
  });
  const pendingBankSellerIds = new Set(pendingBankSellerRequests.map((r) => r.sellerId));

  const sellerRequestUserSelect = {
    id: true, email: true, fullName: true, sellerTier: true, sellerEscrow: true,
    bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
    sellerReverifyRequired: true, sellerReverifyApproved: true,
  } as const;

  // Chờ duyệt STK HOẶC đang xác minh lại CCCD (yêu cầu chưa được duyệt) — gộp chung 1 nhóm ưu tiên lên đầu
  function isPendingPriority(userId: string, user: { sellerReverifyRequired: boolean; sellerReverifyApproved: boolean }): boolean {
    return pendingBankSellerIds.has(userId) || (user.sellerReverifyRequired && !user.sellerReverifyApproved);
  }

  // Revenue sort: fetch ALL matching requests, sort in-memory, then paginate
  let requests: Awaited<ReturnType<typeof prisma.sellerRequest.findMany<{
    include: { user: { select: typeof sellerRequestUserSelect } }
  }>>>;
  let total: number;

  if (activeSort) {
    const allRequests = await prisma.sellerRequest.findMany({
      where,
      include: { user: { select: sellerRequestUserSelect } },
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
      const aPending = isPendingPriority(a.userId, a.user) ? 0 : 1;
      const bPending = isPendingPriority(b.userId, b.user) ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      if (activeSort === "revenue_desc") return (allRevenueMap.get(b.userId) ?? 0) - (allRevenueMap.get(a.userId) ?? 0);
      if (activeSort === "revenue_asc")  return (allRevenueMap.get(a.userId) ?? 0) - (allRevenueMap.get(b.userId) ?? 0);
      if (activeSort === "rating_desc")  return (allRatingMap.get(b.userId) ?? 0) - (allRatingMap.get(a.userId) ?? 0);
      if (activeSort === "rating_asc")   return (allRatingMap.get(a.userId) ?? 0) - (allRatingMap.get(b.userId) ?? 0);
      if (activeSort === "escrow_desc")  return Number(b.user.sellerEscrow) - Number(a.user.sellerEscrow);
      /* escrow_asc */                   return Number(a.user.sellerEscrow) - Number(b.user.sellerEscrow);
    });

    total = allRequests.length;
    requests = allRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  } else {
    const allRequests = await prisma.sellerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: sellerRequestUserSelect } },
    });
    // Chờ duyệt STK hoặc đang xác minh lại CCCD lên đầu — sort ổn định nên vẫn giữ thứ tự createdAt desc trong từng nhóm
    allRequests.sort((a, b) => {
      const aPending = isPendingPriority(a.userId, a.user) ? 0 : 1;
      const bPending = isPendingPriority(b.userId, b.user) ? 0 : 1;
      return aPending - bPending;
    });
    total = allRequests.length;
    requests = allRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
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

  const categoryParam = isValidCategory ? category : undefined;
  const subCategoryIdParam = isValidSubCategory ? subCategoryId : undefined;
  const sellerIdParam = isValidSeller ? sellerId : undefined;

  const nextRevenueSort = activeSort === "revenue_desc" ? "revenue_asc" : "revenue_desc";
  const revenueSortHref = buildHref({ status, tier, q: search, sort: nextRevenueSort, dateFrom, dateTo, storeType, category: categoryParam, subCategoryId: subCategoryIdParam, sellerId: sellerIdParam, page: undefined });

  const nextRatingSort = activeSort === "rating_desc" ? "rating_asc" : "rating_desc";
  const ratingSortHref = buildHref({ status, tier, q: search, sort: nextRatingSort, dateFrom, dateTo, storeType, category: categoryParam, subCategoryId: subCategoryIdParam, sellerId: sellerIdParam, page: undefined });

  const nextEscrowSort = activeSort === "escrow_desc" ? "escrow_asc" : "escrow_desc";
  const escrowSortHref = buildHref({ status, tier, q: search, sort: nextEscrowSort, dateFrom, dateTo, storeType, category: categoryParam, subCategoryId: subCategoryIdParam, sellerId: sellerIdParam, page: undefined });

  // Serialize data for client component
  const serializedRows: SellerRowData[] = requests.map((r) => {
    const tierColor = tierColorMap.get(r.user.sellerTier) ?? "gray";
    const tierColorClass = BADGE_COLOR_CLASSES[tierColor] ?? "bg-gray-100 text-gray-600";
    const rt = sellerRatingMap.get(r.userId);
    const hasBankInfo = !!(r.user.bankNameEnc && r.user.bankAccountNumberEnc && r.user.bankAccountHolderEnc);
    const bankStatus: SellerRowData["bankStatus"] = pendingBankSellerIds.has(r.userId)
      ? "PENDING"
      : hasBankInfo
        ? "APPROVED"
        : "NONE";
    const reverifyStatus: SellerRowData["reverifyStatus"] = r.user.sellerReverifyApproved
      ? "VERIFIED"
      : r.user.sellerReverifyRequired
        ? "IN_PROGRESS"
        : "NONE";
    return {
      requestId:    r.id,
      userId:       r.userId,
      fullName:     r.user.fullName,
      email:        r.user.email,
      category:     r.category,
      storeType:    r.storeType,
      status:       r.status,
      tierLabel:    tierLabelMap.get(r.user.sellerTier) ?? r.user.sellerTier,
      tierColorClass,
      productUsed:  productCountMap.get(r.userId) ?? 0,
      productMax:   maxProductsMap.get(r.userId) ?? 3,
      revenue:      revenueMap.get(r.userId) ?? 0,
      escrowAmount: Number(r.user.sellerEscrow ?? 0),
      avgRating:    rt?.avg ?? 0,
      reviewCount:  rt?.count ?? 0,
      shopLocked:   shopLockMap.get(r.userId) ?? false,
      bankStatus,
      reverifyStatus,
      createdAt:    r.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Danh sách người bán</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} tổng</span>
      </div>

      {/* ── Search + Filters ── */}
      <div className="space-y-3">
        <AdminFilterBar
          basePath="/admin/sellers"
          search={{ placeholder: "Tìm tên, email người bán..." }}
          selects={[
            {
              paramKey: "status",
              label: "Trạng thái",
              placeholder: "Tất cả trạng thái",
              options: [
                { value: "PENDING", label: "Chờ duyệt" },
                { value: "APPROVED", label: "Đã duyệt" },
                { value: "REJECTED", label: "Từ chối" },
              ],
            },
          ]}
          dateRange={{ showQuickDates: true }}
          preserveParams={["sort", "tier", "category", "subCategoryId", "storeType", "sellerId"]}
        />

        {/* Loại gian hàng + Danh mục cha/con — lọc realtime, không cần bấm nút */}
        <div className="flex flex-wrap items-center gap-3">
          <RealtimeSelectFilter
            basePath="/admin/sellers"
            paramKey="storeType"
            label="Kho hàng"
            icon={<Warehouse size={14} strokeWidth={2} />}
            placeholder="Tất cả kho hàng"
            options={[
              { value: "TAI_NGUYEN_MMO", label: "Kho tài nguyên" },
              { value: "KHO_TAI_NGUYEN", label: "Nguyên liệu" },
            ]}
          />
          <CategorySubCategoryFilter
            basePath="/admin/sellers"
            categories={resourceCategories}
            subCategories={sellerSubCategories}
          />
          <RealtimeSelectFilter
            basePath="/admin/sellers"
            paramKey="sellerId"
            label="Người bán"
            icon={<Store size={14} strokeWidth={2} />}
            placeholder="Tất cả người bán"
            options={sellerOptions}
          />
        </div>
      </div>

      <SellersTableClient
        rows={serializedRows}
        revenueSortHref={revenueSortHref}
        ratingSortHref={ratingSortHref}
        escrowSortHref={escrowSortHref}
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
            ...(dateFrom   ? { dateFrom }          : {}),
            ...(dateTo     ? { dateTo }            : {}),
            ...(isValidCategory    ? { category }        : {}),
            ...(isValidSubCategory ? { subCategoryId }   : {}),
            ...(validStoreType     ? { storeType: validStoreType } : {}),
            ...(isValidSeller      ? { sellerId }        : {}),
          }}
        />
      )}
    </div>
  );
}
