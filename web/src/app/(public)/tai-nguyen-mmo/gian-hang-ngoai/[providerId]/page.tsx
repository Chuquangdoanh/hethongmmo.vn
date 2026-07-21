import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import { getPublicProviderInfo } from "@/lib/external-providers/providers-config";
import { getExternalProductSoldCounts } from "@/lib/services/external-product-stats.service";
import { extractKhuongfbStockAmount } from "@/lib/khuongfb/types";
import { FaTelegramPlane, FaFacebook } from "react-icons/fa";
import {
  Store, BadgeCheck, ShoppingCart, Star,
  MessageCircle, Clock, CheckCircle, Headphones,
  Package, RefreshCw, LayoutGrid, SortAsc,
} from "lucide-react";

const SORT_OPTIONS = [
  { id: "newest",     label: "Mới nhất"  },
  { id: "bestsell",   label: "Bán chạy"  },
  { id: "price_asc",  label: "Giá thấp"  },
  { id: "price_desc", label: "Giá cao"   },
] as const;
type SortId = (typeof SORT_OPTIONS)[number]["id"];

function providerLogoSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return r2Url(imageUrl);
}

function thumbnailSrc(thumbnail: string | null): string | null {
  if (!thumbnail) return null;
  return thumbnail.startsWith("http") ? thumbnail : r2Url(thumbnail);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerId: string }>;
}): Promise<Metadata> {
  const { providerId } = await params;
  const provider = await getPublicProviderInfo(providerId);
  if (!provider) return { title: "Không tìm thấy gian hàng" };
  const title = `${provider.name} — Gian hàng MMO`;
  const description = `Khám phá sản phẩm số từ gian hàng ${provider.name} trên hethongmmo.vn — giao tự động, bảo hành đầy đủ, hỗ trợ 24/7.`;
  const image = providerLogoSrc(provider.imageUrl);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/tai-nguyen-mmo/gian-hang-ngoai/${providerId}`,
      siteName: "hethongmmo.vn",
      locale: "vi_VN",
      type: "website",
      images: [{ url: image ?? "/images/hethongmmo.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image ?? "/images/hethongmmo.png"],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExternalShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const [{ providerId }, sp, cmsData] = await Promise.all([
    params,
    searchParams,
    getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_TAI_NGUYEN),
  ]);

  const provider = await getPublicProviderInfo(providerId);
  if (!provider) notFound();

  const contactTitle         = String(cmsData.contactTitle         ?? "Chăm sóc khách hàng Hệ Thống MMO");
  const contactTelegramUrl   = String(cmsData.contactTelegramUrl   ?? "https://t.me/BossMeta789");
  const contactTelegramLabel = String(cmsData.contactTelegramLabel ?? "@BossMeta789");
  const contactFacebookUrl   = String(cmsData.contactFacebookUrl   ?? "https://www.facebook.com/Chu.Quang.Doanh.Media88/");
  const contactFacebookLabel = String(cmsData.contactFacebookLabel ?? "HỆ THỐNG MMO");
  const contactHours         = String(cmsData.contactHours         ?? "08:00 – 23:00 hàng ngày");

  const activeCategory = sp.category ?? "all";
  const activeSort     = (sp.sort ?? "newest") as SortId;

  const allProducts = await prisma.externalProduct.findMany({
    where: { provider: providerId, isEnabled: true },
    select: {
      id: true, name: true, thumbnail: true, salePrice: true,
      externalCategory: true, createdAt: true, rawData: true,
      resourceCategory: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const soldMap = await getExternalProductSoldCounts(allProducts.map((p) => p.id));

  const enriched = allProducts.map((p) => ({
    id:        p.id,
    name:      p.name,
    thumbnail: p.thumbnail,
    price:     Number(p.salePrice),
    category:  p.resourceCategory?.name ?? p.externalCategory,
    createdAt: p.createdAt,
    salesCount: soldMap.get(p.id) ?? 0,
    available:  extractKhuongfbStockAmount(p.rawData) ?? 0,
  }));

  const totalSold = enriched.reduce((acc, p) => acc + p.salesCount, 0);

  // ── Category sidebar ─────────────────────────────────────────
  const categoryCounts: Record<string, number> = {};
  for (const p of enriched) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  // ── Filter + sort ─────────────────────────────────────────────
  let products = activeCategory === "all"
    ? enriched
    : enriched.filter((p) => p.category === activeCategory);

  if (activeSort === "bestsell")        products = [...products].sort((a, b) => b.salesCount - a.salesCount);
  else if (activeSort === "price_asc")  products = [...products].sort((a, b) => a.price - b.price);
  else if (activeSort === "price_desc") products = [...products].sort((a, b) => b.price - a.price);
  else                                  products = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const logoSrc = providerLogoSrc(provider.imageUrl);

  function buildUrl(patch: Record<string, string | null>) {
    const next: Record<string, string> = {};
    if (activeCategory !== "all") next.category = activeCategory;
    if (activeSort !== "newest")  next.sort     = activeSort;
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete next[k];
      else            next[k] = v;
    }
    const qs = new URLSearchParams(next).toString();
    return `/tai-nguyen-mmo/gian-hang-ngoai/${providerId}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-370 px-4 md:px-5 py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-5 flex-wrap">
        <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href="/tai-nguyen-mmo" className="hover:text-[#0066ff] transition-colors">Tài nguyên MMO</Link>
        <span>/</span>
        <span className="text-[#64748b] font-medium">{provider.name}</span>
      </nav>

      {/* ── Shop header card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Logo */}
          <div className="relative shrink-0">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={provider.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#0052cc] to-[#0066ff] overflow-hidden ring-4 ring-white shadow-md flex items-center justify-center">
                <Store size={36} strokeWidth={1.5} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-[#0f172a]">{provider.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                <BadgeCheck size={11} strokeWidth={2.5} /> Gian hàng đối tác
              </span>
            </div>
            <p className="text-xs text-[#64748b]">Sản phẩm được Hệ Thống MMO kiểm duyệt trước khi bán</p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
              {[
                { Icon: Package,      color: "#0066ff", value: enriched.length.toLocaleString("vi-VN"), sub: "Sản phẩm" },
                { Icon: ShoppingCart, color: "#10b981", value: totalSold.toLocaleString("vi-VN"),       sub: "Đã bán" },
                { Icon: BadgeCheck,   color: "#7c3aed", value: "100%",                                   sub: "Uy tín" },
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

      {/* ── Body: 2-column ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Category list */}
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
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === "all" ? "bg-[#1d4ed8] text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}>{enriched.length}</span>
              </Link>

              {categories.map(([cat, count]) => (
                <Link
                  key={cat}
                  href={buildUrl({ category: cat, sort: null })}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#374151] hover:bg-[#f8fafc]"}`}
                >
                  <span className="truncate mr-2">{cat}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === cat ? "bg-[#1d4ed8] text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}>{count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Commitments */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-xs font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
              <BadgeCheck size={13} strokeWidth={2} className="text-[#10b981]" />
              Cam kết từ gian hàng
            </p>
            <div className="space-y-2">
              {[
                { Icon: CheckCircle, color: "#10b981", label: "Sản phẩm chất lượng" },
                { Icon: RefreshCw,   color: "#0066ff", label: "Bảo hành đổi trả"   },
                { Icon: Headphones,  color: "#7c3aed", label: "Hỗ trợ 24/7"         },
                { Icon: Package,     color: "#f59e0b", label: "Giao hàng tự động"   },
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
            <p className="text-xs font-bold text-[#0f172a] mb-3">{contactTitle}</p>
            <div className="space-y-2.5">
              <a
                href={contactTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#0088cc] hover:underline"
              >
                <FaTelegramPlane size={14} className="shrink-0" />
                {contactTelegramLabel}
              </a>
              <a
                href={contactFacebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#1877f2] hover:underline"
              >
                <FaFacebook size={14} className="shrink-0" />
                {contactFacebookLabel}
              </a>
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <Clock size={13} strokeWidth={2} className="text-[#64748b] shrink-0" />
                <span>{contactHours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Category tabs + sort */}
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
              {products.map((p) => {
                const outStock = p.available === 0;
                const imgSrc = thumbnailSrc(p.thumbnail);
                return (
                  <Link
                    key={p.id}
                    href={`/kfb/${p.id}`}
                    className="group rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden hover:border-[#0066ff] hover:shadow-lg transition-all"
                  >
                    <div className="aspect-video bg-[#f1f5f9] overflow-hidden" style={{ position: "relative" }}>
                      {imgSrc ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgSrc} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none" loading="lazy" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgSrc} alt={p.name} className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
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
                        {p.category}
                      </span>
                    </div>

                    <div className="p-3.5">
                      <p className="text-sm font-bold text-[#0f172a] line-clamp-2 mb-2 group-hover:text-[#0066ff] transition-colors leading-snug">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star size={11} strokeWidth={0} fill="#f59e0b" className="text-[#f59e0b]" />
                        <span className="text-[11px] font-semibold text-[#374151]">
                          {p.salesCount > 0 ? `${p.salesCount} đã bán` : "Mới"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-[#e11d48]">
                          {formatVnd(p.price)}
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
                <p className="text-xs text-[#64748b]">Truy cập ngay trang tài nguyên MMO để tìm kiếm sản phẩm phù hợp.</p>
              </div>
            </div>
            <Link
              href="/tai-nguyen-mmo"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-[#0066ff] text-white text-sm font-bold hover:bg-[#0052cc] transition-colors"
            >
              Truy cập tài nguyên MMO
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
