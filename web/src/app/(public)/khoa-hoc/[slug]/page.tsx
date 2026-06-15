import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { getDiscountInfo } from "@/lib/utils/discount";
import {
  Clock, BookOpen, Users, Eye,
  ShoppingCart, Shield, Headphones, CheckCircle, RefreshCw, Monitor,
  Flame,
} from "lucide-react";
import CourseDetailTabs from "./_components/CourseDetailTabs";
import SidebarRegisterButton from "./_components/SidebarRegisterButton";
import YoutubeEmbed from "./_components/YoutubeEmbed";
import { CourseIcon } from "@/lib/utils/course-icons";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { seoTitle: true, seoDescription: true, name: true, thumbnail: true, description: true },
  });
  if (!course) return { title: "Không tìm thấy" };
  const title = course.seoTitle ?? course.name;
  const description = course.seoDescription ?? course.description ?? "Khóa học thực chiến MMO tại hethongmmo.vn — Digital Marketing, Facebook Ads, TikTok Ads.";
  const image = course.thumbnail ? r2Url(course.thumbnail) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/khoa-hoc/${slug}`,
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

const FORMAT_LABELS: Record<string, string> = {
  ONLINE:  "Khóa học online thực chiến",
  OFFLINE: "Khóa học thực chiến trực tiếp chuyên sâu",
  HYBRID:  "Khóa Học Siêu VIP",
};


function getYoutubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("youtube") && !u.hostname.includes("youtu.be")) return null;
    // youtu.be/ID
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0] ?? null;
    // /embed/ID, /shorts/ID, /live/ID
    const pathMatch = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
    if (pathMatch) return pathMatch[1] ?? null;
    // /watch?v=ID
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

const SIDEBAR_SUPPORT = [
  "Tài liệu học tập độc quyền",
  "Hỗ trợ 1:1 từ giảng viên",
  "Chứng chỉ hoàn thành",
  "Cập nhật nội dung miễn phí",
  "Cộng đồng học viên năng động",
];

export default async function KhoaHocDetailPage({ params }: Props) {
  const { slug } = await params;

  const [course, session, testimonials] = await Promise.all([
    prisma.course.findFirst({ where: { slug, isActive: true, deletedAt: null } }),
    auth(),
    prisma.testimonial.findMany({
      where: { type: "COURSE", isActive: true, course: { slug } },
      select: {
        id: true, category: true,
        reviewerName: true, reviewerRole: true,
        reviewerAvatar: true, reviewerInitials: true, reviewerColor: true,
        content: true, rating: true, createdAt: true,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!course) notFound();

  const userId = (session?.user as { id: string } | null | undefined)?.id;
  const [userRow, categoryRow] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { discountPercent: true, totalDeposited: true } })
      : Promise.resolve(null),
    prisma.courseCategory.findUnique({
      where: { name: course.category },
      select: { icon: true },
    }),
  ]);
  const discountPct = userRow
    ? getDiscountInfo(Number(userRow.totalDeposited), userRow.discountPercent).pct
    : 0;

  // Bọc trong try/catch — bảng chưa tồn tại nếu migration chưa chạy trên server
  const [faqCategories, supportItems, uncategorizedFaqs] = await Promise.all([
    prisma.courseFaqCategory.findMany({
      where: { courseId: course.id },
      include: {
        faqs: {
          where: { isActive: true },
          select: { id: true, question: true, answer: true, categoryId: true },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    }).catch(() => []),
    prisma.courseSupportItem.findMany({
      where: { courseId: course.id, isActive: true },
      select: { id: true, icon: true, title: true, description: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }).catch(() => []),
    prisma.courseFaq.findMany({
      where: { courseId: course.id, isActive: true, categoryId: null },
      select: { id: true, question: true, answer: true, categoryId: true },
      orderBy: { displayOrder: "asc" },
    }).catch(() => []),
  ]);

  const isOnSale  = Number(course.salePrice) < Number(course.originalPrice);
  const isExpired = course.saleDeadline ? new Date(course.saleDeadline) < new Date() : false;
  const finalPrice    = !isExpired && isOnSale ? Number(course.salePrice) : Number(course.originalPrice);
  const savedAmount   = isOnSale && !isExpired ? Number(course.originalPrice) - finalPrice : 0;
  const discountedFinalPrice = discountPct > 0 ? Math.round(finalPrice * (1 - discountPct / 100)) : finalPrice;

  const contentList = Array.isArray(course.contentList)  ? (course.contentList  as string[]) : [];
  const commitments = Array.isArray(course.commitments)   ? (course.commitments  as string[]) : [];
  const embedId     = course.youtubeUrl ? getYoutubeEmbedId(course.youtubeUrl) : null;
  const catIcon     = categoryRow?.icon || null;

  const upd = new Date(course.updatedAt);
  const updatedLabel = `${String(upd.getMonth() + 1).padStart(2, "0")}/${upd.getFullYear()}`;

  const INFO_ROWS = [
    { label: "Thời lượng", value: course.duration ?? "—",                                        Icon: Clock },
    { label: "Hình thức",  value: FORMAT_LABELS[course.learningFormat] ?? course.learningFormat,  Icon: Monitor },
    { label: "Học viên",   value: `${course.studentCount.toLocaleString("vi-VN")}+`,              Icon: Users },
    { label: "Nội dung",   value: `${contentList.length} bài học`,                                Icon: BookOpen },
    { label: "Cập nhật",   value: updatedLabel,                                                    Icon: RefreshCw },
  ] as const;

  // Tính sao trung bình từ testimonials CMS (ưu tiên hơn rating tĩnh trong DB)
  const cmsAvgRating = testimonials.length > 0
    ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
    : null;
  const displayRating = cmsAvgRating ?? course.rating;
  const fullStars = Math.floor(displayRating);

  return (
    <div className="bg-[#f4f6f9] min-h-screen">

      {/* ── Breadcrumb ── */}
      <div className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-[#64748b] flex-wrap">
            <Link href="/"         className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/khoa-hoc" className="hover:text-[#0066ff] transition-colors">Khóa học</Link>
            <span>/</span>
            <Link
              href={`/khoa-hoc?category=${encodeURIComponent(course.category)}`}
              className="hover:text-[#0066ff] transition-colors"
            >
              {course.category}
            </Link>
            <span>/</span>
            <span className="text-[#0f172a] font-medium truncate max-w-[200px]">{course.name}</span>
          </nav>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ══ LEFT column ══ */}
          <div className="lg:col-span-7 space-y-5">

            {/* Header: tag + title + desc + badges */}
            <div>
              <span className="inline-block text-[11px] font-bold text-[#0066ff] bg-[#dbeafe] px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
                Khóa học
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-3 leading-tight">
                {course.name}
              </h1>
              {course.description && (
                <p className="text-sm text-[#64748b] mb-4 leading-relaxed">
                  {course.description.replace(/<[^>]+>/g, "")}
                </p>
              )}

              {/* Badges + rating */}
              <div className="flex flex-wrap items-center gap-2">
                {catIcon && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-xs font-semibold text-[#374151]">
                    <span className="flex items-center justify-center w-4 h-4 bg-white rounded-sm shrink-0 p-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r2Url(catIcon)} alt={course.category} className="w-full h-full object-contain" />
                    </span>
                    {course.category}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-xs font-semibold text-[#16a34a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse inline-block" />
                  {FORMAT_LABELS[course.learningFormat] ?? course.learningFormat}
                </span>
                {contentList.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fef3c7] border border-[#fde68a] text-xs font-semibold text-[#92400e]">
                    <BookOpen size={12} strokeWidth={2} />
                    {contentList.length} bài học
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#f59e0b]">
                  ★ {displayRating.toFixed(1)}
                </span>
                {testimonials.length > 0 ? (
                  <span className="text-xs text-[#64748b]">
                    ({testimonials.length} đánh giá)
                  </span>
                ) : course.studentCount > 0 ? (
                  <span className="text-xs text-[#64748b]">
                    ({course.studentCount.toLocaleString("vi-VN")} học viên)
                  </span>
                ) : null}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-5 text-xs text-[#64748b] border-b border-[#e2e8f0] pb-5">
              {course.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} strokeWidth={1.75} className="text-[#718096]" />
                  {course.duration}
                </span>
              )}
              {contentList.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <BookOpen size={13} strokeWidth={1.75} className="text-[#718096]" />
                  {contentList.length} bài học
                </span>
              )}
              {course.studentCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users size={13} strokeWidth={1.75} className="text-[#718096]" />
                  {course.studentCount.toLocaleString("vi-VN")}+ học viên
                </span>
              )}
              {course.totalViews > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye size={13} strokeWidth={1.75} className="text-[#718096]" />
                  {course.totalViews.toLocaleString("vi-VN")} lượt xem
                </span>
              )}
            </div>

            {/* MOBILE ONLY: Thumbnail — hiển thị trước tabs trên mobile */}
            {course.thumbnail && (
              <div
                className="lg:hidden rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-md"
                style={{ aspectRatio: "16/9" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r2Url(course.thumbnail)} alt={course.name} className="w-full h-full object-cover" />
              </div>
            )}

            {/* MOBILE ONLY: YouTube — hiển thị trước tabs trên mobile */}
            {embedId && (
              <div className="lg:hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#f59e0b" }} />
                  <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">Lộ trình chi tiết</p>
                </div>
                <div
                  className="rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-md relative"
                  style={{ aspectRatio: "16/9" }}
                >
                  <YoutubeEmbed videoId={embedId} title={course.name} />
                </div>
              </div>
            )}

            {/* MOBILE ONLY: Price card — hiển thị trước tabs trên mobile */}
            <div className="lg:hidden bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                {isOnSale && !isExpired && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#e11d48] px-2 py-0.5 rounded-full">
                    <Flame size={10} strokeWidth={2} /> LIVE
                  </span>
                )}
                {(isOnSale && !isExpired) || discountPct > 0 ? (
                  <span className="inline-flex text-[10px] font-semibold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-full">
                    TIẾT KIỆM
                  </span>
                ) : null}
                {discountPct > 0 && (
                  <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Giảm {discountPct}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-3xl font-extrabold" style={{ color: "#E53E3E" }}>
                  {formatVnd(discountedFinalPrice)}
                </span>
                {discountPct > 0 ? (
                  <span className="text-sm text-[#94a3b8] line-through">{formatVnd(finalPrice)}</span>
                ) : isOnSale && !isExpired ? (
                  <span className="text-sm text-[#94a3b8] line-through">{formatVnd(Number(course.originalPrice))}</span>
                ) : null}
              </div>
              {discountPct > 0 ? (
                <p className="text-xs text-[#e11d48] font-semibold mb-4">
                  Tiết kiệm {formatVnd(finalPrice - discountedFinalPrice)} (-{discountPct}%)
                </p>
              ) : savedAmount > 0 ? (
                <p className="text-xs text-[#e11d48] font-semibold mb-4">
                  Tiết kiệm {formatVnd(savedAmount)}
                </p>
              ) : null}
              <div className="flex items-center gap-1.5 mb-5">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className={`text-sm ${s <= fullStars ? "text-[#f59e0b]" : "text-[#d1d5db]"}`}>★</span>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#f59e0b]">{displayRating.toFixed(1)}</span>
                {testimonials.length > 0 ? (
                  <span className="text-xs text-[#94a3b8]">
                    ({testimonials.length} đánh giá)
                  </span>
                ) : course.studentCount > 0 ? (
                  <span className="text-xs text-[#94a3b8]">
                    ({course.studentCount.toLocaleString("vi-VN")} học viên)
                  </span>
                ) : null}
              </div>

              <div className="mb-5">
                <SidebarRegisterButton />
              </div>

              <div className="border-t border-[#f1f5f9] pt-4 space-y-3">
                {INFO_ROWS.map(({ label, value, Icon }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#64748b]">
                      <Icon size={13} strokeWidth={1.75} />
                      {label}
                    </span>
                    <span className="font-semibold text-[#0f172a]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs: Giới thiệu / Nội dung / Đánh giá / Hỏi đáp */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
              <CourseDetailTabs
                description={course.description ?? null}
                contentList={contentList}
                studentCount={course.studentCount}
                courseId={course.id}
                price={finalPrice}
                originalPrice={Number(course.originalPrice)}
                isOnSale={!!(isOnSale && !isExpired)}
                isLoggedIn={!!session?.user}
                userName={session?.user?.name ?? ""}
                commitments={commitments}
                registrationProcedure={course.registrationProcedure ?? null}
                testimonials={testimonials}
                discountPct={discountPct}
                faqCategories={faqCategories}
                uncategorizedFaqs={uncategorizedFaqs}
              />
            </div>
          </div>

          {/* ══ RIGHT sidebar ══ */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">

              {/* Thumbnail (course poster) — 16:9 — hidden on mobile (shown inline above tabs) */}
              {course.thumbnail && (
                <div
                  className="hidden lg:block rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-md"
                  style={{ aspectRatio: "16/9" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r2Url(course.thumbnail)}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* YouTube video — hidden on mobile (shown inline above tabs) */}
              {embedId && (
                <div className="hidden lg:block">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 rounded-full" style={{ background: "#f59e0b" }} />
                    <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">Lộ trình chi tiết</p>
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-md relative"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <YoutubeEmbed videoId={embedId} title={course.name} />
                  </div>
                </div>
              )}

              {/* Price + rating + buttons + info — hidden on mobile (shown inline above tabs) */}
              <div className="hidden lg:block bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-sm">

                {/* Price + sale badges */}
                <div className="mb-1 flex items-center gap-2 flex-wrap">
                  {isOnSale && !isExpired && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#e11d48] px-2 py-0.5 rounded-full">
                      <Flame size={10} strokeWidth={2} /> LIVE
                    </span>
                  )}
                  {(isOnSale && !isExpired) || discountPct > 0 ? (
                    <span className="inline-flex text-[10px] font-semibold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-full">
                      TIẾT KIỆM
                    </span>
                  ) : null}
                  {discountPct > 0 && (
                    <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Giảm {discountPct}%
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-3xl font-extrabold" style={{ color: "#E53E3E" }}>
                    {formatVnd(discountedFinalPrice)}
                  </span>
                  {discountPct > 0 ? (
                    <span className="text-sm text-[#94a3b8] line-through">{formatVnd(finalPrice)}</span>
                  ) : isOnSale && !isExpired ? (
                    <span className="text-sm text-[#94a3b8] line-through">{formatVnd(Number(course.originalPrice))}</span>
                  ) : null}
                </div>

                {discountPct > 0 ? (
                  <p className="text-xs text-[#e11d48] font-semibold mb-4">
                    Tiết kiệm {formatVnd(finalPrice - discountedFinalPrice)} (-{discountPct}%)
                  </p>
                ) : savedAmount > 0 ? (
                  <p className="text-xs text-[#e11d48] font-semibold mb-4">
                    Tiết kiệm {formatVnd(savedAmount)}
                  </p>
                ) : null}

                {/* Stars */}
                <div className="flex items-center gap-1.5 mb-5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-sm ${s <= fullStars ? "text-[#f59e0b]" : "text-[#d1d5db]"}`}>★</span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#f59e0b]">{displayRating.toFixed(1)}</span>
                  {testimonials.length > 0 ? (
                    <span className="text-xs text-[#94a3b8]">
                      ({testimonials.length} đánh giá)
                    </span>
                  ) : course.studentCount > 0 ? (
                    <span className="text-xs text-[#94a3b8]">
                      ({course.studentCount.toLocaleString("vi-VN")} học viên)
                    </span>
                  ) : null}
                </div>

                {/* CTA buttons */}
                <div className="mb-5">
                  <SidebarRegisterButton />
                </div>

                {/* Info rows */}
                <div className="border-t border-[#f1f5f9] pt-4 space-y-3">
                  {INFO_ROWS.map(({ label, value, Icon }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#64748b]">
                        <Icon size={13} strokeWidth={1.75} />
                        {label}
                      </span>
                      <span className="font-semibold text-[#0f172a]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hỗ trợ trong khóa học */}
              {(supportItems.length > 0 || SIDEBAR_SUPPORT.length > 0) && (
                <div className="bg-white rounded-2xl border border-[#bbf7d0] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#d1fae5" }}>
                      <Shield size={14} strokeWidth={1.75} style={{ color: "#16a34a" }} />
                    </div>
                    <h3 className="text-sm font-bold text-[#0f172a]">Hỗ trợ trong khóa học</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {supportItems.length > 0
                      ? supportItems.map((item) => (
                          <li key={item.id} className="flex items-start gap-2.5">
                            <CourseIcon name={item.icon} size={15} className="text-success shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-semibold text-text-dark leading-relaxed">{item.title}</span>
                              {item.description && (
                                <p className="text-xs text-text-muted leading-relaxed mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </li>
                        ))
                      : SIDEBAR_SUPPORT.map((c) => (
                          <li key={c} className="flex items-start gap-2.5">
                            <CheckCircle size={14} strokeWidth={2} className="text-success shrink-0 mt-0.5" />
                            <span className="text-xs text-[#374151] leading-relaxed">{c}</span>
                          </li>
                        ))}
                  </ul>
                </div>
              )}

              {/* Support */}
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                    <Headphones size={15} strokeWidth={1.75} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold">Liên hệ hỗ trợ</h3>
                </div>
                <p className="text-xs text-white/80 mb-4 leading-relaxed">
                  Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn!
                </p>
                <a
                  href="https://t.me/BossMeta789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-white transition-colors hover:bg-blue-50"
                  style={{ color: "#0066ff" }}
                >
                  <Headphones size={15} strokeWidth={2} />
                  Liên hệ hỗ trợ ngay
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
