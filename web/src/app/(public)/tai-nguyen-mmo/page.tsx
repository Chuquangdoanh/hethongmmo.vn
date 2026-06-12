import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import ProductBuyButton from "./_components/ProductBuyButton";
import { FilterSidebar } from "./_components/FilterSidebar";
import type { CategoryItem } from "./_components/FilterSidebar";
import Pagination from "@/components/shared/Pagination";
import {
  Package, ShieldCheck, ShoppingBag, ShoppingCart, Store,
  Pencil, CheckCircle,
} from "lucide-react";
import { CommunityBanner } from "./_components/CommunityBanner";
import { SortSelect } from "./_components/SortSelect";

const PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "Hệ Thống MMO",
  description: "Mua tài khoản, tool MMO, niche site an toàn — giao hàng tự động sau thanh toán.",
};

const SORT_LABELS: Record<string, string> = {
  "noi-bat":  "Nổi Bật",
  "ban-chay": "Bán Chạy",
  "moi-nhat": "Mới Nhất",
  "gia-cao":  "Giá Cao",
  "gia-thap": "Giá Thấp",
};

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
  searchParams: Promise<{ category?: string; sort?: string; q?: string; price?: string; page?: string; subcategory?: string }>;
}) {
  await guardPublicPage("tai-nguyen-mmo");
  const [{ category, sort: sortParam, q: rawQ, price: priceParam, page: pageParam, subcategory: subcategoryParam }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);

  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);

  const activeSort = (sortParam as SortId | undefined) ?? "noi-bat";
  const q = rawQ?.trim() || undefined;
  const me = session?.user as AuthenticatedUser | undefined;
  const isLoggedIn = !!me;

  // Parse price range param (format: "min-max")
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (priceParam) {
    const parts = priceParam.split("-");
    const rawMin = parts[0];
    const rawMax = parts[1];
    if (rawMin !== undefined) {
      const n = Number(rawMin);
      if (!isNaN(n)) minPrice = n;
    }
    if (rawMax !== undefined) {
      const n = Number(rawMax);
      // 9999999999 = sentinel for "no upper bound"
      if (!isNaN(n) && n < 9_999_999_999) maxPrice = n;
    }
  }
  // Gộp min/max thành 1 object để tránh key collision khi spread
  const priceFilter = (minPrice !== undefined || maxPrice !== undefined)
    ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
    : {};

  // Exclude locked seller shops
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
        isActive: true,
        deletedAt: null,
        items: { some: { status: "AVAILABLE" } },
        ...(category ? { categoryGroup: category } : {}),
        ...(subcategoryParam ? { category: subcategoryParam } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
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
      where: { isActive: true, deletedAt: null, items: { some: { status: "AVAILABLE" } } },
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
        stockItems: { some: { status: "AVAILABLE" } },
        ...(lockedSellerIds.length > 0 ? { NOT: { sellerId: { in: lockedSellerIds } } } : {}),
        ...(category ? { sellerCategory: category } : {}),
        ...(subcategoryParam ? { seller: { subCategories: { some: { subCategory: { name: subcategoryParam, isActive: true } } } } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
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
        stockItems: { some: { status: "AVAILABLE" } },
        ...(lockedSellerIds.length > 0 ? { NOT: { sellerId: { in: lockedSellerIds } } } : {}),
      },
      select: { sellerCategory: true },
      distinct: ["sellerCategory"],
      orderBy: { sellerCategory: "asc" },
    }),
    prisma.resourceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true, iconUrl: true,
        subCategories: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const [purchasedSellerIds, reviewedSellerIds, purchasedMmoIds, reviewedMmoIds] = me
    ? await Promise.all([
        prisma.order.findMany({
          where: { userId: me.id, orderType: "SELLER_PRODUCT", status: "DONE" },
          select: { sellerProductId: true },
          distinct: ["sellerProductId"],
        }).then((rows) => new Set(rows.map((r) => r.sellerProductId!).filter(Boolean))),
        prisma.review.findMany({
          where: { userId: me.id, productType: "SELLER_PRODUCT" },
          select: { productId: true },
        }).then((rows) => new Set(rows.map((r) => r.productId))),
        prisma.order.findMany({
          where: { userId: me.id, orderType: "MMO_PRODUCT", status: "DONE" },
          select: { mmoProductId: true },
          distinct: ["mmoProductId"],
        }).then((rows) => new Set(rows.map((r) => r.mmoProductId!).filter(Boolean))),
        prisma.review.findMany({
          where: { userId: me.id, productType: "MMO_PRODUCT" },
          select: { productId: true },
        }).then((rows) => new Set(rows.map((r) => r.productId))),
      ])
    : [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];

  const mmoReviewMap = new Map(
    mmoReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );
  const sellerReviewMap = new Map(
    sellerReviewStats.map((r) => [r.productId, { count: r._count.id, avg: r._avg.rating ?? 0 }])
  );
  const categoryIconMap = new Map(resourceCategories.map((c) => [c.name, c.iconUrl]));

  // Build unified category list — sorted by resourceCategory displayOrder
  const mmoGroupSet = new Set(allMmoGroups.map((c) => c.categoryGroup));
  const sellerCatSet = new Set(allSellerCats.map((c) => c.sellerCategory));
  const allCategoryNames = new Set([...mmoGroupSet, ...sellerCatSet]);
  const allCategories = [
    ...resourceCategories.map((c) => c.name).filter((n) => allCategoryNames.has(n)),
    ...[...allCategoryNames].filter((n) => !resourceCategories.some((r) => r.name === n)).sort(),
  ];

  // Compute per-category counts from current result set
  const mmoGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    acc[p.categoryGroup] = (acc[p.categoryGroup] ?? 0) + 1;
    return acc;
  }, {});
  const sellerGrouped = sellerProducts.reduce<Record<string, number>>((acc, p) => {
    acc[p.sellerCategory] = (acc[p.sellerCategory] ?? 0) + 1;
    return acc;
  }, {});

  // Compute per-sub-category counts
  // MMO: category field = sub-category name
  const mmoSubGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  // Seller: subCategoryId → look up name from resourceCategories
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

  // eslint-disable-next-line react-hooks/purity
  const fourteenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Strip HTML tags from description
  const stripHtml = (html: string | null) =>
    html ? html.replace(/<[^>]*>/g, "").trim() || null : null;

  // Flatten both product types into a unified list
  const allProducts: UnifiedProduct[] = [
    ...mmoProducts.map((p) => {
      const review = mmoReviewMap.get(p.id);
      return {
        id: p.id,
        kind: "mmo" as const,
        name: p.name,
        description: stripHtml(p.description ?? null),
        imageUrl: p.thumbnail,
        price: Number(p.price),
        rating: review ? review.avg : p.rating,
        reviewCount: review?.count ?? 0,
        salesCount: p.totalOrders,
        available: p._count.items,
        category: p.categoryGroup,
        isNew: p.createdAt > fourteenDaysAgo,
        isHot: p.isFeatured,
        href: `/tai-nguyen-mmo/${p.slug}`,
        createdAt: p.createdAt,
        sellerName: "Hệ thống MMO",
        purchasedByMe: purchasedMmoIds.has(p.id),
        reviewedByMe: reviewedMmoIds.has(p.id),
      };
    }),
    ...sellerProducts.map((sp) => {
      const review = sellerReviewMap.get(sp.id);
      return {
        id: sp.id,
        kind: "seller" as const,
        name: sp.name,
        description: stripHtml(sp.description ?? null),
        imageUrl: sp.imageUrl,
        price: Number(sp.price),
        rating: review?.avg ?? 0,
        reviewCount: review?.count ?? 0,
        salesCount: sp.salesCount,
        available: sp._count.stockItems,
        isNew: sp.createdAt > fourteenDaysAgo,
        isHot: sp.salesCount >= 15,
        href: `/tai-nguyen-mmo/san-pham/${sp.id}`,
        createdAt: sp.createdAt,
        sellerName: `#${sp.seller.uidPrefix}`,
        purchasedByMe: purchasedSellerIds.has(sp.id),
        reviewedByMe: reviewedSellerIds.has(sp.id),
        category: sp.sellerCategory,
      };
    }),
  ];

  // Sort unified list — category displayOrder is always the primary key
  const resCatOrder = new Map(resourceCategories.map((c, idx) => [c.name, idx]));
  const sortedProducts = [...allProducts].sort((a, b) => {
    const oa = resCatOrder.get(a.category) ?? 999;
    const ob = resCatOrder.get(b.category) ?? 999;
    if (oa !== ob) return oa - ob;
    if (activeSort === "ban-chay") return b.salesCount - a.salesCount;
    if (activeSort === "moi-nhat") return b.createdAt.getTime() - a.createdAt.getTime();
    if (activeSort === "gia-cao")  return b.price - a.price;
    if (activeSort === "gia-thap") return a.price - b.price;
    // noi-bat: hot first, then by sales count
    if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
    return b.salesCount - a.salesCount;
  });

  const totalCount = sortedProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedProducts = sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Preserve current filters when navigating pages
  const paginationParams: Record<string, string> = {};
  if (category)         paginationParams["category"]    = category;
  if (sortParam)        paginationParams["sort"]        = sortParam;
  if (rawQ)             paginationParams["q"]           = rawQ;
  if (priceParam)       paginationParams["price"]       = priceParam;
  if (subcategoryParam) paginationParams["subcategory"] = subcategoryParam;

  return (
    <div className="min-h-screen bg-[#f1f5f9]">

      {/* ── CỘNG ĐỒNG MMO (client component with popup modals) ── */}
      <CommunityBanner />

{/* ── MAIN LAYOUT ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">

        {/* View tabs + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
          <div className="flex items-center gap-0.5 bg-white rounded-xl border border-border p-1 w-fit">
            <span className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg whitespace-nowrap">
              Tất cả sản phẩm
            </span>
            <Link href="/tai-nguyen-mmo/gian-hang" scroll={false} className="px-4 py-2 text-sm font-semibold text-text-muted hover:text-primary hover:bg-[#f1f5f9] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <Store size={14} strokeWidth={2} />
              Gian hàng MMO
            </Link>
          </div>
          <div className="overflow-x-auto">
            <SortSelect />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">

          {/* Filter sidebar — top on mobile, sticky left column on desktop */}
          <Suspense
            fallback={
              <aside className="w-full lg:w-70">
                <div className="bg-white rounded-xl border border-border h-40 lg:h-120 animate-pulse" />
              </aside>
            }
          >
            <FilterSidebar categories={categoryItems} totalCount={totalCount} />
          </Suspense>

          {/* Right: Product grid */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            <div className="mb-4 px-1">
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-dark">{totalCount.toLocaleString("vi-VN")}</span>{" "}
                sản phẩm
                {category && (
                  <span className="ml-1">
                    trong <span className="font-semibold text-text-dark">&quot;{category}&quot;</span>
                  </span>
                )}
                {subcategoryParam && (
                  <span className="ml-1">
                    › <span className="font-semibold text-text-dark">&quot;{subcategoryParam}&quot;</span>
                  </span>
                )}
                {q && (
                  <span className="ml-1">
                    — tìm <span className="font-semibold text-text-dark">&quot;{q}&quot;</span>
                  </span>
                )}
              </p>
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
              /* 4-column product grid */
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {pagedProducts.map((p) => {
                  return (
                    <div
                      key={`${p.kind}-${p.id}`}
                      className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
                    >
                      {/* ── IMAGE AREA 16:9 ── */}
                      <Link href={p.href} className="block relative shrink-0">
                        <div className="aspect-video bg-[#f1f5f9] overflow-hidden relative">
                          {/* Product image */}
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

                          {/* HOT / NEW badge — top-left */}
                          <div className="absolute top-2 left-2">
                            {p.isHot ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-danger text-white uppercase tracking-wide shadow">
                                HOT
                              </span>
                            ) : p.isNew ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#22c55e] text-white uppercase tracking-wide shadow">
                                NEW
                              </span>
                            ) : null}
                          </div>

                          {/* Star rating overlay — bottom of image */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-2.5 pt-5 pb-2 flex items-center justify-between">
                            {p.reviewCount > 0 ? (
                              <div className="flex items-center gap-1">
                                <StarBar rating={p.rating} size="xs" />
                                <span className="text-[11px] font-bold text-white leading-none">
                                  {p.rating.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-white/60">({p.reviewCount})</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-white/50 italic">Chưa có đánh giá</span>
                            )}
                            {/* Shop chip */}
                            {p.kind === "mmo" ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-600/80 text-white backdrop-blur-sm">
                                <ShieldCheck size={8} strokeWidth={2.5} /> MMO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-600/80 text-white backdrop-blur-sm">
                                <Store size={8} strokeWidth={2.5} /> {p.sellerName}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* ── PRODUCT INFO ── */}
                      <div className="p-3 flex flex-col gap-1.5 flex-1">
                        {/* Name */}
                        <Link href={p.href}>
                          <h3 className="text-sm font-bold text-text-dark hover:text-[#2563eb] transition-colors line-clamp-2 leading-snug">
                            {p.name}
                          </h3>
                        </Link>

                        {/* Description */}
                        {p.description && (
                          <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        {/* Stats row: Đã bán · Còn */}
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart size={9} strokeWidth={2} />
                            <span>Đã bán <strong className="text-[#374151]">{p.salesCount}</strong></span>
                          </span>
                          <span className="text-[#d1d5db]">·</span>
                          <span>
                            Còn <strong className="text-[#374151]">{p.available}</strong>
                          </span>
                        </div>

                        {/* Review action (purchased users only) */}
                        {p.purchasedByMe && !p.reviewedByMe && (
                          <Link
                            href={p.href}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
                          >
                            <Pencil size={9} strokeWidth={2} /> Đánh giá
                          </Link>
                        )}
                        {p.purchasedByMe && p.reviewedByMe && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] w-fit">
                            <CheckCircle size={9} strokeWidth={2} /> Đã đánh giá
                          </span>
                        )}

                        {/* Bottom: Price (4) + Buy button (6) */}
                        <div className="mt-auto pt-2 grid grid-cols-[2fr_3fr] gap-2 items-stretch">
                          <div className="flex items-center justify-center bg-[#fff1f2] border border-[#fca5a5] rounded-lg px-1 py-2">
                            <span className="text-xs font-extrabold text-[#e11d48] whitespace-nowrap leading-none">
                              {formatVnd(p.price)}
                            </span>
                          </div>
                          <ProductBuyButton
                            orderType={p.kind === "mmo" ? "MMO_PRODUCT" : "SELLER_PRODUCT"}
                            itemId={p.id}
                            itemName={p.name}
                            price={p.price}
                            isLoggedIn={isLoggedIn}
                            avgRating={p.rating}
                            reviewCount={p.reviewCount}
                            available={p.available}
                            totalSold={p.salesCount}
                            sellerName={p.kind === "seller" ? p.sellerName : undefined}
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/tai-nguyen-mmo"
                searchParams={paginationParams}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
