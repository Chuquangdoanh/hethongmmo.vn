import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import TutTrickCard from "./_components/TutTrickCard";
import TutCategoryFilterClient from "./_components/TutCategoryFilterClient";
import TutTierFilterClient from "./_components/TutTierFilterClient";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getDiscountInfo } from "@/lib/utils/discount";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "TUT & Tricks MMO | Hệ Thống MMO",
  description: "Bí quyết tăng trưởng, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia MMO hàng đầu Việt Nam.",
  url: "/tut-tricks",
});

export default async function TutTricksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tier?: string }>;
}) {
  await guardPublicPage("tut-tricks");
  const [{ category, tier }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);
  const isLoggedIn = !!session?.user;
  const userId = (session?.user as { id: string } | null | undefined)?.id;

  const [items, dbCategories, paidCount, userRow] = await Promise.all([
    prisma.tutTrick.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(category ? { category } : {}),
        ...(tier ? { tier } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        platform: true, category: true, tier: true, price: true,
        successRate: true, rating: true, totalOrders: true,
        isFeatured: true, publishedDate: true, description: true,
        warrantyPolicy: true, processingTime: true,
      },
    }),
    prisma.tutTrickCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, iconUrl: true },
    }),
    prisma.tutTrick.count({
      where: { isActive: true, deletedAt: null, tier: "Có phí" },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { discountPercent: true, totalDeposited: true } })
      : Promise.resolve(null),
  ]);

  const discountPct = userRow
    ? getDiscountInfo(Number(userRow.totalDeposited), userRow.discountPercent).pct
    : 0;

  // Sort by category displayOrder (dbCategories already ordered by displayOrder)
  const catOrder = new Map(dbCategories.map((c, idx) => [c.name, idx]));
  items.sort((a, b) => (catOrder.get(a.category ?? "") ?? 999) - (catOrder.get(b.category ?? "") ?? 999));

  // Build icon lookup map
  const categoryIconMap = Object.fromEntries(
    dbCategories.map((c) => [c.name, c.iconUrl ?? null]),
  );

  function buildUrl(params: { category?: string; tier?: string }) {
    const p = new URLSearchParams();
    if (params.category) p.set("category", params.category);
    if (params.tier) p.set("tier", params.tier);
    const qs = p.toString();
    return qs ? `/tut-tricks?${qs}` : "/tut-tricks";
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative bg-[#f1f5f9] py-14 text-center overflow-hidden select-none border-b border-border">

        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <span className="inline-flex items-center gap-1.5 mb-5 px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest bg-[#f59e0b] text-black uppercase shadow-lg">
            ⚡ KHO TUT TRICK ĐỘC QUYỀN
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#111827] mb-1 tracking-tight leading-tight">
            TUT / <span className="text-[#ef4444]">TRICK</span>
          </h1>
          <h2 className="text-2xl md:text-4xl font-bold text-[#111827] mb-4 tracking-wide">
            Cộng Đồng MMO Việt Nam
          </h2>
          <p className="text-base md:text-lg text-[#6b7280] leading-relaxed mb-10">
            Bí quyết tăng trưởng chiến, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia.
          </p>

          <div className="inline-flex items-center divide-x divide-[#e5e7eb] rounded-2xl border border-[#e5e7eb] bg-white px-2 py-1 shadow-sm">
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-[#111827]">{paidCount}</p>
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mt-0.5 leading-tight max-w-[72px]">TutTrick có phí</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-[#111827]">100%</p>
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mt-0.5 leading-tight max-w-[90px]">Tut được cập nhật mới nhất bởi chuyên gia</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-[#111827]">24/7</p>
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mt-0.5 leading-tight">Hỗ trợ trực tuyến</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters + Grid ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">

        {/* Danh mục filter — scroll đến grid khi click */}
        {dbCategories.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2 text-center">Danh mục</p>
            <div className="flex justify-center">
              <TutCategoryFilterClient
                categories={dbCategories.map((c) => ({ name: c.name, icon: c.iconUrl ?? "" }))}
                activeCategory={category}
                activeTier={tier}
              />
            </div>
          </div>
        )}

        {/* Loại tut filter (Miễn phí / Có phí) */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2 text-center">Loại tut</p>
          <div className="flex justify-center">
            <TutTierFilterClient activeCategory={category} activeTier={tier} />
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#64748b]">
            Hiển thị <span className="font-semibold text-[#0f172a]">{items.length}</span> sản phẩm
            {tier ? ` · ${tier}` : ""}
            {category ? ` · ${category}` : ""}
          </p>
          <span className="text-[11px] font-semibold text-[#374151] bg-[#e5e7eb] px-3 py-1 rounded-full">
            {items.length} sản phẩm
          </span>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-24 text-[#64748b]">
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center">
                <SearchX size={36} strokeWidth={1.5} className="text-[#3b82f6]" />
              </div>
            </div>
            <p className="font-semibold text-[#0f172a] text-base">Không tìm thấy tài liệu</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc để xem thêm nội dung.</p>
          </div>
        ) : (
          <div id="tut-tricks-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <TutTrickCard
                key={item.id}
                item={{
                  ...item,
                  price: Number(item.price),
                  publishedDate: item.publishedDate ? item.publishedDate.toISOString() : null,
                  catIcon: item.category ? (categoryIconMap[item.category] ?? null) : null,
                }}
                isLoggedIn={isLoggedIn}
                discountPct={discountPct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
