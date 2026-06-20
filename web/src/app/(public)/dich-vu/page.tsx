import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import ServiceListWithForm from "./_components/ServiceListWithForm";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import Pagination from "@/components/shared/Pagination";
import { Users, TrendingUp, Star, CheckCircle, Headphones } from "lucide-react";
import { getDiscountInfo } from "@/lib/utils/discount";
import { buildMeta } from "@/lib/utils/seo";
import { ColoredTitle } from "@/components/shared/ColoredTitle";

export const metadata: Metadata = buildMeta({
  title: "Dịch Vụ Mạng Xã Hội | Hệ Thống MMO",
  description: "Mở khóa tài khoản Facebook uy tín hàng đầu Việt Nam.Tăng follow, like, view, sub trên TikTok, Facebook, Instagram, YouTube giá rẻ, uy tín. Hỗ trợ 24/7, bảo hành đầy đủ.",
  url: "/dich-vu",
  image: "/images/dj-media-classroom.jpg",
});

interface WarrantyOption { name: string; price: number; }
interface DeviceVariant { name: string; price: number; }

function parseJsonArray<T extends { name: string; price: number }>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), price: Number(obj.price ?? 0) } as T];
    }
    return [];
  });
}

const LIMIT = 9;

export default async function DichVuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  await guardPublicPage("dich-vu");
  const pageHero = await getSiteContent<{ badge: string; title: string; description: string; thumbnail: string; titleAccentColor: string }>(SITE_CONTENT_KEYS.PAGE_DICH_VU);
  const [{ category, page: pageParam }, session] = await Promise.all([searchParams, auth()]);
  const isLoggedIn = !!session?.user;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const userId = (session?.user as { id: string } | null | undefined)?.id;

  const [rawServices, total, agg, serviceCategoryDefs, testimonials, userRow] = await Promise.all([
    prisma.service.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        platform: true, category: true, price: true,
        successRate: true, processingTime: true,
        rating: true, totalOrders: true, customerCount: true,
        totalViews: true, isFeatured: true,
        description: true, warrantyOptions: true, productList: true,
        requiresAccountType: true, requiresCccd: true,
      },
    }),
    prisma.service.count({
      where: { isActive: true, deletedAt: null, ...(category ? { category } : {}) },
    }),
    prisma.service.aggregate({
      where: { isActive: true, deletedAt: null, ...(category ? { category } : {}) },
      _sum: { customerCount: true, totalOrders: true },
      _avg: { rating: true, successRate: true },
    }),
    prisma.serviceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, iconUrl: true },
    }),
    prisma.testimonial.findMany({
      where: { type: "SERVICE", isActive: true },
      select: {
        id: true, category: true, serviceId: true,
        reviewerName: true, reviewerRole: true,
        reviewerAvatar: true, reviewerInitials: true, reviewerColor: true,
        content: true, rating: true, createdAt: true,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { discountPercent: true, totalDeposited: true } })
      : Promise.resolve(null),
  ]);

  const discountPct = userRow
    ? getDiscountInfo(Number(userRow.totalDeposited), userRow.discountPercent).pct
    : 0;

  const totalPages = Math.ceil(total / LIMIT);

  const services = rawServices.map((s) => ({
    ...s,
    price: s.price.toString(),
    warrantyOptions: parseJsonArray<WarrantyOption>(s.warrantyOptions),
    deviceVariants: parseJsonArray<DeviceVariant>(s.productList),
  }));

  // Sort by category displayOrder (serviceCategoryDefs already ordered by displayOrder)
  const svcCatOrder = new Map(serviceCategoryDefs.map((c, idx) => [c.name, idx]));
  services.sort((a, b) => (svcCatOrder.get(a.category ?? "") ?? 999) - (svcCatOrder.get(b.category ?? "") ?? 999));
  const pagedServices = services.slice((page - 1) * LIMIT, page * LIMIT);

  // Aggregate stats từ toàn bộ dịch vụ khớp filter (không chỉ trang hiện tại)
  const totalCustomers = agg._sum.customerCount ?? 0;
  const totalOrders    = agg._sum.totalOrders ?? 0;
  const avgRating      = agg._avg.rating ?? 5;
  const avgSuccess     = agg._avg.successRate ?? 100;

  const OVERVIEW_STATS = [
    { Icon: Users,       color: "#0066ff", bg: "#dbeafe", value: `${(totalCustomers / 1000).toFixed(0)}K+`, label: "Khách hàng" },
    { Icon: TrendingUp,  color: "#10b981", bg: "#d1fae5", value: `${totalOrders.toLocaleString("vi-VN")}+`,   label: "Đơn hoàn thành" },
    { Icon: Star,        color: "#f59e0b", bg: "#fef3c7", value: avgRating.toFixed(1),                         label: "Đánh giá TB" },
    { Icon: CheckCircle, color: "#7c3aed", bg: "#ede9fe", value: `${Math.round(avgSuccess)}%`,                 label: "Tỷ lệ thành công" },
    { Icon: Headphones,  color: "#e11d48", bg: "#ffe4e6", value: "24/7",                                       label: "Hỗ trợ kỹ thuật" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <div className="mx-auto max-w-370 px-4 md:px-5 py-10">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-text-dark uppercase tracking-wide mb-2">
            <ColoredTitle text={pageHero.title} accentColor={pageHero.titleAccentColor || "#EF4444"} />
          </h1>
          <p className="text-sm text-text-muted">
            {pageHero.description}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {OVERVIEW_STATS.map(({ Icon, color, bg, value, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-border px-4 py-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={18} strokeWidth={1.75} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-text-dark leading-tight">{value}</p>
                <p className="text-[11px] text-text-muted leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>


        {/* Grid + inline form */}
        {services.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-medium">Không có dịch vụ nào</p>
          </div>
        ) : (
          <ServiceListWithForm services={pagedServices} isLoggedIn={isLoggedIn} testimonials={testimonials} discountPct={discountPct} />
        )}

        {/* Pagination */}
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/dich-vu"
            searchParams={category ? { category } : {}}
            scrollToTop
          />
        </div>

      </div>
    </div>
  );
}
