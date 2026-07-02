import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { FilterSidebar } from "./_components/FilterSidebar";
import { CategoryFilter } from "@/components/shared/CategoryFilter";
import type { CategoryItem } from "./_components/FilterSidebar";
import Pagination from "@/components/shared/Pagination";
import {
  Package, Store,
  FolderOpen, Shield,
} from "lucide-react";
import { buildMeta } from "@/lib/utils/seo";
import { batchGetFavoriteData } from "@/lib/services/favorite.service";
import { getExternalProductSoldCounts } from "@/lib/services/external-product-stats.service";
import { TaiNguyenProductList } from "./_components/TaiNguyenProductList";
import type { TaiNguyenProductItem } from "./_components/TaiNguyenProductList";

export const metadata: Metadata = buildMeta({
  title: "Nguyên Liệu MMO | Tài Khoản & Công Cụ Số Chất Lượng Cao",
  description: "Kho nguyên liệu số hàng đầu Việt Nam — tài khoản Facebook, TikTok, công cụ MMO chính hãng. Giao hàng tự động tức thì, bảo hành uy tín, hỗ trợ 24/7.",
  url: "/tai-nguyen-mmo",
  image: "/images/hethongmmo.png",
});

const PAGE_SIZE = 30;
const BASE_PATH = "/tai-nguyen-mmo";


type SortId = "noi-bat" | "ban-chay" | "moi-nhat" | "gia-cao" | "gia-thap";

type UnifiedProduct = {
  id: string;
  kind: "mmo" | "seller" | "kfb";
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  salesCount: number;
  available: number;
  isNew: boolean;
  isHot: boolean;
  href: string;
  shopHref: string;
  createdAt: Date;
  sellerName: string;
  purchasedByMe: boolean;
  reviewedByMe: boolean;
  category: string;
  favoriteCount: number;
  isFavorite: boolean;
};


export default async function TaiNguyenMmoPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string; tag?: string; price?: string; page?: string; subcategory?: string; rating?: string }>;
}) {
  await guardPublicPage("tai-nguyen-mmo");
  const [{ category, sort: sortParam, q: rawQ, tag: rawTag, price: priceParam, page: pageParam, subcategory: subcategoryParam, rating: ratingParam }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);

  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);
  const activeSort = (sortParam as SortId | undefined) ?? "noi-bat";
  const q = rawQ?.trim() || undefined;
  const tag = rawTag?.trim() || undefined;
  const me = session?.user as AuthenticatedUser | undefined;

  // Parse price range param (format: "min-max")
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (priceParam) {
    const parts = priceParam.split("-");
    const rawMin = parts[0];
    const rawMax = parts[1];
    if (rawMin !== undefined) { const n = Number(rawMin); if (!isNaN(n)) minPrice = n; }
    if (rawMax !== undefined) { const n = Number(rawMax); if (!isNaN(n) && n < 9_999_999_999) maxPrice = n; }
  }
  const priceFilter = (minPrice !== undefined || maxPrice !== undefined)
    ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
    : {};

  const selectedSubcatNames = subcategoryParam ? subcategoryParam.split(",").filter(Boolean) : [];

  type LockedRow = { id: string };
  const lockedSellerRows = await prisma.$queryRaw<LockedRow[]>`SELECT id FROM users WHERE shop_locked = true`;
  const lockedSellerIds = lockedSellerRows.map((r) => r.id);

  const [
    mmoProducts,
    allMmoGroups,
    mmoReviewStats,
    sellerProducts,
    sellerReviewStats,
    allSellerCats,
    resourceCategories,
    kfbProducts,
  ] = await Promise.all([
    prisma.mmoProduct.findMany({
      where: {
        isActive: true, deletedAt: null, section: "TAI_NGUYEN_MMO", items: { some: { status: "AVAILABLE" } },
        ...(category ? { categoryGroup: category } : {}),
        ...(selectedSubcatNames.length > 0 ? { category: { in: selectedSubcatNames } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(tag ? { categoryGroup: { contains: tag, mode: "insensitive" as const } } : {}),
        ...priceFilter,
      },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true, description: true,
        categoryGroup: true, category: true, price: true,
        isFeatured: true, rating: true, totalOrders: true, createdAt: true,
        _count: { select: { items: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.mmoProduct.findMany({
      where: { isActive: true, deletedAt: null, section: "TAI_NGUYEN_MMO", items: { some: { status: "AVAILABLE" } } },
      select: { categoryGroup: true },
      distinct: ["categoryGroup"],
      orderBy: { categoryGroup: "asc" },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { productType: "MMO_PRODUCT" },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.sellerProduct.findMany({
      where: {
        isActive: true, isHidden: false, isRestricted: false, deletedAt: null,
        storeType: "TAI_NGUYEN_MMO",
        stockItems: { some: { status: "AVAILABLE" } },
        ...(lockedSellerIds.length > 0 ? { NOT: { sellerId: { in: lockedSellerIds } } } : {}),
        ...(category ? { sellerCategory: category } : {}),
        ...(selectedSubcatNames.length > 0 ? { seller: { subCategories: { some: { subCategory: { name: { in: selectedSubcatNames }, isActive: true, showInTaiNguyenMmo: true } } } } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(tag ? { sellerCategory: { contains: tag, mode: "insensitive" as const } } : {}),
        ...priceFilter,
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, name: true, imageUrl: true, sellerCategory: true, description: true,
        price: true, salesCount: true, createdAt: true, subCategoryId: true,
        seller: { select: { id: true, uidPrefix: true } },
        _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { productType: "SELLER_PRODUCT" },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.sellerProduct.findMany({
      where: {
        isActive: true, isHidden: false, isRestricted: false, deletedAt: null,
        storeType: "TAI_NGUYEN_MMO",
        stockItems: { some: { status: "AVAILABLE" } },
        ...(lockedSellerIds.length > 0 ? { NOT: { sellerId: { in: lockedSellerIds } } } : {}),
      },
      select: { sellerCategory: true },
      distinct: ["sellerCategory"],
      orderBy: { sellerCategory: "asc" },
    }),
    prisma.resourceCategory.findMany({
      where: { showInTaiNguyenMmo: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true, iconUrl: true,
        subCategories: {
          where: { isActive: true, showInTaiNguyenMmo: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    prisma.externalProduct.findMany({
      where: {
        isEnabled:      true,
        displaySection: "TAI_NGUYEN_MMO",
        ...(category ? { resourceCategory: { name: category } } : {}),
        ...(selectedSubcatNames.length > 0 ? { subCategory: { name: { in: selectedSubcatNames } } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...((minPrice !== undefined || maxPrice !== undefined)
          ? { salePrice: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
          : {}),
      },
      select: {
        id: true, name: true, thumbnail: true, salePrice: true,
        externalCategory: true, description: true, createdAt: true,
        resourceCategory: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [purchasedSellerIds, reviewedSellerIds, purchasedMmoIds, reviewedMmoIds, kfbSoldMap] =
    await Promise.all([
      me ? prisma.order.findMany({
        where: { userId: me.id, orderType: "SELLER_PRODUCT", status: "DONE" },
        select: { sellerProductId: true },
        distinct: ["sellerProductId"],
      }).then((rows) => new Set(rows.map((r) => r.sellerProductId!).filter(Boolean))) : Promise.resolve(new Set<string>()),
      me ? prisma.review.findMany({
        where: { userId: me.id, productType: "SELLER_PRODUCT" },
        select: { productId: true },
      }).then((rows) => new Set(rows.map((r) => r.productId))) : Promise.resolve(new Set<string>()),
      me ? prisma.order.findMany({
        where: { userId: me.id, orderType: "MMO_PRODUCT", status: "DONE" },
        select: { mmoProductId: true },
        distinct: ["mmoProductId"],
      }).then((rows) => new Set(rows.map((r) => r.mmoProductId!).filter(Boolean))) : Promise.resolve(new Set<string>()),
      me ? prisma.review.findMany({
        where: { userId: me.id, productType: "MMO_PRODUCT" },
        select: { productId: true },
      }).then((rows) => new Set(rows.map((r) => r.productId))) : Promise.resolve(new Set<string>()),
      getExternalProductSoldCounts(kfbProducts.map((p) => p.id)),
    ]);

  const mmoReviewMap = new Map(
    mmoReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );
  const sellerReviewMap = new Map(
    sellerReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );

  const { mmoFavCounts, sellerFavCounts, myMmoFavs, mySellerFavs } =
    await batchGetFavoriteData({
      userId: me?.id,
      mmoProductIds: mmoProducts.map((p) => p.id),
      sellerProductIds: sellerProducts.map((p) => p.id),
    });
  const categoryIconMap = new Map(resourceCategories.map((c) => [c.name, c.iconUrl]));

  const mmoGroupSet = new Set(allMmoGroups.map((c) => c.categoryGroup));
  const sellerCatSet = new Set(allSellerCats.map((c) => c.sellerCategory));
  const allCategoryNames = new Set([...mmoGroupSet, ...sellerCatSet]);
  const allCategories = [
    ...resourceCategories.map((c) => c.name).filter((n) => allCategoryNames.has(n)),
    ...[...allCategoryNames].filter((n) => !resourceCategories.some((r) => r.name === n)).sort(),
  ];

  const mmoGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    acc[p.categoryGroup] = (acc[p.categoryGroup] ?? 0) + 1;
    return acc;
  }, {});
  const sellerGrouped = sellerProducts.reduce<Record<string, number>>((acc, p) => {
    acc[p.sellerCategory] = (acc[p.sellerCategory] ?? 0) + 1;
    return acc;
  }, {});

  const mmoSubGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  const allSubCatById = new Map<string, string>(
    resourceCategories.flatMap((c) => c.subCategories.map((s) => [s.id, s.name] as [string, string]))
  );
  const sellerSubGrouped = sellerProducts.reduce<Record<string, number>>((acc, sp) => {
    if (sp.subCategoryId) {
      const subName = allSubCatById.get(sp.subCategoryId);
      if (subName) acc[subName] = (acc[subName] ?? 0) + 1;
    }
    return acc;
  }, {});

  const resourceCatMap = new Map(resourceCategories.map((c) => [c.name, c]));

  const categoryItems: CategoryItem[] = allCategories.map((name) => ({
    name,
    count: (mmoGrouped[name] ?? 0) + (sellerGrouped[name] ?? 0),
    iconUrl: categoryIconMap.get(name) ?? null,
    subCategories: (resourceCatMap.get(name)?.subCategories ?? []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      count: (mmoSubGrouped[sub.name] ?? 0) + (sellerSubGrouped[sub.name] ?? 0),
    })),
  }));

  // Platform cards for "Danh mục nổi bật"
  const sellerCatSellerMap = new Map<string, Set<string>>();
  for (const sp of sellerProducts) {
    if (!sellerCatSellerMap.has(sp.sellerCategory)) sellerCatSellerMap.set(sp.sellerCategory, new Set());
    sellerCatSellerMap.get(sp.sellerCategory)!.add(sp.seller.id);
  }
  const totalSellers = new Set(sellerProducts.map((sp) => sp.seller.id)).size;

  const platformCards = categoryItems
    .filter((c) => c.count > 0)
    .slice(0, 9)
    .map((c) => ({
      name: c.name,
      iconUrl: c.iconUrl,
      count: c.count,
      sellerCount: sellerCatSellerMap.get(c.name)?.size ?? 0,
      tags: c.subCategories.filter((s) => (s.count ?? 0) > 0).slice(0, 3).map((s) => s.name),
      extraTags: Math.max(0, c.subCategories.filter((s) => (s.count ?? 0) > 0).length - 3),
    }));

  // Category data cho CategoryFilter — CHỈ danh mục CMS được cấu hình showInTaiNguyenMmo=true
  // Không thêm bất kỳ danh mục nào ngoài CMS để tránh lẫn giữa 2 trang
  const allCategoryData = resourceCategories.map((rc) => ({
    name: rc.name,
    iconUrl: rc.iconUrl,
    count: 0,
    subCategories: rc.subCategories.map((s) => ({ id: s.id, name: s.name, count: 0 })),
  }));

  // eslint-disable-next-line react-hooks/purity
  const fourteenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stripHtml = (html: string | null) =>
    html ? html.replace(/<[^>]*>/g, "").trim() || null : null;

  const allProducts: UnifiedProduct[] = [
    ...kfbProducts.map((p): UnifiedProduct => ({
      id: p.id, kind: "kfb", name: p.name,
      description: stripHtml(p.description ?? null), imageUrl: p.thumbnail,
      price: Number(p.salePrice), rating: 0, reviewCount: 0, salesCount: kfbSoldMap.get(p.id) ?? 0,
      available: 999, category: p.resourceCategory?.name ?? p.externalCategory,
      isNew: false, isHot: false,
      href: `/kfb/${p.id}`, shopHref: "#",
      createdAt: p.createdAt, sellerName: "Nguồn ngoài",
      purchasedByMe: false, reviewedByMe: false,
      favoriteCount: 0, isFavorite: false,
    })),
    ...mmoProducts.map((p) => {
      const review = mmoReviewMap.get(p.id);
      return {
        id: p.id, kind: "mmo" as const, name: p.name,
        description: stripHtml(p.description ?? null), imageUrl: p.thumbnail,
        price: Number(p.price), rating: review ? review.avg : p.rating,
        reviewCount: review?.count ?? 0, salesCount: p.totalOrders,
        available: p._count.items, category: p.categoryGroup,
        isNew: p.createdAt > fourteenDaysAgo, isHot: p.isFeatured,
        href: `${BASE_PATH}/${p.slug}`, shopHref: `${BASE_PATH}/he-thong`,
        createdAt: p.createdAt, sellerName: "Hệ thống MMO",
        purchasedByMe: purchasedMmoIds.has(p.id), reviewedByMe: reviewedMmoIds.has(p.id),
        favoriteCount: mmoFavCounts.get(p.id) ?? 0,
        isFavorite: myMmoFavs.has(p.id),
      };
    }),
    ...sellerProducts.map((sp) => {
      const review = sellerReviewMap.get(sp.id);
      return {
        id: sp.id, kind: "seller" as const, name: sp.name,
        description: stripHtml(sp.description ?? null), imageUrl: sp.imageUrl,
        price: Number(sp.price), rating: review?.avg ?? 0,
        reviewCount: review?.count ?? 0, salesCount: sp.salesCount,
        available: sp._count.stockItems, isNew: sp.createdAt > fourteenDaysAgo,
        isHot: sp.salesCount >= 15, href: `${BASE_PATH}/san-pham/${sp.id}`,
        shopHref: `${BASE_PATH}/nguoi-ban/${sp.seller.id}`,
        createdAt: sp.createdAt, sellerName: `#${sp.seller.uidPrefix}`,
        purchasedByMe: purchasedSellerIds.has(sp.id), reviewedByMe: reviewedSellerIds.has(sp.id),
        category: sp.sellerCategory,
        favoriteCount: sellerFavCounts.get(sp.id) ?? 0,
        isFavorite: mySellerFavs.has(sp.id),
      };
    }),
  ];

  const resCatOrder = new Map(resourceCategories.map((c, idx) => [c.name, idx]));
  const sortedProducts = [...allProducts].sort((a, b) => {
    const oa = resCatOrder.get(a.category) ?? 999;
    const ob = resCatOrder.get(b.category) ?? 999;
    if (oa !== ob) return oa - ob;
    if (activeSort === "ban-chay") return b.salesCount - a.salesCount;
    if (activeSort === "moi-nhat") return b.createdAt.getTime() - a.createdAt.getTime();
    if (activeSort === "gia-cao")  return b.price - a.price;
    if (activeSort === "gia-thap") return a.price - b.price;
    if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
    return b.salesCount - a.salesCount;
  });

  const minRating = ratingParam ? Number(ratingParam) : 0;
  const displayProducts = minRating > 0 ? sortedProducts.filter((p) => p.rating >= minRating) : sortedProducts;
  const totalCount = displayProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedProducts = displayProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (category)         paginationParams["category"]    = category;
  if (sortParam)        paginationParams["sort"]        = sortParam;
  if (rawQ)             paginationParams["q"]           = rawQ;
  if (priceParam)       paginationParams["price"]       = priceParam;
  if (subcategoryParam) paginationParams["subcategory"] = subcategoryParam;
  if (ratingParam)      paginationParams["rating"]      = ratingParam;

  const hasActiveFilter = !!(category || subcategoryParam || q || priceParam || ratingParam);
  const selectedCategories = category ? [category] : [];

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="mx-auto max-w-370 px-3 py-4 flex flex-col gap-4">


          {/* Dark blue banner */}
          <div className="rounded-2xl bg-linear-to-br from-[#0f2460] via-[#1a3a8f] to-[#0d1f5e] p-5 md:p-7 text-white overflow-hidden relative">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-6 right-24 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative z-10">
              {/* Icon + Title + Gian hàng */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <FolderOpen size={20} strokeWidth={1.75} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">
                      Nguyên Liệu MMO
                    </h1>
                    <p className="text-white/60 text-xs mt-0.5">Tài khoản &amp; công cụ số — Phục vụ nhu cầu MMO.</p>
                  </div>
                </div>
                <Link
                  href="/tai-nguyen-mmo/gian-hang"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/15 border border-white/25 text-white text-[11px] md:text-xs font-bold hover:bg-white/25 transition-colors backdrop-blur-sm whitespace-nowrap"
                >
                  <Store size={13} strokeWidth={2} />
                  Gian hàng
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <Package size={13} strokeWidth={2} className="text-white/70" />
                  <span className="text-white/70">Sản phẩm</span>
                  <span className="font-extrabold">{totalCount.toLocaleString("vi-VN")}</span>
                </div>
                <div className="w-px h-3 bg-white/20" />
                <div className="flex items-center gap-1.5 text-xs">
                  <Store size={13} strokeWidth={2} className="text-white/70" />
                  <span className="text-white/70">Nhà bán</span>
                  <span className="font-extrabold">{totalSellers}</span>
                </div>
                <div className="w-px h-3 bg-white/20" />
                <div className="flex items-center gap-1.5 text-xs">
                  <Shield size={13} strokeWidth={2} className="text-white/70" />
                  <span className="font-extrabold">Giao tự động 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danh mục + Danh mục con — client component, luôn hiển thị, không reload */}
          {allCategoryData.length > 0 && (
            <Suspense fallback={<div className="h-16 rounded-2xl bg-white border border-border animate-pulse" />}>
              <CategoryFilter categories={allCategoryData} basePath={BASE_PATH} />
            </Suspense>
          )}

        {/* ── FILTER + PRODUCTS ROW ── */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <Suspense fallback={
            <aside className="hidden lg:block lg:w-72 shrink-0">
              <div className="bg-white rounded-xl border border-border h-120 animate-pulse" />
            </aside>
          }>
            <FilterSidebar categories={categoryItems} totalCount={totalCount} />
          </Suspense>
          <div className="flex-1 min-w-0">

          {/* Product section */}
          <div>
            {/* Empty state */}
            {totalCount === 0 ? (
              <div className="text-center py-24 bg-white rounded-xl border border-border">
                <div className="flex justify-center mb-4">
                  <Package size={52} strokeWidth={1.25} className="text-[#cbd5e1]" />
                </div>
                <p className="font-semibold text-text-dark text-base">Chưa có sản phẩm nào</p>
                <p className="text-sm text-text-muted mt-1">Thử điều chỉnh bộ lọc.</p>
              </div>
            ) : (
              <TaiNguyenProductList
                products={pagedProducts.map((p): TaiNguyenProductItem => ({
                  id: p.id,
                  kind: p.kind,
                  name: p.name,
                  description: p.description,
                  imageUrl: p.imageUrl,
                  price: p.price,
                  rating: p.rating,
                  reviewCount: p.reviewCount,
                  salesCount: p.salesCount,
                  available: p.available,
                  isNew: p.isNew,
                  isHot: p.isHot,
                  href: p.href,
                  sellerName: p.sellerName,
                  purchasedByMe: p.purchasedByMe,
                  reviewedByMe: p.reviewedByMe,
                  category: p.category,
                  favoriteCount: p.favoriteCount,
                  isFavorite: p.isFavorite,
                }))}
              />
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={BASE_PATH}
                searchParams={paginationParams}
                scrollToTop
              />
            )}
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}
