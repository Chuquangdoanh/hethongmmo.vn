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
  Package, ShoppingBag, ShoppingCart, Store,
  Pencil, CheckCircle,
  FolderOpen, Search, Users, Shield, ChevronRight, X, Star, TrendingUp, Warehouse,
} from "lucide-react";
import { SortSelect } from "./_components/SortSelect";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "Nguyên Liệu MMO | Tài Khoản & Công Cụ Số Chất Lượng Cao",
  description: "Kho nguyên liệu số hàng đầu Việt Nam — tài khoản Facebook, TikTok, công cụ MMO chính hãng. Giao hàng tự động tức thì, bảo hành uy tín, hỗ trợ 24/7.",
  url: "/tai-nguyen-mmo",
  image: "/images/hethongmmo.png",
});

const PAGE_SIZE = 20;
const BASE_PATH = "/tai-nguyen-mmo";

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
    if (rawMin !== undefined) { const n = Number(rawMin); if (!isNaN(n)) minPrice = n; }
    if (rawMax !== undefined) { const n = Number(rawMax); if (!isNaN(n) && n < 9_999_999_999) maxPrice = n; }
  }
  const priceFilter = (minPrice !== undefined || maxPrice !== undefined)
    ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
    : {};

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
    topSellerRows,
  ] = await Promise.all([
    prisma.mmoProduct.findMany({
      where: {
        isActive: true, deletedAt: null, items: { some: { status: "AVAILABLE" } },
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
    prisma.$queryRaw<Array<{ seller_id: string; order_count: number }>>`
      SELECT sp.seller_id, COUNT(o.id)::int AS order_count
      FROM seller_products sp
      LEFT JOIN orders o ON o.seller_product_id = sp.id AND o.status = 'DONE'
      WHERE sp.deleted_at IS NULL AND sp.is_active = true
      GROUP BY sp.seller_id
      ORDER BY order_count DESC
      LIMIT 5
    `,
  ]);

  const topSellerIds = topSellerRows.map((r) => r.seller_id);

  const [purchasedSellerIds, reviewedSellerIds, purchasedMmoIds, reviewedMmoIds, topSellerUsers] =
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
      topSellerIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: topSellerIds } },
            select: { id: true, uidPrefix: true, avatarUrl: true, sellerTier: true },
          })
        : Promise.resolve([] as Array<{ id: string; uidPrefix: string; avatarUrl: string | null; sellerTier: string }>),
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

  // Subcategory chips for the selected (or first) platform
  const featuredPlatformName = category ?? platformCards[0]?.name;
  const featuredPlatformSubcats = featuredPlatformName
    ? (categoryItems.find((c) => c.name === featuredPlatformName)?.subCategories ?? []).filter((s) => (s.count ?? 0) > 0)
    : [];

  // Top sellers for right sidebar
  const sellerRatingAgg = new Map<string, { total: number; count: number }>();
  for (const sp of sellerProducts) {
    const rev = sellerReviewMap.get(sp.id);
    if (rev && rev.count > 0) {
      const existing = sellerRatingAgg.get(sp.seller.id) ?? { total: 0, count: 0 };
      existing.total += rev.avg * rev.count;
      existing.count += rev.count;
      sellerRatingAgg.set(sp.seller.id, existing);
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
        orderCount: Number(topSellerRows.find((r) => r.seller_id === id)?.order_count ?? 0),
        avgRating: rating ? rating.total / rating.count : 0,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

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
        href: `${BASE_PATH}/${p.slug}`, createdAt: p.createdAt,
        sellerName: "Hệ thống MMO",
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

  const totalCount = sortedProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedProducts = sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (category)         paginationParams["category"]    = category;
  if (sortParam)        paginationParams["sort"]        = sortParam;
  if (rawQ)             paginationParams["q"]           = rawQ;
  if (priceParam)       paginationParams["price"]       = priceParam;
  if (subcategoryParam) paginationParams["subcategory"] = subcategoryParam;

  const hasActiveFilter = !!(category || subcategoryParam || q || priceParam);
  const selectedCategories = category ? [category] : [];
  const selectedSubcatNames = subcategoryParam ? [subcategoryParam] : [];

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="mx-auto max-w-345 px-3 py-4 flex flex-col lg:flex-row items-start gap-4">

        {/* ── LEFT FILTER SIDEBAR ── */}
        <Suspense fallback={
          <aside className="w-full lg:w-70">
            <div className="bg-white rounded-xl border border-border h-40 lg:h-120 animate-pulse" />
          </aside>
        }>
          <FilterSidebar categories={categoryItems} totalCount={totalCount} />
        </Suspense>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Dark blue banner */}
          <div className="rounded-2xl bg-linear-to-br from-[#0f2460] via-[#1a3a8f] to-[#0d1f5e] p-5 md:p-7 text-white overflow-hidden relative">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-6 right-24 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <FolderOpen size={20} strokeWidth={1.75} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">
                      Nguyên Liệu MMO
                    </h1>
                    <p className="text-white/60 text-xs mt-0.5">Tài khoản &amp; công cụ số — Giao tự động, Bảo hành uy tín</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
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

              {/* Search form */}
              <form method="get" action={BASE_PATH} className="flex items-center gap-2 w-full md:w-72 shrink-0">
                {category && <input type="hidden" name="category" value={category} />}
                {subcategoryParam && <input type="hidden" name="subcategory" value={subcategoryParam} />}
                {sortParam && <input type="hidden" name="sort" value={sortParam} />}
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                  <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Tìm tên sản phẩm..."
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-white text-[#1a3a8f] text-sm font-bold hover:bg-white/90 transition-colors shrink-0"
                >
                  Tìm
                </button>
              </form>
            </div>
          </div>

          {/* SEO Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-text-muted flex-wrap px-0.5">
            <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
            <ChevronRight size={11} strokeWidth={2} className="text-[#cbd5e1] shrink-0" />
            <Link href={BASE_PATH} className={`hover:text-primary transition-colors ${!selectedCategories.length ? "text-text-dark font-semibold" : ""}`}>
              Nguyên Liệu MMO
            </Link>
            {selectedCategories[0] && (
              <>
                <ChevronRight size={11} strokeWidth={2} className="text-[#cbd5e1] shrink-0" />
                <span className={`${!selectedSubcatNames.length ? "text-text-dark font-semibold" : ""}`}>
                  {selectedCategories[0]}
                </span>
              </>
            )}
            {selectedSubcatNames[0] && (
              <>
                <ChevronRight size={11} strokeWidth={2} className="text-[#cbd5e1] shrink-0" />
                <span className="text-text-dark font-semibold">{selectedSubcatNames[0]}</span>
              </>
            )}
          </nav>

          {/* Store type toggle */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-border p-1 shadow-sm w-fit">
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1e293b] text-white cursor-default">
              <Package size={13} /> Tài Nguyên MMO
            </span>
            <Link
              href="/kho-tai-nguyen"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:bg-[#f1f5f9] transition-colors"
            >
              <Warehouse size={13} /> Kho Tài Nguyên
            </Link>
          </div>

          {/* Danh mục — grid card lớn */}
          {platformCards.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-text-dark">Danh mục</p>
                {category && (
                  <Link href={BASE_PATH} className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-0.5">
                    <X size={11} /> Bỏ lọc
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {platformCards.map((card) => {
                  const isActive = category === card.name;
                  return (
                    <Link
                      key={card.name}
                      href={isActive ? BASE_PATH : `${BASE_PATH}?category=${encodeURIComponent(card.name)}`}
                      className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all group ${
                        isActive
                          ? "border-primary/60 bg-blue-50/40 shadow-sm"
                          : "border-border hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      <div className={`w-13 h-13 rounded-xl overflow-hidden flex items-center justify-center mb-2 shrink-0 ${isActive ? "bg-[#dbeafe]" : "bg-[#f1f5f9]"}`}>
                        {card.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r2Url(card.iconUrl)} alt={card.name} className="w-9 h-9 object-contain" />
                        ) : (
                          <FolderOpen size={22} className={isActive ? "text-primary" : "text-text-muted"} strokeWidth={2} />
                        )}
                      </div>
                      <p className={`font-bold text-[12px] leading-tight truncate w-full ${isActive ? "text-primary" : "text-text-dark group-hover:text-primary"} transition-colors`}>
                        {card.name}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {card.count} SP
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subcategory chips */}
          {featuredPlatformSubcats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted mb-2">
                Loại tài nguyên{featuredPlatformName ? ` ${featuredPlatformName}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={category ? `${BASE_PATH}?category=${encodeURIComponent(category)}` : BASE_PATH}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    !subcategoryParam
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-text-muted border-border hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  Tất cả
                </Link>
                {featuredPlatformSubcats.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`${BASE_PATH}?${category ? `category=${encodeURIComponent(category)}&` : ""}subcategory=${encodeURIComponent(sub.name)}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      subcategoryParam === sub.name
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text-muted border-border hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {sub.name}
                    <span className="ml-1 text-[10px] opacity-70">({sub.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
                  {subcategoryParam && <> › <span className="font-semibold">{subcategoryParam}</span></>}
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
                <Link
                  href={`${BASE_PATH}/gian-hang`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted border border-border hover:border-primary/40 hover:text-primary hover:bg-[#f0f4f8] transition-colors"
                >
                  <Store size={11} strokeWidth={2} />
                  Gian hàng
                  <ChevronRight size={10} strokeWidth={2.5} />
                </Link>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {pagedProducts.map((p) => (
                  <div
                    key={`${p.kind}-${p.id}`}
                    className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
                  >
                    {/* Image area */}
                    <Link href={p.href} className="block relative shrink-0">
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
                    </Link>

                    {/* Product info */}
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <Link href={p.href}>
                        <h3 className="text-sm font-bold text-text-dark hover:text-[#2563eb] transition-colors line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                      </Link>
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

                      {/* Price + Buy */}
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

        {/* ── RIGHT SIDEBAR ── */}
        <div className="hidden xl:flex w-54 shrink-0 flex-col gap-4 self-start sticky top-24">

          {/* System stats */}
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs font-extrabold text-text-dark mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} strokeWidth={2.5} className="text-primary" />
              Thống kê hệ thống
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-light rounded-lg p-2.5 text-center">
                <p className="text-sm font-extrabold text-text-dark">{mmoProducts.length + sellerProducts.length}</p>
                <p className="text-[9px] text-text-muted mt-0.5">Sản phẩm</p>
              </div>
              <div className="bg-light rounded-lg p-2.5 text-center">
                <p className="text-sm font-extrabold text-text-dark">{totalSellers}</p>
                <p className="text-[9px] text-text-muted mt-0.5">Nhà bán</p>
              </div>
              <div className="bg-light rounded-lg p-2.5 text-center">
                <p className="text-sm font-extrabold text-text-dark">{allCategories.length}</p>
                <p className="text-[9px] text-text-muted mt-0.5">Danh mục</p>
              </div>
              <div className="bg-light rounded-lg p-2.5 text-center">
                <p className="text-sm font-extrabold text-[#059669]">24/7</p>
                <p className="text-[9px] text-text-muted mt-0.5">Hỗ trợ</p>
              </div>
            </div>
          </div>

          {/* Top sellers */}
          {topSellers.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs font-extrabold text-text-dark mb-3 flex items-center gap-1.5">
                <Users size={13} strokeWidth={2.5} className="text-primary" />
                Top nhà bán hàng
              </p>
              <div className="flex flex-col gap-2.5">
                {topSellers.map((seller, i) => {
                  const gradient = AVATAR_GRADIENTS[idToGradientIndex(seller.id)]!;
                  return (
                    <Link
                      key={seller.id}
                      href={`${BASE_PATH}/nguoi-ban/${seller.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#f1f5f9] text-[10px] font-extrabold text-text-muted flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {seller.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r2Url(seller.avatarUrl)}
                          alt={`#${seller.uidPrefix}`}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className={`w-7 h-7 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center shrink-0`}>
                          <Store size={12} strokeWidth={1.75} className="text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-text-dark truncate group-hover:text-primary transition-colors">
                          #{seller.uidPrefix}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {seller.avgRating > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-warning">
                              <Star size={7} fill="#f59e0b" />
                              {seller.avgRating.toFixed(1)}
                            </span>
                          )}
                          <span className="text-[9px] text-text-muted">
                            {seller.avgRating > 0 ? "·" : ""} {seller.orderCount} đơn
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link
                href={`${BASE_PATH}/gian-hang`}
                className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold text-primary border border-primary/40 hover:bg-primary hover:text-white transition-all text-center flex items-center justify-center gap-1"
              >
                Xem tất cả gian hàng
                <ChevronRight size={11} strokeWidth={2.5} />
              </Link>
            </div>
          )}

          {/* Trust badges */}
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center shrink-0">
                  <Shield size={12} strokeWidth={2} className="text-[#1d4ed8]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-dark">Giao hàng tự động</p>
                  <p className="text-[9px] text-text-muted">Nhận ngay sau thanh toán</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#dcfce7] flex items-center justify-center shrink-0">
                  <CheckCircle size={12} strokeWidth={2} className="text-[#059669]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-dark">Bảo hành uy tín</p>
                  <p className="text-[9px] text-text-muted">Hỗ trợ đổi trả nhanh</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
                  <Star size={12} strokeWidth={2} className="text-[#d97706]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-dark">Đánh giá thực</p>
                  <p className="text-[9px] text-text-muted">Từ người mua đã xác minh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
