import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import SafeHtml from "@/components/shared/SafeHtml";
import ServiceOrderForm from "./ServiceOrderForm";
import TestimonialsSection from "@/components/shared/TestimonialsSection";

interface Props {
  params: Promise<{ slug: string }>;
}

interface PlatformVariant {
  name: string;
  icon: string;
}

interface WarrantyOption {
  name: string;
  price: number;
}

interface DeviceVariant {
  name: string;
  price: number;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { seoTitle: true, seoDescription: true, name: true, thumbnail: true, description: true },
  });
  if (!service) return { title: "Không tìm thấy" };
  const title = service.seoTitle ?? service.name;
  const description = service.seoDescription ?? service.description ?? "Dịch vụ mạng xã hội uy tín tại hethongmmo.vn — hỗ trợ 24/7, bảo hành đầy đủ.";
  const image = service.thumbnail ? r2Url(service.thumbnail) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/dich-vu/${slug}`,
      siteName: "hethongmmo.vn",
      locale: "vi_VN",
      type: "website",
      images: [{ url: image ?? "/images/facebook_cover_professional.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image ?? "/images/facebook_cover_professional.png"],
    },
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "Twitter (X)", ICLOUD: "iCloud", OTHER: "Khác",
};

const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK:  "https://svgl.app/library/facebook-icon.svg",
  TIKTOK:    "https://svgl.app/library/tiktok-icon-light.svg",
  GOOGLE:    "https://svgl.app/library/google.svg",
  INSTAGRAM: "https://svgl.app/library/instagram-icon.svg",
  YOUTUBE:   "https://svgl.app/library/youtube.svg",
  ICLOUD:    "https://svgl.app/library/icloud.svg",
  ZALO:      "https://svgl.app/library/zalo.svg",
  TELEGRAM:  "https://svgl.app/library/telegram.svg",
  TWITTER:   "https://svgl.app/library/x.svg",
};

function parsePlatformVariants(raw: unknown): PlatformVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), icon: String(obj.icon ?? "") }];
    }
    return [];
  });
}

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

export default async function DichVuDetailPage({ params }: Props) {
  const { slug } = await params;

  const [service, session, testimonials] = await Promise.all([
    prisma.service.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true, name: true, slug: true, platform: true, category: true,
        price: true, thumbnail: true, successRate: true, processingTime: true,
        rating: true, totalOrders: true, totalViews: true, customerCount: true,
        reviewCount: true, description: true, seoTitle: true, seoDescription: true,
        platformVariants: true, warrantyOptions: true, productList: true,
        requiresAccountType: true, requiresCccd: true,
      },
    }),
    auth(),
    prisma.testimonial.findMany({
      where: { type: "SERVICE", isActive: true },
      select: {
        id: true, category: true,
        reviewerName: true, reviewerRole: true,
        reviewerAvatar: true, reviewerInitials: true, reviewerColor: true,
        content: true, rating: true, createdAt: true,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);

  if (!service) notFound();

  const warrantyOptions = parseJsonArray<WarrantyOption>(service.warrantyOptions);
  const platformVariants = parsePlatformVariants(service.platformVariants);
  const deviceVariants = parseJsonArray<DeviceVariant>(service.productList);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              {PLATFORM_ICONS[service.platform] && (
                <span className="flex items-center justify-center w-5 h-5 bg-[#eff6ff] rounded-md p-0.5 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PLATFORM_ICONS[service.platform]} alt={PLATFORM_LABELS[service.platform] ?? service.platform} className="w-full h-full object-contain" />
                </span>
              )}
              <p className="text-xs text-primary font-semibold">{PLATFORM_LABELS[service.platform] ?? service.platform}</p>
            </div>
            <h1 className="text-2xl font-bold text-text-dark mb-3">{service.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
              <span>⭐ {service.rating.toFixed(1)}</span>
              <span>📦 {service.totalOrders.toLocaleString("vi-VN")} đơn</span>
              <span>✅ {service.successRate}% thành công</span>
              {service.processingTime && <span>⏱ {service.processingTime}</span>}
              {service.totalViews > 0 && (
                <span>👁 {service.totalViews.toLocaleString("vi-VN")} lượt xem</span>
              )}
              {service.customerCount > 0 && (
                <span>👥 {service.customerCount.toLocaleString("vi-VN")} khách hàng</span>
              )}
              {service.reviewCount > 0 && (
                <span>💬 {service.reviewCount.toLocaleString("vi-VN")} đánh giá</span>
              )}
            </div>
          </div>

          {/* Platform variants */}
          {platformVariants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {platformVariants.map((v, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white text-xs text-[#334155] font-medium shadow-sm"
                >
                  {v.icon ? (
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.icon} alt={v.name} className="w-full h-full object-contain" />
                    </span>
                  ) : null}
                  {v.name}
                </span>
              ))}
            </div>
          )}

          {/* Thumbnail */}
          {service.thumbnail && (
            <div className="rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(service.thumbnail)} alt={service.name} className="w-full object-cover max-h-64" />
            </div>
          )}

          {/* Description */}
          {service.description && (
            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="text-sm font-semibold text-text-dark mb-4">Mô tả dịch vụ</h2>
              <div className="prose-sm text-text-muted leading-relaxed">
                <SafeHtml html={service.description} />
              </div>
            </div>
          )}

        </div>

        {/* ── Order sidebar ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-white p-6 space-y-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Giá dịch vụ</p>
              {deviceVariants.length > 0 ? (
                <p className="text-2xl font-bold text-teal">
                  Từ {formatVnd(Math.min(...deviceVariants.map(v => v.price)))}
                </p>
              ) : (
                <p className="text-3xl font-bold text-teal">{formatVnd(Number(service.price))}</p>
              )}
            </div>

            <ServiceOrderForm
              serviceId={service.id}
              serviceName={service.name}
              platform={service.platform}
              price={Number(service.price)}
              warrantyOptions={warrantyOptions}
              deviceVariants={deviceVariants}
              isLoggedIn={!!session?.user}
              requiresAccountType={service.requiresAccountType}
              requiresCccd={service.requiresCccd}
            />

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Tỷ lệ thành công</span>
                <span>{service.successRate}%</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Đánh giá</span>
                <span>⭐ {service.rating.toFixed(1)} / 5</span>
              </div>
              {service.totalOrders > 0 && (
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Đã bán</span>
                  <span>{service.totalOrders.toLocaleString("vi-VN")} đơn</span>
                </div>
              )}
              {service.customerCount > 0 && (
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Khách hàng</span>
                  <span>{service.customerCount.toLocaleString("vi-VN")}</span>
                </div>
              )}
            </div>

            {/* Đánh giá — ngay dưới form, luôn hiển thị khi có dữ liệu */}
            {testimonials.length > 0 && (
              <div className="pt-2 border-t border-border">
                <TestimonialsSection items={testimonials} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
