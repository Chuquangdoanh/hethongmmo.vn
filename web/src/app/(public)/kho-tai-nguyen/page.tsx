import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import ProductBuyButton from "@/app/(public)/tai-nguyen-mmo/_components/ProductBuyButton";
import Pagination from "@/components/shared/Pagination";
import { SortSelect } from "@/app/(public)/tai-nguyen-mmo/_components/SortSelect";
import { buildMeta } from "@/lib/utils/seo";
import { KhoFilterSidebar } from "./_components/KhoFilterSidebar";
import {
  Package, ShoppingBag, ShoppingCart, Store,
  Pencil, CheckCircle, FolderOpen, Search,
  Users, TrendingUp, Clock, Shield, Star, ChevronRight,
} from "lucide-react";

export const metadata: Metadata = buildMeta({
  title: "Kho Tài Nguyên | Hệ Thống MMO",
  description: "Kho tài nguyên số chất lượng cao — tài khoản, công cụ MMO, giao hàng tự động sau thanh toán.",
  url: "/kho-tai-nguyen",
  image: "/images/hethongmmo.png",
});

const PAGE_SIZE = 20;
const BASE_PATH = "/kho-tai-nguyen";
type SortId = "noi-bat" | "ban-chay" | "moi-nhat" | "gia-cao" | "gia-thap";

function StarBar({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? "text-warning" : "text-[#e2e8f0]"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function tierBadge(tier: string | null): { label: string; bg: string; fg: string } | null {
  if (!tier) return null;
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    GOLD:     { label: "TOP SELLER", bg: "#fef3c7", fg: "#b45309" },
    SILVER:   { label: "VERIFIED",   bg: "#dbeafe", fg: "#1d4ed8" },
    STANDARD: { label: "SELLER",     bg: "#f1f5f9", fg: "#475569" },
  };
  return map[tier.toUpperCase()] ?? { label: tier, bg: "#f1f5f9", fg: "#475569" };
}

export default async function KhoTaiNguyenPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string; price?: string; page?: string; subcategory?: string }>;
}) {
  await guardPublicPage("kho-tai-nguyen");

  const [
    { category: categoryParam, sort: sortParam, q: rawQ, price: priceParam, page: pageParam, subcategory: subcatParam },
    session,
  ] = await Promise.all([searchParams, auth()]);

  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);
  const activeSort = (sortParam as SortId | undefined) ?? "noi-bat";
  const q = rawQ?.trim() || undefined;
  const me = session?.user as AuthenticatedUser | undefined;
  const isLoggedIn = !!me;

  const selectedCategories = categoryParam ? categoryParam.split(",").filter(Boolean) : [];
  const selectedSubcatNames = subcatParam ? subcatParam.split(",").filter(Boolean) : [];

  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (priceParam) {
    const parts = priceParam.split("-");
    const rawMin = parts[0];
    const rawMax = parts[1];
    if (rawMin !== undefined) { const n = Number(rawMin); if (!isNaN(n)) minPrice = n; }
    if (rawMax !== undefined) { const n = Number(rawMax); if (!isNaN(n) && n < 9_999_999_999) maxPrice = n; }
  }
  const priceFilter =
    minPrice !== undefined || maxPrice !== undefined
      ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
      : {};

  type LockedRow = { id: string };
  const lockedSellerRows = await prisma.$queryRaw<LockedRow[]>`SELECT id FROM users WHERE shop_locked = true`;
  const lockedSellerIds = lockedSellerRows.map((r) => r.id);
  const notLockedFilter = lockedSellerIds.length > 0 ? { NOT: { sellerId: { in: lockedSellerIds } } } : {};

  const subCatIds =
    selectedSubcatNames.length > 0
      ? (
          await prisma.sellerSubCategory.findMany({
            where: { name: { in: selectedSubcatNames }, isActive: true },
            select: { id: true },
          })
        ).map((s) => s.id)
      : [];

  const baseWhere = {
    isActive: true,
    isHidden: false,
    isRestricted: false,
    deletedAt: null,
    storeType: "KHO_TAI_NGUYEN" as const,
    stockItems: { some: { status: "AVAILABLE" as const } },
    ...notLockedFilter,
  };

  const filteredWhere = {
    ...baseWhere,
    ...(selectedCategories.length > 0 ? { sellerCategory: { in: selectedCategories } } : {}),
    ...(subCatIds.length > 0 ? { subCategoryId: { in: subCatIds } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...priceFilter,
  };

  const orderBy =
    activeSort === "ban-chay" ? [{ salesCount: "desc" as const }]
    : activeSort === "moi-nhat" ? [{ createdAt: "desc" as const }]
    : activeSort === "gia-cao"  ? [{ price: "desc" as const }]
    : activeSort === "gia-thap" ? [{ price: "asc" as const }]
    : [{ salesCount: "desc" as const }, { createdAt: "desc" as const }];

  const [allStatProducts, filteredProducts, resourceCategories, reviewStats, topSellerRows] = await Promise.all([
    prisma.sellerProduct.findMany({
      where: baseWhere,
      select: { id: true, sellerCategory: true, sellerId: true, subCategoryId: true },
    }),
    prisma.sellerProduct.findMany({
      where: filteredWhere,
      orderBy,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        sellerCategory: true,
        description: true,
        price: true,
        salesCount: true,
        createdAt: true,
        seller: { select: { id: true, uidPrefix: true } },
        _count: { select: { stockItems: { where: { status: "AVAILABLE" as const } } } },
      },
    }),
    prisma.resourceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        iconUrl: true,
        subCategories: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { productType: "SELLER_PRODUCT" },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.$queryRaw<Array<{ seller_id: string; order_count: number }>>`
      SELECT sp.seller_id, COUNT(o.id)::int AS order_count
      FROM seller_products sp
      LEFT JOIN orders o ON o.seller_product_id = sp.id AND o.status = 'DONE'
      WHERE sp.store_type = 'KHO_TAI_NGUYEN' AND sp.deleted_at IS NULL
      GROUP BY sp.seller_id
      ORDER BY order_count DESC
      LIMIT 5
    `,
  ]);

  const topSellerIds = topSellerRows.map((r) => r.seller_id);
  const [topSellerUsers, purchasedIds, reviewedIds] = await Promise.all([
    topSellerIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: topSellerIds } },
          select: { id: true, uidPrefix: true, avatarUrl: true, sellerTier: true },
        })
      : ([] as Array<{ id: string; uidPrefix: string; avatarUrl: string | null; sellerTier: string }>),
    me
      ? prisma.order
          .findMany({
            where: { userId: me.id, orderType: "SELLER_PRODUCT", status: "DONE" },
            select: { sellerProductId: true },
            distinct: ["sellerProductId"],
          })
          .then((rows) => new Set(rows.map((r) => r.sellerProductId!).filter(Boolean)))
      : new Set<string>(),
    me
      ? prisma.review
          .findMany({
            where: { userId: me.id, productType: "SELLER_PRODUCT" },
            select: { productId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.productId)))
      : new Set<string>(),
  ]);

  // Build platform stats
  const platformProductCount = new Map<string, number>();
  const platformSellerSet = new Map<string, Set<string>>();
  for (const p of allStatProducts) {
    platformProductCount.set(p.sellerCategory, (platformProductCount.get(p.sellerCategory) ?? 0) + 1);
    if (!platformSellerSet.has(p.sellerCategory)) platformSellerSet.set(p.sellerCategory, new Set());
    platformSellerSet.get(p.sellerCategory)!.add(p.sellerId);
  }

  // Subcategory count map
  const allSubCatById = new Map(
    resourceCategories.flatMap((rc) => rc.subCategories.map((s) => [s.id, s.name] as [string, string]))
  );
  const subCatCountMap = new Map<string, number>();
  for (const p of allStatProducts) {
    if (p.subCategoryId) {
      const name = allSubCatById.get(p.subCategoryId);
      if (name) subCatCountMap.set(name, (subCatCountMap.get(name) ?? 0) + 1);
    }
  }

  // Filter sidebar props
  const platformsForFilter = [...platformProductCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const resourceTypesForFilter = [...subCatCountMap.entries()]
    .map(([name, count]) => ({ id: name, name, count }))
    .sort((a, b) => b.count - a.count);

  // Platform cards for "Danh mục nổi bật"
  const platformCards = resourceCategories
    .filter((rc) => platformProductCount.has(rc.name))
    .map((rc) => ({
      name: rc.name,
      iconUrl: rc.iconUrl,
      count: platformProductCount.get(rc.name) ?? 0,
      sellerCount: platformSellerSet.get(rc.name)?.size ?? 0,
      tags: rc.subCategories.slice(0, 3).map((s) => s.name),
      extraTags: Math.max(0, rc.subCategories.length - 3),
    }));

  // Featured platform subcategory cards
  const featuredPlatformName = selectedCategories[0] ?? platformCards[0]?.name;
  const featuredPlatformSubcats = featuredPlatformName
    ? (resourceCategories.find((rc) => rc.name === featuredPlatformName)?.subCategories ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        count: subCatCountMap.get(s.name) ?? 0,
      }))
    : [];

  // Review map
  const reviewMap = new Map(reviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }]));

  // Seller rating aggregate (for top sellers card)
  const sellerRatingAgg = new Map<string, { total: number; count: number }>();
  for (const p of allStatProducts) {
    const rev = reviewMap.get(p.id);
    if (rev && rev.count > 0) {
      const existing = sellerRatingAgg.get(p.sellerId) ?? { total: 0, count: 0 };
      existing.total += rev.avg * rev.count;
      existing.count += rev.count;
      sellerRatingAgg.set(p.sellerId, existing);
    }
  }

  const topSellers = topSellerIds
    .map((id) => {
      const user = topSellerUsers.find((u) => u.id === id);
      if (!user) return null;
      const rating = sellerRatingAgg.get(id);
      return {
        id,
        uidPrefix: user.uidPrefix,
        avatarUrl: user.avatarUrl,
        tier: user.sellerTier,
        orderCount: Number(topSellerRows.find((r) => r.seller_id === id)?.order_count ?? 0),
        avgRating: rating ? rating.total / rating.count : 0,
        reviewCount: rating?.count ?? 0,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Paginate
  const fourteenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stripHtml = (html: string | null) => (html ? html.replace(/<[^>]*>/g, "").trim() || null : null);
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (categoryParam) paginationParams["category"]    = categoryParam;
  if (sortParam)     paginationParams["sort"]        = sortParam;
  if (rawQ)          paginationParams["q"]           = rawQ;
  if (priceParam)    paginationParams["price"]       = priceParam;
  if (subcatParam)   paginationParams["subcategory"] = subcatParam;

  const totalSellers = new Set(allStatProducts.map((p) => p.sellerId)).size;
  const AVATAR_GRADIENTS = [
    "from-[#3b82f6] to-[#6366f1]",
    "from-[#f59e0b] to-[#ef4444]",
    "from-[#10b981] to-[#06b6d4]",
    "from-[#8b5cf6] to-[#ec4899]",
    "from-[#14b8a6] to-[#22c55e]",
  ] as const;

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="mx-auto max-w-[1380px] px-3 py-4 flex items-start gap-4">

        {/* ── LEFT FILTER SIDEBAR ── */}
        <Suspense fallback={<div className="w-[210px] shrink-0 bg-white rounded-2xl h-96 animate-pulse" />}>
          <KhoFilterSidebar platforms={platformsForFilter} resourceTypes={resourceTypesForFilter} />
        </Suspense>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Banner */}
          <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#0f2460] via-[#1a3a8f] to-[#0d1f5e]">
            <div className="px-6 py-6 relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <FolderOpen size={22} className="text-[#7dd3fc]" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white leading-tight">Kho Tài Nguyên MMO</h1>
                  <p className="text-[#93c5fd] text-xs mt-0.5">Tài nguyên chất lượng cao — giao tự động sau thanh toán</p>
                </div>
              </div>

              {/* Search */}
              <form action={BASE_PATH} className="flex gap-2 mt-4 max-w-lg">
                {categoryParam && <input type="hidden" name="category" value={categoryParam} />}
                {subcatParam   && <input type="hidden" name="subcategory" value={subcatParam} />}
                {priceParam    && <input type="hidden" name="price" value={priceParam} />}
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    name="q"
                    defaultValue={q}
                    type="text"
                    placeholder="Tìm kiếm tài nguyên, seller..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/35 text-sm focus:outline-none focus:bg-white/20 focus:border-white/30 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm px-5 rounded-xl transition-colors whitespace-nowrap"
                >
                  Tìm kiếm
                </button>
              </form>

              {/* Stats row */}
              <div className="flex items-center gap-5 mt-5 flex-wrap">
                {[
                  { icon: Package, value: `${allStatProducts.length.toLocaleString("vi-VN")}+`, label: "Tài nguyên" },
                  { icon: Users,   value: `${totalSellers}+`,                                    label: "Nhà bán hàng" },
                  { icon: Shield,  value: "99.9%",                                               label: "Thành công" },
                  { icon: Clock,   value: "24/7",                                                label: "Hỗ trợ" },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Icon size={14} className="text-[#93c5fd]" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm leading-tight">{value}</p>
                      <p className="text-[#93c5fd] text-[10px]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-[#1e40af]/20 to-transparent pointer-events-none" />
          </div>

          {/* Danh mục nổi bật */}
          {platformCards.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#1e293b] text-[15px]">Danh mục nổi bật</h2>
                <Link href={BASE_PATH} className="text-xs text-[#3b82f6] font-bold hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {platformCards.map((card) => (
                  <Link
                    key={card.name}
                    href={`${BASE_PATH}?category=${encodeURIComponent(card.name)}`}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[#f1f5f9] hover:border-[#3b82f6]/40 hover:bg-[#eff6ff]/50 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#f1f5f9] shrink-0 flex items-center justify-center">
                      {card.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r2Url(card.iconUrl)} alt={card.name} className="w-full h-full object-contain" />
                      ) : (
                        <FolderOpen size={16} className="text-[#94a3b8]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13px] text-[#1e293b] group-hover:text-[#2563eb] transition-colors truncate">
                        {card.name}
                      </p>
                      <p className="text-[11px] text-[#64748b]">
                        {card.count.toLocaleString("vi-VN")} · {card.sellerCount} seller
                      </p>
                      {card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {card.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-px rounded text-[9px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                              {tag}
                            </span>
                          ))}
                          {card.extraTags > 0 && (
                            <span className="px-1.5 py-px rounded text-[9px] font-bold bg-[#f1f5f9] text-[#64748b]">
                              +{card.extraTags}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Loại tài nguyên theo platform */}
          {featuredPlatformSubcats.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#1e293b] text-[15px]">
                  Loại tài nguyên{featuredPlatformName ? ` ${featuredPlatformName}` : ""}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {featuredPlatformSubcats.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`${BASE_PATH}?${selectedCategories.length > 0 ? `category=${encodeURIComponent(selectedCategories[0] ?? "")}&` : ""}subcategory=${encodeURIComponent(sub.name)}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[13px] font-semibold transition-all hover:shadow-sm ${
                      selectedSubcatNames.includes(sub.name)
                        ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]"
                        : "border-[#e2e8f0] bg-[#f8fafc] text-[#374151] hover:border-[#3b82f6]/40 hover:bg-[#eff6ff]/40"
                    }`}
                  >
                    <span>{sub.name}</span>
                    {sub.count > 0 && (
                      <span className="text-[10px] text-[#94a3b8] font-normal">{sub.count}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sản phẩm nổi bật */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#1e293b] text-[15px]">Sản phẩm nổi bật</h2>
                {totalCount > 0 && (
                  <span className="text-[11px] text-[#94a3b8]">
                    ({totalCount.toLocaleString("vi-VN")} sản phẩm)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/kho-tai-nguyen/gian-hang"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors whitespace-nowrap"
                >
                  <Store size={12} />
                  Gian hàng
                </Link>
                <SortSelect basePath={BASE_PATH} />
              </div>
            </div>

            {totalCount === 0 ? (
              <div className="text-center py-20">
                <Package size={44} strokeWidth={1.25} className="text-[#cbd5e1] mx-auto mb-3" />
                <p className="font-semibold text-[#475569]">Chưa có sản phẩm nào</p>
                <p className="text-xs text-[#94a3b8] mt-1">Thử điều chỉnh bộ lọc</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {pagedProducts.map((sp) => {
                  const review  = reviewMap.get(sp.id);
                  const price   = Number(sp.price);
                  const avail   = sp._count.stockItems;
                  const isNew   = sp.createdAt > fourteenDaysAgo;
                  const isHot   = sp.salesCount >= 15;
                  const seller  = `#${sp.seller.uidPrefix}`;
                  const bought  = purchasedIds.has(sp.id);
                  const rated   = reviewedIds.has(sp.id);
                  const desc    = stripHtml(sp.description ?? null);
                  const href    = `/tai-nguyen-mmo/san-pham/${sp.id}`;

                  return (
                    <div
                      key={sp.id}
                      className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden hover:shadow-md hover:border-[#3b82f6]/40 transition-all flex flex-col"
                    >
                      <Link href={href} className="block relative shrink-0">
                        <div className="aspect-video bg-[#f8fafc] overflow-hidden relative">
                          {sp.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r2Url(sp.imageUrl)}
                              alt={sp.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={32} strokeWidth={1.25} className="text-[#94a3b8]" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-[#1d4ed8]/85 text-white">
                              {sp.sellerCategory}
                            </span>
                            {isHot && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-danger text-white uppercase">
                                HOT
                              </span>
                            )}
                            {!isHot && isNew && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#22c55e] text-white uppercase">
                                NEW
                              </span>
                            )}
                          </div>
                          {review && review.count > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-2.5 pt-5 pb-2">
                              <div className="flex items-center gap-1">
                                <StarBar rating={review.avg} size="xs" />
                                <span className="text-[11px] font-bold text-white leading-none">{review.avg.toFixed(1)}</span>
                                <span className="text-[10px] text-white/60">({review.count})</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-3 flex flex-col gap-1.5 flex-1">
                        <Link href={href}>
                          <h3 className="text-sm font-bold text-[#1e293b] hover:text-[#2563eb] transition-colors line-clamp-2 leading-snug">
                            {sp.name}
                          </h3>
                        </Link>
                        {desc && (
                          <p className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed">{desc}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                          <span>Seller: <strong className="text-[#475569]">{seller}</strong></span>
                          <span>·</span>
                          <span>Còn <strong className="text-[#374151]">{avail}</strong></span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart size={8} strokeWidth={2} />
                            <strong className="text-[#374151]">{sp.salesCount}</strong>
                          </span>
                        </div>
                        {bought && !rated && (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
                          >
                            <Pencil size={9} strokeWidth={2} /> Đánh giá
                          </Link>
                        )}
                        {bought && rated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] w-fit">
                            <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
                          </span>
                        )}
                        <div className="mt-auto pt-2 grid grid-cols-[2fr_3fr] gap-2 items-stretch">
                          <div className="flex items-center justify-center bg-[#fff1f2] border border-[#fca5a5] rounded-lg px-1 py-2">
                            <span className="text-xs font-extrabold text-[#e11d48] whitespace-nowrap leading-none">
                              {formatVnd(price)}
                            </span>
                          </div>
                          <ProductBuyButton
                            orderType="SELLER_PRODUCT"
                            itemId={sp.id}
                            itemName={sp.name}
                            price={price}
                            isLoggedIn={isLoggedIn}
                            avgRating={review?.avg ?? 0}
                            reviewCount={review?.count ?? 0}
                            available={avail}
                            totalSold={sp.salesCount}
                            sellerName={seller}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-5">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath={BASE_PATH}
                  searchParams={paginationParams}
                  scrollToTop
                />
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="w-[216px] shrink-0 flex flex-col gap-4 self-start sticky top-24">

          {/* Thống kê hệ thống */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
            <h3 className="font-bold text-[#1e293b] text-[13px] mb-3">Thống kê hệ thống</h3>
            <div className="space-y-3">
              {([
                { Icon: Package,    bg: "#dbeafe", fg: "#2563eb", label: "Tài nguyên",     value: `${allStatProducts.length.toLocaleString("vi-VN")}+` },
                { Icon: Users,      bg: "#d1fae5", fg: "#059669", label: "Khách hàng",     value: "10.000+"                                             },
                { Icon: TrendingUp, bg: "#fef3c7", fg: "#d97706", label: "Tỷ lệ thành công", value: "99.9%"                                             },
                { Icon: Clock,      bg: "#ede9fe", fg: "#7c3aed", label: "Hỗ trợ",         value: "24/7"                                                },
              ] as const).map(({ Icon, bg, fg, label, value }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon size={14} style={{ color: fg }} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[#1e293b] text-[13px] leading-tight">{value}</p>
                    <p className="text-[10px] text-[#64748b]">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top nhà bán hàng */}
          {topSellers.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
              <h3 className="font-bold text-[#1e293b] text-[13px] mb-3">Top nhà bán hàng</h3>
              <div className="space-y-3">
                {topSellers.map((seller, idx) => {
                  const initials = seller.uidPrefix.slice(0, 2).toUpperCase();
                  const badge    = tierBadge(seller.tier);
                  const grad     = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length] ?? "from-[#3b82f6] to-[#6366f1]";
                  return (
                    <div key={seller.id} className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${grad} flex items-center justify-center`}>
                        {seller.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r2Url(seller.avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-extrabold text-white">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[13px] font-bold text-[#1e293b] truncate">#{seller.uidPrefix}</span>
                          {badge && (
                            <span
                              className="px-1 py-px rounded text-[9px] font-bold shrink-0"
                              style={{ background: badge.bg, color: badge.fg }}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                        {seller.avgRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star size={9} fill="#f59e0b" strokeWidth={0} className="text-[#f59e0b]" />
                            <span className="text-[11px] font-bold text-[#374151]">{seller.avgRating.toFixed(1)}</span>
                            <span className="text-[10px] text-[#94a3b8]">({seller.reviewCount})</span>
                          </div>
                        )}
                        <p className="text-[10px] text-[#64748b]">
                          {seller.orderCount.toLocaleString("vi-VN")} đơn hàng
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
