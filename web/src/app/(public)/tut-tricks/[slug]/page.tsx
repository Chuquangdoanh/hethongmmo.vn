import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { auth } from "@/auth";
import SimpleOrderButton from "@/components/shared/SimpleOrderButton";
import SafeHtml from "@/components/shared/SafeHtml";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "X (Twitter)", ICLOUD: "iCloud", OTHER: "Khác",
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await prisma.tutTrick.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { name: true, seoTitle: true, seoDescription: true },
  });
  if (!item) return { title: "Không tìm thấy" };
  return {
    title: item.seoTitle ?? item.name,
    description: item.seoDescription ?? undefined,
  };
}

export default async function TutTrickDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [item, session] = await Promise.all([
    prisma.tutTrick.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true, name: true, slug: true, thumbnail: true,
        platform: true, category: true, price: true,
        description: true, docs: true,
        successRate: true, rating: true, totalOrders: true, totalViews: true,
        publishedDate: true,
      },
    }),
    auth(),
  ]);

  if (!item) notFound();

  const isFree = Number(item.price) === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#64748b]">Trang chủ</Link>
        <span>/</span>
        <Link href="/tut-tricks" className="hover:text-[#64748b]">Tut & Tricks</Link>
        <span>/</span>
        <span className="text-[#64748b] truncate max-w-[180px]">{item.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex gap-5">
            <div className="w-24 h-24 rounded-xl bg-[#f1f5f9] flex-shrink-0 overflow-hidden">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r2Url(item.thumbnail)} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {PLATFORM_ICONS[item.platform] ? (
                    <span className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-gray-100 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PLATFORM_ICONS[item.platform]} alt={PLATFORM_LABELS[item.platform] ?? item.platform} className="w-full h-full object-contain" />
                    </span>
                  ) : (
                    <span className="text-4xl">📋</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#64748b]">
                  {PLATFORM_ICONS[item.platform] && (
                    <span className="flex items-center justify-center w-4 h-4 bg-[#f1f5f9] rounded-md p-0.5 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PLATFORM_ICONS[item.platform]} alt={PLATFORM_LABELS[item.platform] ?? item.platform} className="w-full h-full object-contain" />
                    </span>
                  )}
                  {PLATFORM_LABELS[item.platform] ?? item.platform}
                </span>
                <span className="text-[#64748b]">·</span>
                <span className="text-xs text-[#64748b]">{item.category}</span>
              </div>
              <h1 className="text-xl font-bold text-[#0f172a] mb-2">{item.name}</h1>
              <div className="flex items-center gap-4 text-xs text-[#64748b]">
                <span>⭐ {item.rating.toFixed(1)}</span>
                <span>📦 {item.totalOrders.toLocaleString("vi-VN")} đã mua</span>
                <span>✅ {item.successRate}% thành công</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
              <h2 className="text-sm font-semibold text-[#0f172a] mb-3">Mô tả</h2>
              <div className="text-sm text-[#64748b] leading-relaxed">
                <SafeHtml html={item.description} />
              </div>
            </div>
          )}

          {/* Nội dung được giao sau khi mua — không preview trước */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
            <span className="text-amber-500 shrink-0 text-lg">🔒</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Nội dung được bảo mật</p>
              <p className="text-xs text-amber-700 mt-1">Toàn bộ hướng dẫn chi tiết sẽ được giao ngay sau khi bạn hoàn tất thanh toán.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-xl border border-[#e2e8f0] bg-white p-5 space-y-4">
            <div>
              <p className="text-2xl font-bold text-[#E53E3E]">
                {isFree ? "Miễn phí" : formatVnd(Number(item.price))}
              </p>
              {!isFree && (
                <p className="text-xs text-[#64748b] mt-1">Trừ trực tiếp từ số dư tài khoản</p>
              )}
            </div>

            {isFree ? (
              <button className="w-full py-3 rounded-xl bg-[#10B981] text-white text-sm font-semibold hover:bg-green-500 transition-colors">
                Tải miễn phí
              </button>
            ) : (
              <SimpleOrderButton
                itemId={item.id}
                orderType="TUTTRICK"
                itemName={item.name}
                price={Number(item.price)}
                isLoggedIn={!!session?.user}
              />
            )}

            {/* Stats */}
            <div className="pt-3 border-t border-[#e2e8f0] space-y-2">
              {[
                { label: "Đã bán", value: `${item.totalOrders.toLocaleString("vi-VN")} lần` },
                { label: "Tỷ lệ thành công", value: `${item.successRate}%` },
                { label: "Đánh giá", value: `⭐ ${item.rating.toFixed(1)}/5` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-[#64748b]">{label}</span>
                  <span className="text-[#64748b]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
