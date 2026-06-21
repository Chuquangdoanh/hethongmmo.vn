import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { FilterSidebar } from "./_components/FilterSidebar";
import { CategoryFilter } from "@/components/shared/CategoryFilter";
import type { CategoryItem } from "./_components/FilterSidebar";
import Pagination from "@/components/shared/Pagination";
import {
  Package, ShoppingBag, ShoppingCart, Store,
  Pencil, CheckCircle,
  FolderOpen, Shield, X,
} from "lucide-react";
import { SortSelect } from "./_components/SortSelect";
import { buildMeta } from "@/lib/utils/seo";

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
  kind: "mmo" | "seller";
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
};

function StarBar({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? "text-warning" : "text-white/30"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

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
  ]);

  const [purchasedSellerIds, reviewedSellerIds, purchasedMmoIds, reviewedMmoIds] =
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
    ]);

  const mmoReviewMap = new Map(
    mmoReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );
  const sellerReviewMap = new Map(
    sellerReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );
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

  // Category data cho CategoryFilter — PHẢI dùng nguồn UNFILTERED (resourceCategories + allCategoryNames)
  // KHÔNG được dùng platformCards/categoryItems vì chúng tính count từ mmoProducts/sellerProducts đã bị filter
  // → khi đang chọn Facebook, Tiktok count=0 → bị loại → mất button Tiktok/Instagram/Game
  const allCategoryData = resourceCategories
    .filter((rc) => allCategoryNames.has(rc.name))
    .map((rc) => ({
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
                    <p className="text-white/60 text-xs mt-0.5">Tài khoản &amp; công cụ số — Giao tự động, Bảo hành uy tín</p>
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
            {/* Section header */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <p className="text-base font-extrabold text-text-dark">
                  {category ?? "Tất cả Nguyên Liệu"}
                </p>
                <p className="text-xs text-text-muted">
                  {totalCount.toLocaleString("vi-VN")} sản phẩm
                  {selectedSubcatNames.length > 0 && <> › <span className="font-semibold">{selectedSubcatNames.join(", ")}</span></>}
                  {q && <> — &ldquo;{q}&rdquo;</>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hasActiveFilter && (
                  <Link
                    href={BASE_PATH}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-danger border border-[#fca5a5] hover:bg-[#fff1f2] transition-colors"
                  >
                    <X size={11} strokeWidth={2.5} /> Xoá bộ lọc
                  </Link>
                )}
                <SortSelect />
              </div>
            </div>

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
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                {pagedProducts.map((p) => (
                  <div
                    key={`${p.kind}-${p.id}`}
                    className="relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
                  >
                    {/* Full-card clickable overlay */}
                    <Link href={p.href} className="absolute inset-0 z-1" aria-label={`Xem chi tiết ${p.name}`} />

                    {/* Image area */}
                    <div className="block relative shrink-0">
                      <div className="aspect-video bg-[#f1f5f9] overflow-hidden relative">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r2Url(p.imageUrl)}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {p.kind === "seller" ? (
                              <ShoppingBag size={36} strokeWidth={1.25} className="text-[#94a3b8]" />
                            ) : (
                              <Package size={36} strokeWidth={1.25} className="text-[#94a3b8]" />
                            )}
                          </div>
                        )}

                        {/* Category badge — top-left */}
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-[#1d4ed8]/85 text-white backdrop-blur-sm">
                          {p.category}
                        </span>

                        {/* HOT / NEW — top-right */}
                        {p.isHot ? (
                          <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-danger text-white uppercase tracking-wide shadow">
                            HOT
                          </span>
                        ) : p.isNew ? (
                          <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#22c55e] text-white uppercase tracking-wide shadow">
                            NEW
                          </span>
                        ) : null}

                        {/* Star rating overlay — bottom */}
                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/65 to-transparent px-2.5 pt-5 pb-2">
                          {p.reviewCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <StarBar rating={p.rating} size="xs" />
                              <span className="text-[11px] font-bold text-white leading-none">{p.rating.toFixed(1)}</span>
                              <span className="text-[11px] text-white/60">({p.reviewCount})</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/50 italic">Chưa có đánh giá</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-1.5 flex-1">
                      <h3 className="text-sm font-bold text-text-dark line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <ShoppingCart size={9} strokeWidth={2} />
                          <span>Đã bán <strong className="text-[#374151]">{p.salesCount}</strong></span>
                        </span>
                        <span className="text-[#d1d5db]">·</span>
                        <span>Còn <strong className="text-[#374151]">{p.available}</strong></span>
                        <span className="text-[#d1d5db]">·</span>
                        <span className="truncate max-w-20">
                          <strong className="text-[#475569]">{p.sellerName}</strong>
                        </span>
                      </div>

                      {/* Review action */}
                      {p.purchasedByMe && !p.reviewedByMe && (
                        <Link
                          href={p.href}
                          className="relative z-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
                        >
                          <Pencil size={9} strokeWidth={2} /> Đánh giá
                        </Link>
                      )}
                      {p.purchasedByMe && p.reviewedByMe && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] w-fit">
                          <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
                        </span>
                      )}

                      {/* Price */}
                      <div className="mt-auto pt-1.5 sm:pt-2">
                        <span className="text-xs font-extrabold text-[#e11d48] whitespace-nowrap leading-none">
                          {formatVnd(p.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
