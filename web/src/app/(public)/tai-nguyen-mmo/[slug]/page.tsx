import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import ReviewSection from "@/components/shared/ReviewSection";
import ProductBuyButton from "../_components/ProductBuyButton";
import type { ProductVariant } from "../_components/ProductBuyButton";
import {
  CheckCircle, XCircle, ShieldCheck, Zap, ArrowLeft,
  ShoppingCart, Headphones, RotateCcw, BadgeCheck, Lock,
  ExternalLink, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getFavoriteStatus } from "@/lib/services/favorite.service";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.mmoProduct.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { name: true, thumbnail: true, description: true },
  });
  if (!product) return { title: "Không tìm thấy" };
  const title = product.name;
  const description = product.description ?? "Tài nguyên MMO chất lượng cao — giao hàng tự động ngay sau thanh toán tại hethongmmo.vn.";
  const image = product.thumbnail ? r2Url(product.thumbnail) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/tai-nguyen-mmo/${slug}`,
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

const TRUST_ICONS = [
  { Icon: Zap,         color: "#f59e0b", label: "Giao tự động",  sub: "Nhận ngay sau khi thanh toán" },
  { Icon: ShieldCheck, color: "#10b981", label: "Bảo mật",        sub: "Thông tin 100% an toàn" },
  { Icon: Headphones,  color: "#0066ff", label: "Hỗ trợ 24/7",   sub: "Kỹ thuật hỗ trợ liên tục" },
];

const PLEDGES = [
  { Icon: RotateCcw,  label: "Hỗ trợ đổi trả"   },
  { Icon: BadgeCheck, label: "Hỗ trợ 24 giờ"   },
  { Icon: Lock,       label: "Thanh toán an toàn" },
];

const COMMITMENTS = [
  { Icon: BadgeCheck,  color: "#10b981", title: "Sản phẩm chính thức",  desc: "Được hệ thống kiểm duyệt và cung cấp" },
  { Icon: ShieldCheck, color: "#0066ff", title: "Bảo hành uy tín",      desc: "Hỗ trợ bảo hành theo chính sách" },
  { Icon: Lock,        color: "#7c3aed", title: "Thanh toán an toàn",   desc: "Bảo mật thông tin tuyệt đối" },
  { Icon: Headphones,  color: "#f59e0b", title: "Hỗ trợ 24/7",         desc: "Đội ngũ hỗ trợ chuyên nghiệp" },
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

export default async function MmoProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewPage?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const reviewPage = Math.max(1, Number(sp.reviewPage ?? "1"));

  const [product, session] = await Promise.all([
    prisma.mmoProduct.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true, name: true, slug: true, thumbnail: true,
        category: true, categoryGroup: true, price: true,
        description: true, warrantyInfo: true, totalOrders: true, createdAt: true,
        _count: { select: { items: { where: { status: "AVAILABLE" } } } },
        variants: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true },
          orderBy: { variantPrice: "asc" },
        },
      },
    }),
    auth(),
  ]);

  if (!product) notFound();

  const me = session?.user as AuthenticatedUser | undefined;
  const available = product._count.items;
  const isOutOfStock = available === 0;
  const variants: ProductVariant[] = product.variants.map((v) => ({
    id: v.id,
    variantName: v.variantName ?? undefined,
    variantPrice: Number(v.variantPrice),
    warranty: v.warranty,
    isActive: v.isActive,
  }));

  const [reviewStats, myReview, recentReviews, nextReviewableOrder, starBreakdown, favoriteStatus, contactCms] = await Promise.all([
    prisma.review.aggregate({
      where: { productType: "MMO_PRODUCT", productId: product.id },
      _avg: { rating: true },
      _count: { id: true },
    }),
    me
      ? prisma.review.findFirst({
          where: { userId: me.id, productType: "MMO_PRODUCT", productId: product.id },
          orderBy: { createdAt: "desc" },
          select: { rating: true, comment: true },
        })
      : Promise.resolve(null),
    // Paginated: 1 review per page
    prisma.review.findMany({
      where: { productType: "MMO_PRODUCT", productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 1,
      skip: reviewPage - 1,
      select: {
        rating: true, comment: true, createdAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    me
      ? prisma.order.findFirst({
          where: { userId: me.id, mmoProductId: product.id, status: "DONE", review: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.review.groupBy({
      by: ["rating"],
      where: { productType: "MMO_PRODUCT", productId: product.id },
      _count: { id: true },
    }),
    getFavoriteStatus(me?.id, "MMO_PRODUCT", product.id),
    getSiteContent<{ quickButtons?: { id: string; label: string; href: string }[] }>(SITE_CONTENT_KEYS.CONTACT_SUPPORT),
  ]);

  const avgRating   = reviewStats._avg.rating ?? 0;
  const reviewCount = reviewStats._count.id;
  const productBtn  = contactCms.quickButtons?.find((b) => b.id === "product");
  const productContactUrl   = productBtn?.href  ?? "https://m.me/chuquangdoanh";
  const productContactLabel = productBtn?.label ?? "Liên hệ ngay";

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: starBreakdown.find((s) => s.rating === star)?._count.id ?? 0,
  }));
  const positiveCount = starBreakdown
    .filter((s) => s.rating >= 4)
    .reduce((acc, s) => acc + s._count.id, 0);
  const positiveRate = reviewCount > 0 ? Math.round((positiveCount / reviewCount) * 100) : 99;

  const hasPrev = reviewPage > 1;
  const hasNext = reviewPage < reviewCount;

  // ── JSX SECTIONS ──────────────────────────────────────────────

  const sectionImage = (
    <div
      className="rounded-2xl bg-[#f1f5f9] overflow-hidden"
      style={{ aspectRatio: "16/9", position: "relative" }}
    >
      {product.thumbnail ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r2Url(product.thumbnail)} alt="" aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-55 pointer-events-none"
            loading="lazy" decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r2Url(product.thumbnail)} alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager" decoding="async"
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ShoppingCart size={80} strokeWidth={1} className="text-[#cbd5e1]" />
        </div>
      )}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center" style={{ zIndex: 10 }}>
          <span className="px-5 py-2.5 rounded-xl bg-black/80 text-danger font-extrabold text-lg tracking-widest">
            HẾT HÀNG
          </span>
        </div>
      )}
      {/* Nút yêu thích — cuối DOM + z-index cao nhất, luôn đứng trên mọi ảnh */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 9999 }}>
        <FavoriteButton
          productId={product.id}
          productType="MMO_PRODUCT"
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

  const sectionWarranty = product.warrantyInfo ? (
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

  const cardSystem = (
    <Link
      href="/tai-nguyen-mmo/he-thong"
      className="rounded-2xl border border-border bg-white p-4 flex items-center gap-4 hover:border-primary hover:shadow-sm transition-all group"
    >
      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#6d28d9] to-primary flex items-center justify-center shrink-0 shadow-sm">
        <Building2 size={26} strokeWidth={1.75} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-extrabold text-text-dark group-hover:text-primary transition-colors truncate">
            Hệ Thống MMO
          </p>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
            Chính thức
          </span>
        </div>
        <p className="text-[11px] text-text-muted">Sản phẩm được kiểm duyệt kỹ lưỡng</p>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-sm font-bold text-text-dark">{product.totalOrders.toLocaleString("vi-VN")}</p>
            <p className="text-[10px] text-[#94a3b8]">Đơn hàng</p>
          </div>
          <div>
            <p className="text-sm font-bold text-text-dark">{positiveRate}%</p>
            <p className="text-[10px] text-[#94a3b8]">Đánh giá tích cực</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={14} strokeWidth={2} className="text-primary" />
        <span className="text-[10px] font-semibold text-primary">Xem shop</span>
      </div>
    </Link>
  );

  const cardProductInfo = (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
          {product.categoryGroup}
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ede9fe] text-[#6d28d9]">
          {product.category}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f0fdf4] text-success border border-[#bbf7d0]">
          <BadgeCheck size={10} strokeWidth={2.5} /> Hệ Thống MMO
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-text-dark leading-snug mb-1">{product.name}</h1>
        <p className="text-xs text-text-muted">Hỗ trợ nhanh 24/7</p>
      </div>

      {/* Stars + sold */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => <StarSvg key={s} filled={s <= Math.round(avgRating)} />)}
          </div>
          <span className="text-sm font-bold text-text-dark">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-text-muted">({reviewCount} đánh giá)</span>
          <span className="text-xs text-text-muted">|</span>
          <span className="text-xs text-text-muted">Đã bán: {product.totalOrders.toLocaleString("vi-VN")}</span>
        </div>
      )}

      {/* Price + stock */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-black text-[#e11d48]">{formatVnd(Number(product.price))}</p>
          
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${isOutOfStock ? "text-danger" : "text-[#10b981]"}`}>
          {isOutOfStock ? <XCircle size={16} strokeWidth={2} /> : <CheckCircle size={16} strokeWidth={2} />}
          {isOutOfStock ? "Hết hàng" : "Còn hàng"}
        </div>
      </div>

      {/* Buy button */}
      {isOutOfStock ? (
        <div className="w-full py-3.5 rounded-xl bg-[#f1f5f9] text-[#94a3b8] text-sm font-bold text-center cursor-not-allowed">
          Hết hàng
        </div>
      ) : (
        <ProductBuyButton
          itemId={product.id}
          orderType="MMO_PRODUCT"
          itemName={product.name}
          price={Number(product.price)}
          isLoggedIn={!!me}
          avgRating={avgRating}
          reviewCount={reviewCount}
          available={available}
          totalSold={product.totalOrders}
          variants={variants.length > 0 ? variants : undefined}
        />
      )}

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

      {/* Aggregate stats */}
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

      {/* Paginated single review */}
      {recentReviews.length > 0 && (() => {
        const review = recentReviews[0]!;
        return (
          <div className="mb-4">
            <div className="rounded-xl border border-border bg-[#fafafa] p-4">
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

            {/* Pagination controls */}
            {reviewCount > 1 && (
              <div className="flex items-center justify-between mt-3 px-1">
                {hasPrev ? (
                  <Link
                    href={`/tai-nguyen-mmo/${product.slug}?reviewPage=${reviewPage - 1}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-[#374151] hover:border-primary hover:text-primary transition-colors"
                  >
                    <ChevronLeft size={13} strokeWidth={2} /> Trước
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-xs text-text-muted">
                  {reviewPage} / {reviewCount}
                </span>
                {hasNext ? (
                  <Link
                    href={`/tai-nguyen-mmo/${product.slug}?reviewPage=${reviewPage + 1}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-[#374151] hover:border-primary hover:text-primary transition-colors"
                  >
                    Sau <ChevronRight size={13} strokeWidth={2} />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Write review form */}
      <ReviewSection
        productType="MMO_PRODUCT"
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
        href={productContactUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#0052cc] transition-colors"
      >
        {productContactLabel}
      </a>
    </div>
  );

  const linkBack = (
    <Link
      href="/tai-nguyen-mmo"
      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-border text-xs font-semibold text-text-muted hover:border-[#e11d48] hover:text-[#e11d48] transition-all"
    >
      <ArrowLeft size={13} strokeWidth={2} />
      Xem thêm sản phẩm
    </Link>
  );

  // ── RENDER ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-370 px-4 md:px-5 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-6 flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href="/tai-nguyen-mmo" className="hover:text-primary transition-colors">Tài nguyên MMO</Link>
        <span>/</span>
        <Link href={`/tai-nguyen-mmo?category=${encodeURIComponent(product.categoryGroup)}`} className="hover:text-primary transition-colors">
          {product.categoryGroup}
        </Link>
        <span>/</span>
        <span className="text-text-muted truncate max-w-48">{product.name}</span>
      </nav>

      {/* ── MOBILE LAYOUT (< lg): single column in user-specified order ── */}
      <div className="space-y-4 lg:hidden">
        {sectionImage}
        {sectionDescription}
        {sectionWarranty}
        {cardSystem}
        {cardProductInfo}
        {cardCommitments}
        {sectionHowItWorks}
        {sectionReviews}
        {cardSupport}
        {linkBack}
      </div>

      {/* ── DESKTOP LAYOUT (lg+): 2-column grid ── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8">
        {/* Left column */}
        <div className="col-span-7 space-y-5">
          {sectionImage}
          {sectionDescription}
          {sectionWarranty}
          {sectionHowItWorks}
          {sectionReviews}
        </div>
        {/* Right column — sticky */}
        <div className="col-span-5">
          <div className="sticky top-24 space-y-4">
            {cardProductInfo}
            {cardSystem}
            {cardSupport}
            {cardCommitments}
            {linkBack}
          </div>
        </div>
      </div>
    </div>
  );
}
