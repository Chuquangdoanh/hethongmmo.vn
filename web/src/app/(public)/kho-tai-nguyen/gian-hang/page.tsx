import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Pagination from "@/components/shared/Pagination";
import { prisma } from "@/lib/db/prisma";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import {
  Store, BadgeCheck, Star, ShoppingCart, Package, ChevronRight, Building2,
} from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";
import { SellerFilterSidebar } from "@/app/(public)/tai-nguyen-mmo/gian-hang/_components/SellerFilterSidebar";
import type { SellerCategoryItem } from "@/app/(public)/tai-nguyen-mmo/gian-hang/_components/SellerFilterSidebar";
import { SellerSortSelect } from "@/app/(public)/tai-nguyen-mmo/gian-hang/_components/SellerSortSelect";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "Gian Hàng Kho Tài Nguyên | Hệ Thống MMO",
  description: "Các nhà bán hàng uy tín trong Kho Tài Nguyên — tài khoản, công cụ MMO chất lượng cao.",
  url: "/kho-tai-nguyen/gian-hang",
  image: "/images/hethongmmo.png",
});

const BADGE_STYLE_MAP: Record<string, string> = {
  gray:   "bg-gray-100 text-gray-600",
  slate:  "bg-slate-100 text-slate-600",
  amber:  "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
};

const SELLER_PAGE_SIZE = 12;

const AVATAR_GRADIENTS = [
  "from-[#0d9488] to-[#0284c7]",
  "from-[#7c3aed] to-[#2563eb]",
  "from-[#dc2626] to-[#d97706]",
  "from-[#059669] to-[#0d9488]",
  "from-[#0284c7] to-[#7c3aed]",
  "from-[#d97706] to-[#dc2626]",
];

function idToGradientIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % AVATAR_GRADIENTS.length;
}

export default async function KhoGianHangPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string; q?: string; rating?: string; page?: string }>;
}) {
  await guardPublicPage("kho-tai-nguyen");
  const sp = await searchParams;

  const activeSort     = sp.sort     ?? "pho-bien";
  const activeCategory = sp.category ?? "";
  const q              = sp.q?.trim() ?? "";
  const minRating      = sp.rating ? Number(sp.rating) : 0;
  const currentPage    = Math.max(1, Number(sp.page ?? 1) || 1);

  const [allSellers, systemProductCount, systemOrderCount, systemReviewStats] = await Promise.all([
  prisma.user.findMany({
    where: {
      sellerStatus: "APPROVED",
      shopLocked: false,
      deletedAt: null,
      sellerProducts: {
        some: {
          isActive: true,
          isHidden: false,
          isRestricted: false,
          deletedAt: null,
          storeType: "KHO_TAI_NGUYEN",
          stockItems: { some: { status: "AVAILABLE" } },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      sellerTier: true,
      sellerCategory: true,
      createdAt: true,
      sellerProducts: {
        where: {
          isActive: true,
          isHidden: false,
          isRestricted: false,
          deletedAt: null,
          storeType: "KHO_TAI_NGUYEN",
        },
        select: { id: true, salesCount: true },
      },
    },
    orderBy: { createdAt: "asc" },
  }),
  prisma.mmoProduct.count({ where: { isActive: true, deletedAt: null } }),
  prisma.order.count({ where: { NOT: { mmoProductId: null }, status: "DONE" } }),
  prisma.review.aggregate({
    where: { productType: "MMO_PRODUCT" },
    _avg: { rating: true },
    _count: { id: true },
  }),
  ]);

  const systemAvgRating   = systemReviewStats._avg.rating ?? 0;
  const systemReviewCount = systemReviewStats._count.id;

  const sellerIds = allSellers.map((s) => s.id);

  const [reviews, orderStats, resourceCategories, tierDefs] = sellerIds.length > 0
    ? await Promise.all([
        prisma.review.findMany({
          where: {
            productType: "SELLER_PRODUCT",
            order: { sellerId: { in: sellerIds } },
          },
          select: {
            rating: true,
            order: { select: { sellerId: true } },
          },
        }),
        prisma.order.groupBy({
          by: ["sellerId"],
          where: { sellerId: { in: sellerIds }, status: "DONE" },
          _count: { id: true },
        }),
        prisma.resourceCategory.findMany({
          select: { name: true, iconUrl: true },
        }),
        prisma.sellerTierDefinition.findMany({
          where: { isActive: true },
          select: { key: true, label: true, badgeColor: true },
        }),
      ])
    : [[], [], [], []];

  const reviewMap = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    const sid = r.order?.sellerId;
    if (!sid) continue;
    const cur = reviewMap.get(sid) ?? { sum: 0, count: 0 };
    reviewMap.set(sid, { sum: cur.sum + r.rating, count: cur.count + 1 });
  }
  const orderMap = new Map(
    orderStats.map((o) => [o.sellerId ?? "", o._count.id])
  );

  type EnrichedSeller = {
    id: string;
    name: string;
    avatarUrl: string | null;
    tier: { label: string; badgeColor: string };
    category: string;
    productCount: number;
    totalSales: number;
    completedOrders: number;
    avgRating: number;
    reviewCount: number;
    createdAt: Date;
  };

  const tierMap = new Map(
    (tierDefs as { key: string; label: string; badgeColor: string }[]).map((t) => [
      t.key,
      { label: t.label, badgeColor: t.badgeColor },
    ])
  );
  const defaultTier = { label: "Tiêu chuẩn", badgeColor: "gray" };

  let enriched: EnrichedSeller[] = allSellers.map((s) => {
    const rv       = reviewMap.get(s.id);
    const avgRating = rv && rv.count > 0 ? rv.sum / rv.count : 0;
    const totalSales = s.sellerProducts.reduce((acc, p) => acc + p.salesCount, 0);
    return {
      id: s.id,
      name: s.fullName,
      avatarUrl: s.avatarUrl ?? null,
      tier: tierMap.get(s.sellerTier) ?? defaultTier,
      category: s.sellerCategory ?? "Khác",
      productCount: s.sellerProducts.length,
      totalSales,
      completedOrders: orderMap.get(s.id) ?? 0,
      avgRating,
      reviewCount: rv?.count ?? 0,
      createdAt: s.createdAt,
    };
  });

  const catCounts: Record<string, number> = {};
  for (const s of enriched) {
    catCounts[s.category] = (catCounts[s.category] ?? 0) + 1;
  }
  const iconMap = new Map(
    (resourceCategories as { name: string; iconUrl: string | null }[]).map((c) => [c.name, c.iconUrl])
  );
  const categories: SellerCategoryItem[] = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, iconUrl: iconMap.get(name) ?? null }));

  if (activeCategory) enriched = enriched.filter((s) => s.category === activeCategory);
  if (q) {
    const lq = q.toLowerCase();
    enriched = enriched.filter((s) =>
      s.name.toLowerCase().includes(lq) || s.category.toLowerCase().includes(lq)
    );
  }
  if (minRating > 0) enriched = enriched.filter((s) => s.avgRating >= minRating);

  if (activeSort === "ban-chay") {
    enriched = [...enriched].sort((a, b) => b.completedOrders - a.completedOrders);
  } else if (activeSort === "danh-gia") {
    enriched = [...enriched].sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
  } else if (activeSort === "moi-nhat") {
    enriched = [...enriched].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    enriched = [...enriched].sort((a, b) => b.totalSales - a.totalSales);
  }

  const totalSellerCount = enriched.length + 1; // +1 for system card
  const totalSellerPages = Math.ceil(totalSellerCount / SELLER_PAGE_SIZE);
  const showSystemOnThisPage = currentPage === 1;
  const pagedEnriched = enriched.slice(
    currentPage === 1 ? 0 : (currentPage - 1) * SELLER_PAGE_SIZE - 1,
    currentPage === 1 ? SELLER_PAGE_SIZE - 1 : currentPage * SELLER_PAGE_SIZE - 1,
  );

  const sellerPageParams: Record<string, string> = {};
  if (sp.sort)     sellerPageParams["sort"]     = sp.sort;
  if (sp.category) sellerPageParams["category"] = sp.category;
  if (sp.q)        sellerPageParams["q"]        = sp.q;
  if (sp.rating)   sellerPageParams["rating"]   = sp.rating;

  return (
    <div className="min-h-screen bg-[#f1f5f9]">

      <div className="mx-auto max-w-370 px-4 md:px-5 py-6">

        {/* View tabs + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
          <div className="flex items-center gap-0.5 bg-white rounded-xl border border-border p-1 w-fit">
            <Link
              href="/kho-tai-nguyen"
              scroll={false}
              className="px-4 py-2 text-sm font-semibold text-text-muted hover:text-primary hover:bg-[#f1f5f9] rounded-lg transition-colors whitespace-nowrap"
            >
              Tất cả sản phẩm
            </Link>
            <span className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg flex items-center gap-1.5 whitespace-nowrap">
              <Store size={14} strokeWidth={2} />
              Gian hàng Kho
            </span>
          </div>
          <div className="overflow-x-auto">
            <SellerSortSelect basePath="/kho-tai-nguyen/gian-hang" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">

          <Suspense fallback={
            <aside className="w-full lg:w-70">
              <div className="bg-white rounded-xl border border-border h-80 animate-pulse" />
            </aside>
          }>
            <SellerFilterSidebar categories={categories} totalCount={totalSellerCount} basePath="/kho-tai-nguyen/gian-hang" />
          </Suspense>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-dark">{totalSellerCount}</span> gian hàng
                {activeCategory && (
                  <span className="ml-1">
                    trong <span className="font-semibold text-text-dark">&quot;{activeCategory}&quot;</span>
                  </span>
                )}
              </p>
            </div>

            {pagedEnriched.length === 0 && !showSystemOnThisPage ? (
              <div className="text-center py-24 bg-white rounded-xl border border-border">
                <div className="flex justify-center mb-4">
                  <Store size={52} strokeWidth={1.25} className="text-[#cbd5e1]" />
                </div>
                <p className="font-semibold text-text-dark text-base">Chưa có gian hàng nào</p>
                <p className="text-sm text-text-muted mt-1">Thử điều chỉnh bộ lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">

                {/* Hệ Thống MMO — pinned first on page 1 */}
                {showSystemOnThisPage && (
                  <div className="bg-white rounded-xl border border-[#6d28d9]/30 overflow-hidden hover:shadow-md hover:border-[#6d28d9]/60 transition-all flex flex-col relative">
                    <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6d28d9] text-white">
                      Chính thức
                    </span>
                    <div className="h-14 bg-linear-to-br from-[#6d28d9] to-[#0066ff]" />
                    <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1 -mt-7">
                      <div className="w-14 h-14 rounded-full bg-linear-to-br from-[#6d28d9] to-[#0066ff] ring-2 ring-white flex items-center justify-center shadow-md">
                        <Building2 size={24} strokeWidth={1.5} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <h3 className="text-sm font-extrabold text-text-dark">Hệ Thống MMO</h3>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                            <BadgeCheck size={9} strokeWidth={2.5} /> Xác minh
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-text-muted">Nền tảng</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Nền tảng</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-light rounded-lg py-2 px-1">
                          <p className="text-xs font-extrabold text-text-dark">
                            {systemAvgRating > 0 ? systemAvgRating.toFixed(1) : "—"}
                          </p>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <Star size={8} fill="#f59e0b" className="text-warning" />
                            <span className="text-[9px] text-text-muted">({systemReviewCount})</span>
                          </div>
                        </div>
                        <div className="bg-light rounded-lg py-2 px-1">
                          <p className="text-xs font-extrabold text-text-dark">{systemProductCount}</p>
                          <p className="text-[9px] text-text-muted mt-0.5 flex items-center justify-center gap-0.5">
                            <Package size={7} strokeWidth={2} /> SP
                          </p>
                        </div>
                        <div className="bg-light rounded-lg py-2 px-1">
                          <p className="text-xs font-extrabold text-text-dark">
                            {systemOrderCount > 999 ? `${(systemOrderCount / 1000).toFixed(1)}k` : systemOrderCount}
                          </p>
                          <p className="text-[9px] text-text-muted mt-0.5 flex items-center justify-center gap-0.5">
                            <ShoppingCart size={7} strokeWidth={2} /> Bán
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/tai-nguyen-mmo/he-thong"
                        className="mt-auto w-full py-2 rounded-lg border border-[#6d28d9] text-[#6d28d9] text-xs font-bold hover:bg-[#6d28d9] hover:text-white transition-all text-center flex items-center justify-center gap-1"
                      >
                        Xem gian hàng
                        <ChevronRight size={12} strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                )}
                {pagedEnriched.map((seller) => {
                  const gradient = AVATAR_GRADIENTS[idToGradientIndex(seller.id)]!;
                  const displayRating = seller.avgRating > 0 ? seller.avgRating.toFixed(1) : null;
                  return (
                    <div
                      key={seller.id}
                      className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
                    >
                      <div className={`h-14 bg-linear-to-br ${gradient}`} />
                      <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1 -mt-7">
                        {seller.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r2Url(seller.avatarUrl)}
                            alt={seller.name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-md"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-full bg-linear-to-br ${gradient} ring-2 ring-white flex items-center justify-center shadow-md`}>
                            <Store size={24} strokeWidth={1.5} className="text-white" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h3 className="text-sm font-extrabold text-text-dark">{seller.name}</h3>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                              <BadgeCheck size={9} strokeWidth={2.5} /> Xác minh
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-text-muted truncate">{seller.category}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${BADGE_STYLE_MAP[seller.tier.badgeColor] ?? BADGE_STYLE_MAP["gray"]}`}>
                              {seller.tier.label}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="bg-light rounded-lg py-2 px-1">
                            <p className="text-xs font-extrabold text-text-dark">
                              {displayRating ?? "—"}
                            </p>
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <Star size={8} fill="#f59e0b" className="text-warning" />
                              <span className="text-[9px] text-text-muted">({seller.reviewCount})</span>
                            </div>
                          </div>
                          <div className="bg-light rounded-lg py-2 px-1">
                            <p className="text-xs font-extrabold text-text-dark">{seller.productCount}</p>
                            <p className="text-[9px] text-text-muted mt-0.5 flex items-center justify-center gap-0.5">
                              <Package size={7} strokeWidth={2} /> SP
                            </p>
                          </div>
                          <div className="bg-light rounded-lg py-2 px-1">
                            <p className="text-xs font-extrabold text-text-dark">
                              {seller.totalSales > 999 ? `${(seller.totalSales / 1000).toFixed(1)}k` : seller.totalSales}
                            </p>
                            <p className="text-[9px] text-text-muted mt-0.5 flex items-center justify-center gap-0.5">
                              <ShoppingCart size={7} strokeWidth={2} /> Bán
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/kho-tai-nguyen/nguoi-ban/${seller.id}`}
                          className="mt-auto w-full py-2 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all text-center flex items-center justify-center gap-1"
                        >
                          Xem gian hàng
                          <ChevronRight size={12} strokeWidth={2.5} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalSellerPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalSellerPages}
                basePath="/kho-tai-nguyen/gian-hang"
                searchParams={sellerPageParams}
                scrollToTop
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
