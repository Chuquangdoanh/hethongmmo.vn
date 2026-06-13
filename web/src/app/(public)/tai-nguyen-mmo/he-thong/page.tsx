import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import {
  Building2, BadgeCheck, ShoppingCart, Star,
  MessageCircle, CheckCircle, Headphones, Package, RefreshCw,
  LayoutGrid, SortAsc, ShieldCheck, Clock,
} from "lucide-react";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "Tài Nguyên Hệ Thống MMO | Hệ Thống MMO",
  description: "Nhà cung cấp tài nguyên MMO chính thức — tài khoản, tool, khóa học chất lượng cao, giao hàng tự động.",
  url: "/tai-nguyen-mmo/he-thong",
  image: "/images/hethong.png",
});

const SORT_OPTIONS = [
  { id: "newest",     label: "Mới nhất" },
  { id: "bestsell",   label: "Bán chạy" },
  { id: "price_asc",  label: "Giá thấp" },
  { id: "price_desc", label: "Giá cao"  },
] as const;
type SortId = (typeof SORT_OPTIONS)[number]["id"];

function getProductBadge(totalOrders: number, idx: number, createdAt: Date) {
  const ageMs = Date.now() - createdAt.getTime();
  if (idx === 0 && totalOrders > 5) return { label: "BEST SELLER", bg: "#0d9488", color: "#fff" };
  if (totalOrders > 3)              return { label: "HOT",          bg: "#ef4444", color: "#fff" };
  if (ageMs < 7 * 86_400_000)      return { label: "NEW",          bg: "#10b981", color: "#fff" };
  return null;
}

export default async function SystemProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory = sp.category ?? "all";
  const activeSort     = (sp.sort ?? "newest") as SortId;

  const [completedOrders, reviewStats, allProducts] = await Promise.all([
    prisma.order.count({ where: { NOT: { mmoProductId: null }, status: "DONE" } }),
    prisma.review.aggregate({
      where: { productType: "MMO_PRODUCT" },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.mmoProduct.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true, name: true, slug: true, thumbnail: true,
        category: true, categoryGroup: true, price: true,
        totalOrders: true, createdAt: true,
        _count: { select: { items: { where: { status: "AVAILABLE" } } } },
      },
    }),
  ]);

  // Category sidebar from categoryGroup
  const categoryCounts: Record<string, number> = {};
  for (const p of allProducts) {
    categoryCounts[p.categoryGroup] = (categoryCounts[p.categoryGroup] ?? 0) + 1;
  }
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  // Filter + sort
  let products = activeCategory === "all"
    ? allProducts
    : allProducts.filter((p) => p.categoryGroup === activeCategory);

  if (activeSort === "bestsell")        products = [...products].sort((a, b) => b.totalOrders - a.totalOrders);
  else if (activeSort === "price_asc")  products = [...products].sort((a, b) => Number(a.price) - Number(b.price));
  else if (activeSort === "price_desc") products = [...products].sort((a, b) => Number(b.price) - Number(a.price));
  else                                  products = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const avgRating   = reviewStats._avg.rating ?? 0;
  const reviewCount = reviewStats._count.id;

  const positiveReviews = await prisma.review.count({
    where: { productType: "MMO_PRODUCT", rating: { gte: 4 } },
  });
  const trustRate = reviewCount > 0 ? Math.round((positiveReviews / reviewCount) * 100) : 100;

  function buildUrl(patch: Record<string, string | null>) {
    const next: Record<string, string> = {};
    if (activeCategory !== "all") next.category = activeCategory;
    if (activeSort !== "newest")  next.sort = activeSort;
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete next[k];
      else next[k] = v;
    }
    const qs = new URLSearchParams(next).toString();
    return `/tai-nguyen-mmo/he-thong${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-5 flex-wrap">
        <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href="/tai-nguyen-mmo" className="hover:text-[#0066ff] transition-colors">Marketplace</Link>
        <span>/</span>
        <span className="text-[#64748b] font-medium">Hệ Thống MMO</span>
      </nav>

      {/* ── Header card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6d28d9] to-[#0066ff] flex items-center justify-center ring-4 ring-white shadow-md">
              <Building2 size={36} strokeWidth={1.5} className="text-white" />
            </div>
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-[#0f172a]">Hệ Thống MMO</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                <BadgeCheck size={11} strokeWidth={2.5} /> Chính thức
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f0fdf4] text-[#16a34a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
                Online
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ede9fe] text-[#6d28d9]">
                Nền tảng
              </span>
            </div>
            <p className="text-xs text-[#64748b]">Nhà cung cấp tài nguyên MMO chính thức của hethongmmo.vn</p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
              {[
                { Icon: Star,         color: "#f59e0b", value: avgRating > 0 ? avgRating.toFixed(1) : "—", sub: `(${reviewCount} đánh giá)` },
                { Icon: ShoppingCart, color: "#0066ff", value: completedOrders.toLocaleString("vi-VN"),      sub: "Đơn hoàn thành" },
                { Icon: ShieldCheck,  color: "#10b981", value: "100%",                                        sub: "Phản hồi nhanh" },
                { Icon: BadgeCheck,   color: "#7c3aed", value: `${trustRate}%`,                               sub: "Uy tín" },
              ].map(({ Icon, color, value, sub }) => (
                <div key={sub} className="flex items-center gap-2">
                  <Icon size={16} strokeWidth={1.75} style={{ color }} />
                  <span className="text-sm font-extrabold text-[#0f172a]">{value}</span>
                  <span className="text-xs text-[#64748b]">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Categories */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
              <LayoutGrid size={13} strokeWidth={2} className="text-[#0066ff]" />
              Danh mục sản phẩm
            </p>
            <div className="space-y-0.5">
              <Link
                href={buildUrl({ category: null, sort: null })}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeCategory === "all" ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#374151] hover:bg-[#f8fafc]"}`}
              >
                <span>Tất cả sản phẩm</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === "all" ? "bg-[#1d4ed8] text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                  {allProducts.length}
                </span>
              </Link>
              {categories.map(([cat, count]) => (
                <Link
                  key={cat}
                  href={buildUrl({ category: cat, sort: null })}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#374151] hover:bg-[#f8fafc]"}`}
                >
                  <span className="truncate mr-2">{cat}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === cat ? "bg-[#1d4ed8] text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Commitments */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
              <BadgeCheck size={13} strokeWidth={2} className="text-[#10b981]" />
              Cam kết từ hệ thống
            </p>
            <div className="space-y-2">
              {[
                { Icon: CheckCircle, color: "#10b981", label: "Sản phẩm chất lượng"  },
                { Icon: RefreshCw,   color: "#0066ff", label: "Bảo hành đổi trả"     },
                { Icon: Headphones,  color: "#7c3aed", label: "Hỗ trợ 24/7"           },
                { Icon: Package,     color: "#f59e0b", label: "Giao hàng tức thì"     },
              ].map(({ Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs text-[#475569]">
                  <Icon size={13} strokeWidth={2} style={{ color }} className="shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-xs font-bold text-[#0f172a] mb-3">Chăm sóc khách hàng Hệ Thống MMO</p>
            <div className="space-y-2.5">
              {/* Telegram */}
              <a
                href="https://t.me/BossMeta789"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#0088cc] hover:underline"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                @BossMeta789
              </a>
              {/* Facebook */}
              <a
                href="https://www.facebook.com/Chu.Quang.Doanh.Media88/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#1877f2] hover:underline"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                HỆ THỐNG MMO
              </a>
              {/* Hours */}
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <Clock size={13} strokeWidth={2} className="text-[#64748b] shrink-0" />
                08:00 – 23:00 hàng ngày
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Tabs + sort */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 flex items-center gap-2 flex-wrap">
            <Link
              href={buildUrl({ category: null, sort: null })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border-b-2 ${activeCategory === "all" ? "text-[#0066ff] border-[#0066ff]" : "text-[#64748b] border-transparent hover:text-[#0f172a]"}`}
            >
              Tất cả
            </Link>
            {categories.map(([cat]) => (
              <Link
                key={cat}
                href={buildUrl({ category: cat, sort: null })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border-b-2 ${activeCategory === cat ? "text-[#0066ff] border-[#0066ff]" : "text-[#64748b] border-transparent hover:text-[#0f172a]"}`}
              >
                {cat}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <SortAsc size={13} strokeWidth={2} className="text-[#94a3b8]" />
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map(({ id, label }) => (
                  <Link
                    key={id}
                    href={buildUrl({ sort: id === "newest" ? null : id })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${activeSort === id ? "bg-[#0066ff] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Product grid */}
          {products.length === 0 ? (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-16 text-center">
              <Package size={48} strokeWidth={1.25} className="text-[#cbd5e1] mx-auto mb-3" />
              <p className="text-sm text-[#64748b]">Chưa có sản phẩm nào trong danh mục này</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p, idx) => {
                const inStock = p._count.items;
                const outStock = inStock === 0;
                const badge = getProductBadge(p.totalOrders, idx, p.createdAt);
                return (
                  <Link
                    key={p.id}
                    href={`/tai-nguyen-mmo/${p.slug}`}
                    className="group rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden hover:border-[#0066ff] hover:shadow-lg transition-all"
                  >
                    <div className="aspect-video bg-[#f1f5f9] relative overflow-hidden">
                      {p.thumbnail ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r2Url(p.thumbnail)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none" loading="lazy" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r2Url(p.thumbnail)} alt={p.name} className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingCart size={36} strokeWidth={1.25} className="text-[#cbd5e1]" />
                        </div>
                      )}
                      {outStock && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-20">
                          <span className="text-[11px] font-extrabold text-white bg-[#EF4444] px-3 py-1 rounded-lg tracking-widest">HẾT HÀNG</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-black/45 text-white backdrop-blur-sm">
                        {p.categoryGroup}
                      </span>
                      {badge && (
                        <span
                          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5">
                      <p className="text-sm font-bold text-[#0f172a] line-clamp-2 mb-2 group-hover:text-[#0066ff] transition-colors leading-snug">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star size={11} strokeWidth={0} fill="#f59e0b" className="text-[#f59e0b]" />
                        <span className="text-[11px] font-semibold text-[#374151]">
                          {avgRating > 0 ? avgRating.toFixed(1) : "Mới"}
                        </span>
                        {p.totalOrders > 0 && (
                          <>
                            <span className="text-[#d1d5db]">·</span>
                            <span className="text-[11px] text-[#64748b]">{p.totalOrders} đã bán</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-[#e11d48]">
                          {formatVnd(Number(p.price))}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-[#0066ff] flex items-center justify-center group-hover:bg-[#0052cc] transition-colors shadow-sm">
                          <ShoppingCart size={15} strokeWidth={2} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0066ff]/10 flex items-center justify-center shrink-0">
                <MessageCircle size={18} strokeWidth={1.75} className="text-[#0066ff]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Không tìm thấy sản phẩm phù hợp?</p>
                <p className="text-xs text-[#64748b]">Khám phá thêm sản phẩm từ các nhà bán hàng uy tín.</p>
              </div>
            </div>
            <Link
              href="/tai-nguyen-mmo"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-[#0066ff] text-white text-sm font-bold hover:bg-[#0052cc] transition-colors"
            >
              Xem tất cả
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
