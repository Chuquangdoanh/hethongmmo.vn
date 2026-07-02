import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import ReviewSection from "@/components/shared/ReviewSection";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import { getFavoriteStatus } from "@/lib/services/favorite.service";
import { getExternalProductSoldCount } from "@/lib/services/external-product-stats.service";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { KfbBuyButton } from "./_components/KfbBuyButton";
import {
  CheckCircle, ShieldCheck, Zap, ArrowLeft,
  ShoppingCart, Headphones, RotateCcw, BadgeCheck, Lock,
  ExternalLink, ChevronLeft, ChevronRight,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.externalProduct.findUnique({
    where: { id, isEnabled: true },
    select: { name: true, description: true, thumbnail: true },
  });
  if (!product) return { title: "Không tìm thấy" };
  const title       = product.name;
  const description = product.description ?? "Sản phẩm số chất lượng cao — mua tự động, giao ngay tại hethongmmo.vn.";
  const thumbnail   = product.thumbnail
    ? (product.thumbnail.startsWith("http") ? product.thumbnail : r2Url(product.thumbnail))
    : "/images/hethongmmo.png";
  return {
    title,
    description,
    openGraph: {
      title, description,
      url: `/kfb/${id}`,
      siteName: "hethongmmo.vn",
      locale: "vi_VN",
      type: "website",
      images: [{ url: thumbnail, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [thumbnail] },
  };
}

const SUPPORT_URL_FALLBACK = "https://m.me/chuquangdoanh";

const PLEDGES = [
  { Icon: RotateCcw,  label: "Hỗ trợ đổi trả"   },
  { Icon: BadgeCheck, label: "Bảo hành 24 giờ"   },
  { Icon: Lock,       label: "Thanh toán an toàn" },
];

const COMMITMENTS = [
  { Icon: BadgeCheck,  color: "#10b981", title: "Hệ Thống MMO kiểm duyệt", desc: "Được hệ thống xác minh trước khi bán" },
  { Icon: ShieldCheck, color: "#0066ff", title: "Bảo hành uy tín",         desc: "Hỗ trợ bảo hành theo chính sách" },
  { Icon: Lock,        color: "#7c3aed", title: "Thanh toán an toàn",      desc: "Bảo mật thông tin tuyệt đối" },
  { Icon: Headphones,  color: "#f59e0b", title: "Hỗ trợ 24/7",            desc: "Đội ngũ hỗ trợ chuyên nghiệp" },
];

const HOW_IT_WORKS = [
  { Icon: ShoppingCart, color: "#0066ff", title: "Đặt hàng",      desc: "Chọn sản phẩm và thanh toán" },
  { Icon: Zap,          color: "#10b981", title: "Nhận thông tin", desc: "Hệ thống gửi thông tin ngay lập tức" },
  { Icon: CheckCircle,  color: "#7c3aed", title: "Sử dụng",        desc: "Đăng nhập và sử dụng hiệu quả" },
];

function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${filled ? "text-warning" : "text-[#d1d5db]"}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default async function KfbProductDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ reviewPage?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const reviewPage = Math.max(1, Number(sp.reviewPage ?? "1"));

  const [product, session] = await Promise.all([
    prisma.externalProduct.findUnique({
      where: { id, isEnabled: true },
      select: {
        id: true, name: true, description: true, thumbnail: true,
        salePrice: true, originalPrice: true, warrantyInfo: true,
        externalCategory: true, displaySection: true, createdAt: true,
        resourceCategory: { select: { name: true } },
        subCategory:      { select: { name: true } },
      },
    }),
    auth(),
  ]);

  if (!product) notFound();

  const me = session?.user as AuthenticatedUser | undefined;

  const [reviewStats, myReview, recentReviews, nextReviewableOrder, starBreakdown, contactCms, favoriteStatus, soldCount] = await Promise.all([
    prisma.review.aggregate({
      where: { productType: "KHUONGFB_PRODUCT", productId: product.id },
      _avg: { rating: true },
      _count: { id: true },
    }),
    me
      ? prisma.review.findFirst({
          where: { userId: me.id, productType: "KHUONGFB_PRODUCT", productId: product.id },
          orderBy: { createdAt: "desc" },
          select: { rating: true, comment: true },
        })
      : Promise.resolve(null),
    prisma.review.findMany({
      where: { productType: "KHUONGFB_PRODUCT", productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      skip: (reviewPage - 1) * 5,
      select: {
        rating: true, comment: true, createdAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    me
      ? prisma.order.findFirst({
          where: { userId: me.id, externalProductId: product.id, status: "DONE", review: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.review.groupBy({
      by: ["rating"],
      where: { productType: "KHUONGFB_PRODUCT", productId: product.id },
      _count: { id: true },
    }),
    getSiteContent<{ quickButtons?: { id: string; label: string; href: string }[] }>(SITE_CONTENT_KEYS.CONTACT_SUPPORT),
    getFavoriteStatus(me?.id, "KHUONGFB_PRODUCT", product.id),
    getExternalProductSoldCount(product.id),
  ]);

  const avgRating   = reviewStats._avg.rating ?? 0;
  const reviewCount = reviewStats._count.id;
  const productBtn  = contactCms.quickButtons?.find((b) => b.id === "product");
  const SUPPORT_URL   = productBtn?.href  ?? SUPPORT_URL_FALLBACK;
  const SUPPORT_LABEL = productBtn?.label ?? "Liên hệ ngay";

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: starBreakdown.find((s) => s.rating === star)?._count.id ?? 0,
  }));

  const totalReviewPages = Math.ceil(reviewCount / 5);
  const hasPrev = reviewPage > 1;
  const hasNext = reviewPage < totalReviewPages;

  const sectionHref  = product.displaySection === "KHO_TAI_NGUYEN" ? "/kho-tai-nguyen" : "/tai-nguyen-mmo";
  const sectionName  = product.displaySection === "KHO_TAI_NGUYEN" ? "Kho Tài Nguyên" : "Tài nguyên MMO";
  const categoryName = product.resourceCategory?.name ?? product.externalCategory;

  const thumbnailSrc = product.thumbnail
    ? (product.thumbnail.startsWith("http") ? product.thumbnail : r2Url(product.thumbnail))
    : null;

  const salePrice     = Number(product.salePrice);
  const originalPrice = Number(product.originalPrice);
  const hasDiscount   = originalPrice > salePrice;

  // ── JSX SECTIONS ─────────────────────────────────────────────────

  const sectionImage = (
    <div className="rounded-2xl bg-[#f1f5f9] overflow-hidden relative" style={{ aspectRatio: "4/3" }}>
      {thumbnailSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailSrc}
          alt={product.name}
          className="w-full h-full object-contain"
          loading="eager"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ShoppingCart size={80} strokeWidth={1} className="text-[#cbd5e1]" />
        </div>
      )}
      {/* Nút yêu thích — cuối DOM + z-index cao nhất, luôn đứng trên mọi ảnh */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 9999 }}>
        <FavoriteButton
          productId={product.id}
          productType="KHUONGFB_PRODUCT"
          initialIsFavorite={favoriteStatus.isFavorite}
          initialCount={favoriteStatus.favoriteCount}
          isLoggedIn={!!me}
          showCount
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-white shadow-md hover:shadow-lg transition-shadow"
          iconSize={18}
        />
      </div>
    </div>
  );

  const sectionDescription = (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-bold text-text-dark mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-primary inline-block shrink-0" />
        Mô tả sản phẩm
      </h2>
      {product.description ? (
        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap mb-4">
          {product.description.replace(/<[^>]*>/g, "")}
        </p>
      ) : (
        <p className="text-sm text-[#94a3b8] italic mb-4">Chưa có mô tả chi tiết.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {["Ổn định", "Chất lượng", "Uy tín", "Bảo mật"].map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0f9ff] text-[#0284c7] border border-[#bae6fd]">
            <CheckCircle size={11} strokeWidth={2.5} />
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  const sectionIntroduction = product.warrantyInfo ? (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-bold text-text-dark mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-primary inline-block shrink-0" />
        Thông tin bảo hành
      </h2>
      <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
        {product.warrantyInfo}
      </p>
    </div>
  ) : null;

  const cardSource = (
    <div className="rounded-2xl border border-border bg-white p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#0052cc] to-[#0066ff] flex items-center justify-center shrink-0 shadow-sm">
        <ShieldCheck size={26} strokeWidth={1.75} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className="text-sm font-extrabold text-text-dark truncate">Hệ Thống MMO</p>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
            Chính thức
          </span>
        </div>
        <p className="text-[11px] text-text-muted">Sản phẩm được kiểm duyệt kỹ lưỡng</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-bold text-[#10b981]">100%</span>
          <span className="text-[10px] text-[#94a3b8]">Đánh giá tích cực</span>
        </div>
      </div>
      <div className="shrink-0">
        <Link
          href={sectionHref}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-[#0052cc] transition-colors whitespace-nowrap"
        >
          <ExternalLink size={12} strokeWidth={2} />
          Xem sản phẩm
        </Link>
      </div>
    </div>
  );

  const cardProductInfo = (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
          {categoryName}
        </span>
        {product.subCategory && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ede9fe] text-[#6d28d9]">
            {product.subCategory.name}
          </span>
        )}
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
          Hệ Thống MMO
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-text-dark leading-snug mb-1">{product.name}</h1>
        <p className="text-xs text-text-muted">Hỗ trợ nhanh 24/7</p>
      </div>

      {/* Stars */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => <StarSvg key={s} filled={s <= Math.round(avgRating)} />)}
          </div>
          <span className="text-sm font-bold text-text-dark">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-text-muted">({reviewCount} đánh giá)</span>
          {soldCount > 0 && (
            <>
              <span className="text-xs text-text-muted">|</span>
              <span className="text-xs text-text-muted">Đã bán: {soldCount.toLocaleString("vi-VN")}</span>
            </>
          )}
        </div>
      )}

      {/* Đã bán — hiển thị cả khi chưa có đánh giá */}
      {reviewCount === 0 && soldCount > 0 && (
        <p className="text-xs text-text-muted">Đã bán {soldCount.toLocaleString("vi-VN")}</p>
      )}

      {/* Price */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-black text-[#e11d48]">{formatVnd(salePrice)}</p>
          {hasDiscount && (
            <p className="text-sm text-[#94a3b8] line-through">{formatVnd(originalPrice)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#10b981]">
          <CheckCircle size={16} strokeWidth={2} />
          Còn hàng
        </div>
      </div>

      {/* Buy button */}
      <KfbBuyButton
        productId={product.id}
        productName={product.name}
        price={salePrice}
        isLoggedIn={!!me}
      />

      {/* Pledges */}
      <div className="grid grid-cols-3 gap-2">
        {PLEDGES.map(({ Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <Icon size={15} strokeWidth={1.75} className="text-text-muted" />
            <p className="text-[10px] text-text-muted leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const cardCommitments = (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-bold text-text-dark mb-3">Cam kết từ chúng tôi</p>
      <div className="space-y-3">
        {COMMITMENTS.map(({ Icon, color, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
              <Icon size={15} strokeWidth={2} style={{ color }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text-dark">{title}</p>
              <p className="text-[11px] text-text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const sectionHowItWorks = (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-bold text-text-dark mb-5 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-[#10b981] inline-block shrink-0" />
        Cách hoạt động
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {HOW_IT_WORKS.map(({ Icon, color, title, desc }) => (
          <div key={title} className="text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: `${color}14` }}
            >
              <Icon size={22} strokeWidth={1.75} style={{ color }} />
            </div>
            <p className="text-xs font-bold text-text-dark mb-1">{title}</p>
            <p className="text-[11px] text-text-muted leading-snug">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const sectionReviews = (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-bold text-text-dark mb-5 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-warning inline-block shrink-0" />
        Đánh giá sản phẩm
      </h2>

      {reviewCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
          <div className="flex flex-col items-center justify-center gap-1">
            <p className="text-5xl font-black text-text-dark">{avgRating.toFixed(1)}</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => <StarSvg key={s} filled={s <= Math.round(avgRating)} />)}
            </div>
            <p className="text-xs text-text-muted">({reviewCount} đánh giá)</p>
          </div>
          <div className="space-y-1.5">
            {starCounts.map(({ star, count }) => {
              const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted w-3 text-right">{star}</span>
                  <StarSvg filled />
                  <div className="flex-1 h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-[#94a3b8] w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentReviews.length > 0 && (
        <div className="mb-4 space-y-3">
          {recentReviews.map((review, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-[#fafafa] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => <StarSvg key={s} filled={s <= review.rating} />)}
                </div>
                <span className="text-[10px] text-[#94a3b8]">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && (
                <p className="text-sm text-[#374151] leading-relaxed mb-2">{review.comment}</p>
              )}
              <p className="text-[11px] text-text-muted font-medium">
                {review.user.fullName ?? review.user.email}
              </p>
            </div>
          ))}

          {totalReviewPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              {hasPrev ? (
                <Link
                  href={`/kfb/${product.id}?reviewPage=${reviewPage - 1}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-[#374151] hover:border-primary hover:text-primary transition-colors"
                >
                  <ChevronLeft size={13} strokeWidth={2} /> Trước
                </Link>
              ) : <div />}
              <span className="text-xs text-text-muted">Trang {reviewPage} / {totalReviewPages}</span>
              {hasNext ? (
                <Link
                  href={`/kfb/${product.id}?reviewPage=${reviewPage + 1}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-[#374151] hover:border-primary hover:text-primary transition-colors"
                >
                  Sau <ChevronRight size={13} strokeWidth={2} />
                </Link>
              ) : <div />}
            </div>
          )}
        </div>
      )}

      <ReviewSection
        productType="KHUONGFB_PRODUCT"
        productId={product.id}
        avgRating={avgRating}
        reviewCount={reviewCount}
        recentReviews={[]}
        myReview={myReview}
        orderId={nextReviewableOrder?.id ?? null}
      />
    </div>
  );

  const cardSupport = (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Headphones size={18} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-dark">Bạn cần hỗ trợ?</p>
          <p className="text-xs text-text-muted">Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
        </div>
      </div>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#0052cc] transition-colors"
      >
        {SUPPORT_LABEL}
      </a>
    </div>
  );

  const linkBack = (
    <Link
      href={sectionHref}
      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-border text-xs font-semibold text-text-muted hover:border-[#e11d48] hover:text-[#e11d48] transition-all"
    >
      <ArrowLeft size={13} strokeWidth={2} />
      Xem thêm sản phẩm
    </Link>
  );

  // ── RENDER ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-370 px-4 md:px-5 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-6 flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href={sectionHref} className="hover:text-primary transition-colors">{sectionName}</Link>
        <span>/</span>
        <Link
          href={`${sectionHref}?category=${encodeURIComponent(categoryName)}`}
          className="hover:text-primary transition-colors"
        >
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-text-muted truncate max-w-48">{product.name}</span>
      </nav>

      {/* ── MOBILE LAYOUT ── */}
      <div className="space-y-4 lg:hidden">
        {sectionImage}
        {sectionDescription}
        {sectionIntroduction}
        {cardSource}
        {cardProductInfo}
        {cardCommitments}
        {sectionHowItWorks}
        {sectionReviews}
        {cardSupport}
        {linkBack}
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8">
        <div className="col-span-7 space-y-5">
          {sectionImage}
          {sectionDescription}
          {sectionIntroduction}
          {sectionHowItWorks}
          {sectionReviews}
        </div>
        <div className="col-span-5">
          <div className="sticky top-24 space-y-4">
            {cardProductInfo}
            {cardSource}
            {cardSupport}
            {cardCommitments}
            {linkBack}
          </div>
        </div>
      </div>
    </div>
  );
}
