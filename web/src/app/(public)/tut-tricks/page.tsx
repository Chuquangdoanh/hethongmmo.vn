import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import TutTrickBuyButton from "@/components/shared/TutTrickBuyButton";
import ImagePreviewButton from "./_components/ImagePreviewButton";

export const metadata: Metadata = {
  title: "Hệ Thống MMO",
  description: "Bí quyết tăng trưởng, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia.",
};

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


export default async function TutTricksPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; pricing?: string }>;
}) {
  const [{ platform, pricing }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);
  const isLoggedIn = !!session?.user;

  const categoryFilter =
    pricing === "free" ? "Miễn phí" :
    pricing === "paid" ? "Có phí" :
    undefined;

  const [items, distinctPlatforms, paidCount] = await Promise.all([
    prisma.tutTrick.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(platform ? { platform: platform as never } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        platform: true, category: true, price: true,
        successRate: true, rating: true, totalOrders: true,
        isFeatured: true, publishedDate: true, description: true,
        warrantyPolicy: true, processingTime: true,
      },
    }),
    prisma.tutTrick.findMany({
      where: { isActive: true, deletedAt: null },
      select: { platform: true },
      distinct: ["platform"],
      orderBy: { platform: "asc" },
    }),
    prisma.tutTrick.count({
      where: { isActive: true, deletedAt: null, category: "Có phí" },
    }),
  ]);

  const availablePlatforms = distinctPlatforms.map((t) => t.platform);

  function buildUrl(newPlatform?: string, newPricing?: string) {
    const params = new URLSearchParams();
    if (newPlatform) params.set("platform", newPlatform);
    if (newPricing) params.set("pricing", newPricing);
    const qs = params.toString();
    return qs ? `/tut-tricks?${qs}` : "/tut-tricks";
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative bg-[#06060f] py-14 text-center overflow-hidden select-none">
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff1a 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        {/* subtle glow */}
        <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#ef4444]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <span className="inline-flex items-center gap-1.5 mb-5 px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest bg-[#f59e0b] text-black uppercase shadow-lg">
            ⚡ KHO TUT TRICK ĐỘC QUYỀN
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-1 tracking-tight leading-tight">
            TUT / <span className="text-[#ef4444]">TRICK</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 tracking-wide">
            Cộng Đồng MMO Việt Nam
          </h2>
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-10">
            Bí quyết tăng trưởng chiến, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia.
          </p>

          <div className="inline-flex items-center divide-x divide-[#1e293b] rounded-2xl border border-[#1e293b] bg-[#0d1117] px-2 py-1">
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-white">{paidCount}</p>
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mt-0.5 leading-tight max-w-[72px]">TutTrick có phí</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-white">100%</p>
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mt-0.5 leading-tight max-w-[90px]">Tut được cập nhật mới nhất bởi chuyên gia</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-xl font-extrabold text-white">24/7</p>
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mt-0.5 leading-tight">Hỗ trợ trực tuyến</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters + Grid ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">

        {/* Platform filter */}
        {availablePlatforms.length > 0 && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <Link
                href={buildUrl(undefined, pricing)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  !platform
                    ? "bg-[#0066ff] text-white shadow-sm"
                    : "border border-[#e2e8f0] text-[#64748b] hover:border-[#0066ff] hover:text-[#0066ff]"
                }`}
              >
                Tất cả
              </Link>
              {availablePlatforms.map((p) => (
                <Link
                  key={p}
                  href={buildUrl(p, pricing)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    platform === p
                      ? "bg-[#0066ff] text-white shadow-sm"
                      : "border border-[#e2e8f0] text-[#64748b] hover:border-[#0066ff] hover:text-[#0066ff]"
                  }`}
                >
                  {PLATFORM_ICONS[p] && (
                    <span className={`flex items-center justify-center w-4 h-4 rounded p-0.5 shrink-0 ${platform === p ? "bg-white/20" : "bg-white border border-gray-200"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PLATFORM_ICONS[p]} alt={PLATFORM_LABELS[p] ?? p} width={14} height={14} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                    </span>
                  )}
                  {PLATFORM_LABELS[p] ?? p}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pricing filter */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Link
              href={buildUrl(platform, "paid")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                pricing === "paid"
                  ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-sm"
                  : "border-[#e2e8f0] text-[#64748b] hover:border-[#f59e0b] hover:text-[#f59e0b]"
              }`}
            >
              💎 Có phí
            </Link>
            <Link
              href={buildUrl(platform, "free")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                pricing === "free"
                  ? "bg-[#10b981] text-white border-[#10b981] shadow-sm"
                  : "border-[#e2e8f0] text-[#64748b] hover:border-[#10b981] hover:text-[#10b981]"
              }`}
            >
              🆓 Miễn phí
            </Link>
            {pricing && (
              <Link
                href={buildUrl(platform)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#e2e8f0] text-[#94a3b8] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
              >
                ✕ Bỏ lọc
              </Link>
            )}
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#64748b]">
            Trang 1/1 &nbsp;|&nbsp; Hiển thị{" "}
            <span className="font-semibold text-[#0f172a]">{items.length}</span> sản phẩm
            {pricing === "paid" ? " · Có phí" : pricing === "free" ? " · Miễn phí" : ""}
            {platform ? ` · ${PLATFORM_LABELS[platform] ?? platform}` : ""}
          </p>
          <span className="text-[11px] font-semibold text-white bg-[#0f172a] px-3 py-1 rounded-full">
            {items.length} sản phẩm
          </span>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-24 text-[#64748b]">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-semibold text-[#0f172a] text-base">Chưa có tài liệu nào</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc để xem thêm nội dung.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => {
              const isFree = Number(item.price) === 0;
              const price = Number(item.price);
              const publishedDateStr = item.publishedDate
                ? new Date(item.publishedDate).toLocaleDateString("vi-VN")
                : null;

              return (
                <article
                  key={item.id}
                  className="relative flex flex-col rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-[#0066ff]/40 transition-all duration-200 group"
                >
                  {/* HOT — absolute góc trên phải */}
                  {item.isFeatured && (
                    <span className="absolute top-0 right-0 px-3 py-1 text-[10px] font-extrabold bg-[#ef4444] text-white uppercase tracking-wider rounded-bl-xl rounded-tr-2xl z-10">
                      HOT
                    </span>
                  )}

                  {/* ── Body ── */}
                  <div className="flex flex-col flex-1 p-3 gap-5">

                    {/* Row 1: Tên (pr để tránh HOT đè) + ⭐ */}
                    <div className="flex items-start justify-between gap-2 pr-12">
                      <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug flex-1">
                        {item.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#0f172a] text-white shrink-0">
                        ⭐ {item.rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Row 2: Platform + Có phí/Miễn phí + Xem ảnh */}
                    <div className="flex items-center gap-1.5 flex-wrap -mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                        {PLATFORM_ICONS[item.platform] && (
                          <span className="flex items-center justify-center w-3.5 h-3.5 bg-white rounded border border-gray-200 p-0.5 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={PLATFORM_ICONS[item.platform]} alt={PLATFORM_LABELS[item.platform] ?? item.platform} width={12} height={12} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                          </span>
                        )}
                        {PLATFORM_LABELS[item.platform] ?? item.platform}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isFree ? "bg-[#d1fae5] text-[#059669]" : "bg-[#fef3c7] text-[#d97706]"
                      }`}>
                        {isFree ? "🆓 Miễn phí" : "💎 Có phí"}
                      </span>
                      {item.thumbnail && (
                        <ImagePreviewButton src={item.thumbnail} alt={item.name} />
                      )}
                    </div>

                    {/* Row 3: Khách hàng + Ngày */}
                    <div className="flex items-center gap-3 text-[11px] text-[#64748b] flex-wrap -mt-3">
                      <span className="flex items-center gap-1">
                        👥 <span className="font-semibold text-[#0f172a]">{item.totalOrders.toLocaleString("vi-VN")}</span> khách hàng
                      </span>
                      {publishedDateStr && (
                        <span className="flex items-center gap-1">📅 {publishedDateStr}</span>
                      )}
                    </div>

                    {/* Card nhỏ: Xử lý + Bảo hành + Tỉ lệ thành công */}
                    {(item.warrantyPolicy ?? item.processingTime ?? item.successRate) && (
                      <div className="flex flex-col gap-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2 text-[11px] -mt-3">
                        {item.processingTime && (
                          <span className="flex items-center gap-1.5 text-[#475569]">
                            <span className="text-[#7C3AED]">⏱️ Thời gian xử lý</span>
                            <span className="font-medium">{item.processingTime}</span>
                          </span>
                        )}
                        {item.warrantyPolicy && (
                          <span className="flex items-center gap-1.5 text-[#475569]">
                            <span className="text-[#059669]">🛡️ Chế độ bảo hành</span>
                            <span>{item.warrantyPolicy}</span>
                          </span>
                        )}
                        <div className="pt-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#64748b]">Tỉ lệ thành công</span>
                            <span className="font-bold text-[#059669]">{item.successRate}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]"
                              style={{ width: `${item.successRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Giá + Nút mua — tỉ lệ 4:6 */}
                    <div className="flex items-stretch gap-2">
                      {/* Giá: button tĩnh trắng viền đỏ chữ đỏ (40%) */}
                      <div className="flex-[2] flex items-center justify-center rounded-xl border-2 border-[#e11d48] px-2 py-2">
                        <p className={`text-sm font-extrabold text-center leading-tight ${isFree ? "text-[#059669]" : "text-[#e11d48]"}`}>
                          {isFree ? "Miễn phí" : formatVnd(price)}
                        </p>
                      </div>
                      {/* MUA NGAY: button đỏ (60%) */}
                      <div className="flex-[3]">
                        <TutTrickBuyButton
                          item={{
                            id: item.id,
                            name: item.name,
                            thumbnail: item.thumbnail,
                            platform: item.platform,
                            category: item.category,
                            price,
                            description: item.description,
                            successRate: item.successRate,
                            totalOrders: item.totalOrders,
                            publishedDate: publishedDateStr,
                            warrantyPolicy: item.warrantyPolicy,
                            processingTime: item.processingTime,
                          }}
                          isLoggedIn={isLoggedIn}
                          variant="solid-red"
                        />
                      </div>
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
