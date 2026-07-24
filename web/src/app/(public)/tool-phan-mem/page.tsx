import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { FilterSidebar } from "@/app/(public)/tai-nguyen-mmo/_components/FilterSidebar";
import { CategoryFilter } from "@/components/shared/CategoryFilter";
import type { CategoryItem } from "@/app/(public)/tai-nguyen-mmo/_components/FilterSidebar";
import Pagination from "@/components/shared/Pagination";
import { Package, Wrench, Shield, AlertTriangle } from "lucide-react";
import { buildMeta } from "@/lib/utils/seo";
import { batchGetFavoriteData } from "@/lib/services/favorite.service";
import { TaiNguyenProductList } from "@/app/(public)/tai-nguyen-mmo/_components/TaiNguyenProductList";
import type { TaiNguyenProductItem } from "@/app/(public)/tai-nguyen-mmo/_components/TaiNguyenProductList";
import { getUserResourceDiscountPercent } from "@/lib/services/discount.service";

export const metadata: Metadata = buildMeta({
  title: "Tool - Phần Mềm | Công cụ hỗ trợ công việc số",
  description: "Tool - Phần mềm hỗ trợ công việc số hàng đầu Việt Nam — công cụ MMO chính hãng, giao hàng tự động tức thì, bảo hành uy tín, hỗ trợ 24/7.",
  url: "/tool-phan-mem",
  image: "/images/hethongmmo.png",
});

const PAGE_SIZE = 30;
const BASE_PATH = "/tool-phan-mem";

type SortId = "noi-bat" | "ban-chay" | "moi-nhat" | "gia-cao" | "gia-thap";

export default async function ToolPhanMemPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string; tag?: string; price?: string; page?: string; subcategory?: string; rating?: string }>;
}) {
  await guardPublicPage("tool-phan-mem");
  const [{ category, sort: sortParam, q: rawQ, tag: rawTag, price: priceParam, page: pageParam, subcategory: subcategoryParam, rating: ratingParam }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);

  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);
  const activeSort = (sortParam as SortId | undefined) ?? "noi-bat";
  const q = rawQ?.trim() || undefined;
  const tag = rawTag?.trim() || undefined;
  const me = session?.user as AuthenticatedUser | undefined;

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

  const [mmoProducts, allMmoGroups, mmoReviewStats, resourceCategories] = await Promise.all([
    prisma.mmoProduct.findMany({
      where: {
        isActive: true, deletedAt: null, section: "TOOL_PHAN_MEM", items: { some: { status: "AVAILABLE" } },
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
      where: { isActive: true, deletedAt: null, section: "TOOL_PHAN_MEM", items: { some: { status: "AVAILABLE" } } },
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
    prisma.resourceCategory.findMany({
      where: { showInToolPhanMem: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true, iconUrl: true,
        subCategories: {
          where: { isActive: true, showInToolPhanMem: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const [purchasedMmoIds, reviewedMmoIds] = await Promise.all([
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

  const { mmoFavCounts, myMmoFavs } = await batchGetFavoriteData({
    userId: me?.id,
    mmoProductIds: mmoProducts.map((p) => p.id),
    sellerProductIds: [],
  });
  const discountPct = me ? await getUserResourceDiscountPercent(me.id) : 0;
  const categoryIconMap = new Map(resourceCategories.map((c) => [c.name, c.iconUrl]));

  const mmoGroupSet = new Set(allMmoGroups.map((c) => c.categoryGroup));
  const allCategories = [
    ...resourceCategories.map((c) => c.name).filter((n) => mmoGroupSet.has(n)),
    ...[...mmoGroupSet].filter((n) => !resourceCategories.some((r) => r.name === n)).sort(),
  ];

  const mmoGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    acc[p.categoryGroup] = (acc[p.categoryGroup] ?? 0) + 1;
    return acc;
  }, {});
  const mmoSubGrouped = mmoProducts.reduce<Record<string, number>>((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  const resourceCatMap = new Map(resourceCategories.map((c) => [c.name, c]));

  const categoryItems: CategoryItem[] = allCategories.map((name) => ({
    name,
    count: mmoGrouped[name] ?? 0,
    iconUrl: categoryIconMap.get(name) ?? null,
    subCategories: (resourceCatMap.get(name)?.subCategories ?? []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      count: mmoSubGrouped[sub.name] ?? 0,
    })),
  }));

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

  type ToolProduct = TaiNguyenProductItem & { createdAt: Date };
  const allProducts: ToolProduct[] = mmoProducts.map((p) => {
    const review = mmoReviewMap.get(p.id);
    return {
      id: p.id, kind: "mmo" as const, name: p.name,
      description: stripHtml(p.description ?? null), imageUrl: p.thumbnail,
      price: Number(p.price), rating: review ? review.avg : p.rating,
      reviewCount: review?.count ?? 0, salesCount: p.totalOrders,
      available: p._count.items, category: p.categoryGroup,
      isNew: p.createdAt > fourteenDaysAgo, isHot: p.isFeatured,
      href: `${BASE_PATH}/${p.slug}`, sellerName: "Đội ngũ Admin",
      createdAt: p.createdAt,
      purchasedByMe: purchasedMmoIds.has(p.id), reviewedByMe: reviewedMmoIds.has(p.id),
      favoriteCount: mmoFavCounts.get(p.id) ?? 0,
      isFavorite: myMmoFavs.has(p.id),
    };
  });

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

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="mx-auto max-w-370 px-3 py-4 flex flex-col gap-4">

        {/* Banner */}
        <div className="rounded-2xl bg-linear-to-br from-[#0f2460] via-[#1a3a8f] to-[#0d1f5e] p-5 md:p-7 text-white overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-6 right-24 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Wrench size={20} strokeWidth={1.75} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">
                    Tool - Phần Mềm
                  </h1>
                  <p className="text-white/60 text-xs mt-0.5">Tool - Phần mềm hỗ trợ công việc số — Hiệu quả, nhanh chóng, tối ưu.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-amber-400/10 border border-amber-400/25 px-3 py-2.5 flex items-start gap-2.5">
              <AlertTriangle size={16} strokeWidth={2} className="text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
                Toàn bộ sản phẩm tại đây do đội ngũ Admin trực tiếp phát triển và kiểm duyệt trước khi bán ra.
              </p>
            </div>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <Package size={13} strokeWidth={2} className="text-white/70" />
                <span className="text-white/70">Tool - Phần mềm</span>
                <span className="font-extrabold">{totalCount.toLocaleString("vi-VN")}</span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1.5 text-xs">
                <Shield size={13} strokeWidth={2} className="text-white/70" />
                <span className="font-extrabold">Giao tự động 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {allCategoryData.length > 0 && (
          <Suspense fallback={<div className="h-16 rounded-2xl bg-white border border-border animate-pulse" />}>
            <CategoryFilter categories={allCategoryData} basePath={BASE_PATH} />
          </Suspense>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <Suspense fallback={
            <aside className="hidden lg:block lg:w-72 shrink-0">
              <div className="bg-white rounded-xl border border-border h-120 animate-pulse" />
            </aside>
          }>
            <FilterSidebar categories={categoryItems} totalCount={totalCount} basePath={BASE_PATH} />
          </Suspense>
          <div className="flex-1 min-w-0">

            {totalCount === 0 ? (
              <div className="text-center py-24 bg-white rounded-xl border border-border">
                <div className="flex justify-center mb-4">
                  <Package size={52} strokeWidth={1.25} className="text-primary" />
                </div>
                <p className="font-semibold text-text-dark text-base">Chưa có sản phẩm nào</p>
                <p className="text-sm text-text-muted mt-1">Thử điều chỉnh bộ lọc.</p>
              </div>
            ) : (
              <TaiNguyenProductList
                products={pagedProducts}
                discountPct={discountPct}
                basePath={BASE_PATH}
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
  );
}
