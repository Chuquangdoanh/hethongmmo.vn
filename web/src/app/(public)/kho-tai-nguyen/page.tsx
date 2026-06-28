import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import Pagination from "@/components/shared/Pagination";
import { SortSelect } from "@/app/(public)/tai-nguyen-mmo/_components/SortSelect";
import { buildMeta } from "@/lib/utils/seo";
import { KhoFilterSidebar } from "./_components/KhoFilterSidebar";
import { CategoryFilter } from "@/components/shared/CategoryFilter";
import { batchGetFavoriteData } from "@/lib/services/favorite.service";
import FavoriteButton from "@/components/shared/FavoriteButton";
import {
  Package, ShoppingBag, ShoppingCart,
  Pencil, CheckCircle, FolderOpen,
  Users, Clock, Shield, X, Store,
} from "lucide-react";

export const metadata: Metadata = buildMeta({
  title: "Kho Tài Nguyên MMO | Tài Khoản & Công Cụ Số Chất Lượng Cao",
  description: "Kho tài nguyên số hàng đầu Việt Nam — tài khoản Facebook, TikTok, công cụ MMO chính hãng. Giao hàng tự động tức thì, bảo hành uy tín, hỗ trợ 24/7.",
  url: "/kho-tai-nguyen",
  image: "/images/hethongmmo.png",
});

const PAGE_SIZE = 30;
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


export default async function KhoTaiNguyenPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string; tag?: string; price?: string; page?: string; subcategory?: string; rating?: string }>;
}) {
  await guardPublicPage("kho-tai-nguyen");

  const [
    { category: categoryParam, sort: sortParam, q: rawQ, tag: rawTag, price: priceParam, page: pageParam, subcategory: subcatParam, rating: ratingParam },
    session,
  ] = await Promise.all([searchParams, auth()]);

  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);
  const activeSort = (sortParam as SortId | undefined) ?? "noi-bat";
  const q = rawQ?.trim() || undefined;
  const tag = rawTag?.trim() || undefined;
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
            where: { name: { in: selectedSubcatNames }, isActive: true, showInKhoTaiNguyen: true },
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
    ...(tag ? { sellerCategory: { contains: tag, mode: "insensitive" as const } } : {}),
    ...priceFilter,
  };

  const orderBy =
    activeSort === "ban-chay" ? [{ salesCount: "desc" as const }]
    : activeSort === "moi-nhat" ? [{ createdAt: "desc" as const }]
    : activeSort === "gia-cao"  ? [{ price: "desc" as const }]
    : activeSort === "gia-thap" ? [{ price: "asc" as const }]
    : [{ salesCount: "desc" as const }, { createdAt: "desc" as const }];

  const mmoBaseWhere = {
    isActive: true, deletedAt: null, section: "KHO_TAI_NGUYEN" as const,
    items: { some: { status: "AVAILABLE" as const } },
  };
  const mmoFilteredWhere = {
    ...mmoBaseWhere,
    ...(selectedCategories.length > 0 ? { categoryGroup: { in: selectedCategories } } : {}),
    ...(selectedSubcatNames.length > 0 ? { category: { in: selectedSubcatNames } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(tag ? { categoryGroup: { contains: tag, mode: "insensitive" as const } } : {}),
    ...priceFilter,
  };

  const [allStatProducts, filteredProducts, resourceCategories, reviewStats, allMmoStat, filteredMmoProducts, mmoReviewStats, kfbProducts] = await Promise.all([
    prisma.sellerProduct.findMany({
      where: baseWhere,
      select: { id: true, sellerCategory: true, sellerId: true, subCategoryId: true, subCategory: { select: { name: true, showInKhoTaiNguyen: true } } },
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
      where: { showInKhoTaiNguyen: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        iconUrl: true,
        subCategories: {
          where: { isActive: true, showInKhoTaiNguyen: true },
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
    prisma.mmoProduct.findMany({
      where: mmoBaseWhere,
      select: { id: true, categoryGroup: true, category: true },
    }),
    prisma.mmoProduct.findMany({
      where: mmoFilteredWhere,
      orderBy: [{ isFeatured: "desc" }, { totalOrders: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        categoryGroup: true, category: true, description: true,
        price: true, totalOrders: true, isFeatured: true, rating: true, createdAt: true,
        _count: { select: { items: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { productType: "MMO_PRODUCT" },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.khuongfbProduct.findMany({
      where: {
        isEnabled:      true,
        displaySection: "KHO_TAI_NGUYEN",
        ...(selectedCategories.length > 0 ? { resourceCategory: { name: { in: selectedCategories } } } : {}),
        ...(selectedSubcatNames.length > 0 ? { subCategory: { name: { in: selectedSubcatNames } } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { salePrice: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
          : {}),
      },
      select: {
        id: true, name: true, thumbnail: true, salePrice: true,
        externalCategory: true, description: true, createdAt: true,
        resourceCategory: { select: { name: true } },
        subCategory:      { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [purchasedIds, reviewedIds, purchasedMmoIds, reviewedMmoIds] = await Promise.all([
    me
      ? prisma.order
          .findMany({
            where: { userId: me.id, orderType: "SELLER_PRODUCT", status: "DONE" },
            select: { sellerProductId: true },
            distinct: ["sellerProductId"],
          })
          .then((rows) => new Set(rows.map((r) => r.sellerProductId!).filter(Boolean)))
      : Promise.resolve(new Set<string>()),
    me
      ? prisma.review
          .findMany({
            where: { userId: me.id, productType: "SELLER_PRODUCT" },
            select: { productId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.productId)))
      : Promise.resolve(new Set<string>()),
    me
      ? prisma.order
          .findMany({
            where: { userId: me.id, orderType: "MMO_PRODUCT", status: "DONE" },
            select: { mmoProductId: true },
            distinct: ["mmoProductId"],
          })
          .then((rows) => new Set(rows.map((r) => r.mmoProductId!).filter(Boolean)))
      : Promise.resolve(new Set<string>()),
    me
      ? prisma.review
          .findMany({
            where: { userId: me.id, productType: "MMO_PRODUCT" },
            select: { productId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.productId)))
      : Promise.resolve(new Set<string>()),
  ]);

  const mmoReviewMap = new Map(mmoReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }]));

  const { mmoFavCounts, sellerFavCounts, myMmoFavs, mySellerFavs } =
    await batchGetFavoriteData({
      userId: me?.id,
      mmoProductIds: filteredMmoProducts.map((p) => p.id),
      sellerProductIds: filteredProducts.map((p) => p.id),
    });

  // Build platform stats (seller + mmo)
  const platformProductCount = new Map<string, number>();
  const platformSellerSet = new Map<string, Set<string>>();
  for (const p of allStatProducts) {
    platformProductCount.set(p.sellerCategory, (platformProductCount.get(p.sellerCategory) ?? 0) + 1);
    if (!platformSellerSet.has(p.sellerCategory)) platformSellerSet.set(p.sellerCategory, new Set());
    platformSellerSet.get(p.sellerCategory)!.add(p.sellerId);
  }
  for (const p of allMmoStat) {
    platformProductCount.set(p.categoryGroup, (platformProductCount.get(p.categoryGroup) ?? 0) + 1);
  }

  // Subcategory count map
  const allSubCatById = new Map(
    resourceCategories.flatMap((rc) => rc.subCategories.map((s) => [s.id, s.name] as [string, string]))
  );
  const subCatCountMap = new Map<string, number>();
  for (const p of allStatProducts) {
    // Dùng join trực tiếp (subCategory.name) để đếm chính xác hơn allSubCatById lookup
    const subName = p.subCategory?.name ?? (p.subCategoryId ? allSubCatById.get(p.subCategoryId) : undefined);
    if (subName) subCatCountMap.set(subName, (subCatCountMap.get(subName) ?? 0) + 1);
  }
  for (const p of allMmoStat) {
    if (p.category) subCatCountMap.set(p.category, (subCatCountMap.get(p.category) ?? 0) + 1);
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

  // Category data for client-side filter — CHỈ danh mục CMS được cấu hình showInKhoTaiNguyen=true
  // Không thêm bất kỳ danh mục nào ngoài CMS để tránh lẫn giữa 2 trang
  const allCategoryData = resourceCategories.map((rc) => ({
    name: rc.name,
    iconUrl: rc.iconUrl,
    count: platformProductCount.get(rc.name) ?? 0,
    subCategories: rc.subCategories.map((s) => ({
      id: s.id,
      name: s.name,
      count: subCatCountMap.get(s.name) ?? 0,
    })),
  }));

  // Review map (seller)
  const reviewMap = new Map(reviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }]));

  const fourteenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stripHtml = (html: string | null) => (html ? html.replace(/<[^>]*>/g, "").trim() || null : null);

  // Build unified product list
  type KhoProduct =
    | { kind: "seller"; id: string; name: string; imageUrl: string | null; category: string; description: string | null; price: number; salesCount: number; createdAt: Date; sellerPrefix: string; available: number; isNew: boolean; isHot: boolean; href: string; bought: boolean; rated: boolean; review: { count: number; avg: number } | undefined; orderType: "SELLER_PRODUCT"; favoriteCount: number; isFavorite: boolean }
    | { kind: "mmo"; id: string; name: string; imageUrl: string | null; category: string; description: string | null; price: number; salesCount: number; createdAt: Date; sellerPrefix: string; available: number; isNew: boolean; isHot: boolean; href: string; bought: boolean; rated: boolean; review: { count: number; avg: number } | undefined; orderType: "MMO_PRODUCT"; slug: string; favoriteCount: number; isFavorite: boolean }
    | { kind: "kfb"; id: string; name: string; imageUrl: string | null; category: string; description: string | null; price: number; salesCount: number; createdAt: Date; sellerPrefix: string; available: number; isNew: boolean; isHot: boolean; href: string; bought: boolean; rated: boolean; review: undefined; orderType: "KHUONGFB_PRODUCT"; favoriteCount: number; isFavorite: boolean };

  const minRating = ratingParam ? Number(ratingParam) : 0;

  const allUnified: KhoProduct[] = [
    ...kfbProducts
      .filter(() => minRating === 0)
      .map((p): KhoProduct => ({
        kind: "kfb", id: p.id, name: p.name, imageUrl: p.thumbnail,
        category: p.resourceCategory?.name ?? p.externalCategory,
        description: stripHtml(p.description ?? null),
        price: Number(p.salePrice), salesCount: 0, createdAt: p.createdAt,
        sellerPrefix: "Nguồn ngoài", available: 999,
        isNew: false, isHot: false,
        href: `/kfb/${p.id}`,
        bought: false, rated: false, review: undefined,
        orderType: "KHUONGFB_PRODUCT",
        favoriteCount: 0, isFavorite: false,
      })),
    ...filteredProducts
      .filter((sp) => minRating === 0 || (reviewMap.get(sp.id)?.avg ?? 0) >= minRating)
      .map((sp): KhoProduct => ({
        kind: "seller", id: sp.id, name: sp.name, imageUrl: sp.imageUrl,
        category: sp.sellerCategory, description: stripHtml(sp.description ?? null),
        price: Number(sp.price), salesCount: sp.salesCount, createdAt: sp.createdAt,
        sellerPrefix: `#${sp.seller.uidPrefix}`, available: sp._count.stockItems,
        isNew: sp.createdAt > fourteenDaysAgo, isHot: sp.salesCount >= 15,
        href: `/kho-tai-nguyen/san-pham/${sp.id}`,
        bought: purchasedIds.has(sp.id), rated: reviewedIds.has(sp.id),
        review: reviewMap.get(sp.id), orderType: "SELLER_PRODUCT",
        favoriteCount: sellerFavCounts.get(sp.id) ?? 0,
        isFavorite: mySellerFavs.has(sp.id),
      })),
    ...filteredMmoProducts
      .filter((p) => minRating === 0 || (mmoReviewMap.get(p.id)?.avg ?? p.rating) >= minRating)
      .map((p): KhoProduct => ({
        kind: "mmo", id: p.id, slug: p.slug, name: p.name, imageUrl: p.thumbnail ?? null,
        category: p.categoryGroup, description: stripHtml(p.description ?? null),
        price: Number(p.price), salesCount: p.totalOrders, createdAt: p.createdAt,
        sellerPrefix: "Hệ Thống", available: p._count.items,
        isNew: p.createdAt > fourteenDaysAgo, isHot: p.isFeatured,
        href: `/kho-tai-nguyen/${p.slug}`,
        bought: purchasedMmoIds.has(p.id), rated: reviewedMmoIds.has(p.id),
        review: mmoReviewMap.get(p.id), orderType: "MMO_PRODUCT",
        favoriteCount: mmoFavCounts.get(p.id) ?? 0,
        isFavorite: myMmoFavs.has(p.id),
      })),
  ].sort((a, b) => {
    if (activeSort === "ban-chay") return b.salesCount - a.salesCount;
    if (activeSort === "moi-nhat") return b.createdAt.getTime() - a.createdAt.getTime();
    if (activeSort === "gia-cao") return b.price - a.price;
    if (activeSort === "gia-thap") return a.price - b.price;
    return b.salesCount - a.salesCount;
  });

  const totalCount = allUnified.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedProducts = allUnified.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (categoryParam) paginationParams["category"]    = categoryParam;
  if (sortParam)     paginationParams["sort"]        = sortParam;
  if (rawQ)          paginationParams["q"]           = rawQ;
  if (priceParam)    paginationParams["price"]       = priceParam;
  if (subcatParam)   paginationParams["subcategory"] = subcatParam;
  if (ratingParam)   paginationParams["rating"]      = ratingParam;

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
      <div className="mx-auto max-w-370 px-3 py-4 flex flex-col gap-4">


          {/* Banner */}
          <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#0f2460] via-[#1a3a8f] to-[#0d1f5e]">
            <div className="px-4 py-4 sm:px-6 sm:py-6 relative z-10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <FolderOpen size={20} className="text-[#7dd3fc]" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-extrabold text-white leading-tight">Kho Tài Nguyên MMO</h1>
                    <p className="text-[#93c5fd] text-[11px] sm:text-xs mt-0.5">Tài nguyên chất lượng cao — giao tự động sau thanh toán</p>
                  </div>
                </div>
                <Link
                  href="/kho-tai-nguyen/gian-hang"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white/15 border border-white/25 text-white text-[11px] sm:text-xs font-bold hover:bg-white/25 transition-colors backdrop-blur-sm whitespace-nowrap"
                >
                  <Store size={13} strokeWidth={2} />
                  Gian hàng
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-5 mt-4 sm:mt-5">
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

          {/* Danh mục + Danh mục con — client component, luôn hiển thị, không reload */}
          {allCategoryData.length > 0 && (
            <Suspense fallback={<div className="h-16 rounded-2xl bg-white border border-[#e2e8f0] animate-pulse" />}>
              <CategoryFilter categories={allCategoryData} basePath={BASE_PATH} />
            </Suspense>
          )}

        {/* ── FILTER + PRODUCTS ROW ── */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <Suspense fallback={<div className="hidden lg:block lg:w-72 shrink-0 bg-white rounded-xl border border-[#e5e7eb] h-120 animate-pulse" />}>
            <KhoFilterSidebar platforms={platformsForFilter} resourceTypes={resourceTypesForFilter} />
          </Suspense>
          <div className="flex-1 min-w-0">

          {/* Sản phẩm */}
            {/* Header row */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#1e293b] text-[15px]">Tài nguyên trong kho</h2>
              </div>
              <div className="flex items-center gap-2">
                <SortSelect basePath={BASE_PATH} />
              </div>
            </div>

            

            {totalCount === 0 ? (
              <div className="text-center py-20">
                <Package size={44} strokeWidth={1.25} className="text-[#cbd5e1] mx-auto mb-3" />
                <p className="font-semibold text-[#475569]">Chưa có sản phẩm nào</p>
                <p className="text-xs text-[#94a3b8] mt-1">Thử điều chỉnh bộ lọc hoặc xoá bộ lọc hiện tại</p>
                <Link href={BASE_PATH} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-xs font-bold hover:bg-[#2563eb] transition-colors">
                  Xem tất cả tài nguyên
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                {pagedProducts.map((item) => {
                  const { id, name, imageUrl, category, description: desc, price, salesCount, isNew, isHot, href, bought, rated, review, available: avail, sellerPrefix: seller, favoriteCount, isFavorite, kind } = item;

                  return (
                    <div
                      key={id}
                      className="relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-[#3b82f6]/40 transition-all flex flex-col"
                    >
                      {/* Full-card clickable overlay */}
                      <Link href={href} className="absolute inset-0 z-1" aria-label={`Xem chi tiết ${name}`} />

                      {/* ── Ảnh sản phẩm ── */}
                      <div className="block relative shrink-0">
                        <div className="aspect-video bg-light overflow-hidden" style={{ position: "relative" }}>
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r2Url(imageUrl)}
                              alt={name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={32} strokeWidth={1.25} className="text-[#94a3b8]" />
                            </div>
                          )}

                          {/* HOT / NEW — top-left */}
                          {(isHot || isNew) && (
                            <div className="absolute top-2 left-2 flex gap-1">
                              {isHot && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#ef4444] text-white uppercase">
                                  HOT
                                </span>
                              )}
                              {!isHot && isNew && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#22c55e] text-white uppercase">
                                  NEW
                                </span>
                              )}
                            </div>
                          )}

                          {/* Rating overlay — luôn hiển thị (match Tài Nguyên MMO) */}
                          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/65 to-transparent px-2.5 pt-5 pb-2">
                            {review && review.count > 0 ? (
                              <div className="flex items-center gap-1">
                                <StarBar rating={review.avg} size="xs" />
                                <span className="text-[11px] font-bold text-white leading-none">{review.avg.toFixed(1)}</span>
                                <span className="text-[10px] text-white/60">({review.count})</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-white/50 italic">Chưa có đánh giá</span>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* ── Thông tin sản phẩm ── */}
                      <div className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-1.5 flex-1">
                        <h3 className="text-sm font-bold text-[#1e293b] line-clamp-2 leading-snug">
                          {name}
                        </h3>

                        {/* Stats: Đã bán · Còn */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart size={8} strokeWidth={2} />
                            <span>Đã bán <strong className="text-[#374151]">{salesCount}</strong></span>
                          </span>
                          <span className="text-[#d1d5db]">·</span>
                          <span>Còn <strong className="text-[#374151]">{avail}</strong></span>
                        </div>

                        {/* Review actions */}
                        {bought && !rated && (
                          <Link
                            href={href}
                            className="relative z-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
                          >
                            <Pencil size={9} strokeWidth={2} /> Đánh giá
                          </Link>
                        )}
                        {bought && rated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] w-fit">
                            <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
                          </span>
                        )}

                        {/* Price */}
                        <div className="mt-auto pt-1.5 sm:pt-2">
                          <span className="text-xs font-extrabold text-[#e11d48] whitespace-nowrap leading-none">
                            {formatVnd(price)}
                          </span>
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

      </div>
    </div>
  );
}
