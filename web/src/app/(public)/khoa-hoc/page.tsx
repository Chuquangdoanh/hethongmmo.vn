import type { Metadata } from "next";
import Link from "next/link";
import CourseScrollHelper from "./_components/CourseScrollHelper";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import {
  Star, Users, Clock, Eye, CheckCircle,
  Zap, BookOpen, TrendingUp, Award, GraduationCap, ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Hệ Thống MMO",
  description: "Hệ thống khóa học Digital Marketing, Facebook Ads, TikTok Ads, Google Ads và xây dựng thương hiệu.",
};

const BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  HOT:     { bg: "#fef2f2", color: "#e11d48", label: "HOT" },
  POPULAR: { bg: "#fef3c7", color: "#b45309", label: "POPULAR" },
  TREND:   { bg: "#f0fdf4", color: "#16a34a", label: "TREND" },
  NEW:     { bg: "#ede9fe", color: "#7c3aed", label: "NEW" },
  VIP:     { bg: "#dbeafe", color: "#1d4ed8", label: "VIP" },
};

// Thứ tự ưu tiên badge — chỉnh số để thay đổi thứ tự, số nhỏ lên trước
const BADGE_PRIORITY: Record<string, number> = {
  VIP:     0,
  HOT:     1,
  POPULAR: 2,
  TREND:   3,
  NEW:     4,
  NONE:    99,
};

const FORMAT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ONLINE:  { label: "Online",  color: "#0891b2", bg: "#e0f2fe" },
  OFFLINE: { label: "Offline", color: "#7c3aed", bg: "#ede9fe" },
  HYBRID:  { label: "Hybrid",  color: "#16a34a", bg: "#dcfce7" },
};

function parseContentList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function KhoaHocPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [courses, rawCategories, courseCategoryDefs] = await Promise.all([
    prisma.course.findMany({
      where: { isActive: true, deletedAt: null, ...(category ? { category } : {}) },
      orderBy: [{ displayOrder: "asc" }, { studentCount: "desc" }],
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        category: true, learningFormat: true,
        originalPrice: true, salePrice: true,
        duration: true, studentCount: true,
        rating: true, badge: true, saleDeadline: true,
        description: true, contentList: true, totalViews: true,
        displayOrder: true,
      },
    }),
    prisma.course.findMany({
      where: { isActive: true, deletedAt: null },
      select: { category: true },
      distinct: ["category"],
    }),
    prisma.courseCategory.findMany({
      select: { name: true, icon: true, displayOrder: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  // Sort 3 cấp: displayOrder ASC → badge priority (BADGE_PRIORITY) → studentCount DESC
  // Stable sort — thứ tự bằng nhau giữ nguyên vị trí tương đối từ DB
  courses.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    const pa = BADGE_PRIORITY[a.badge] ?? 99;
    const pb = BADGE_PRIORITY[b.badge] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.studentCount - a.studentCount;
  });

  const categoryIconMap  = new Map(courseCategoryDefs.map((c) => [c.name, c.icon]));
  const uniqueCategories = [...new Set(rawCategories.map((c) => c.category))].sort();

  // Hero stats (all courses, regardless of filter)
  const totalStudents  = courses.reduce((s, c) => s + c.studentCount, 0);
  const avgRating      = courses.length > 0
    ? (courses.reduce((s, c) => s + c.rating, 0) / courses.length).toFixed(1)
    : "5.0";
  const featuredCourse = courses.find((c) => c.thumbnail) ?? null;

  const HERO_STATS = [
    { Icon: Users,       value: `${totalStudents >= 1000 ? `${(totalStudents / 1000).toFixed(0)}K` : totalStudents}+`, label: "Học viên" },
    { Icon: Star,        value: `${avgRating}★`,  label: "Đánh giá" },
    { Icon: GraduationCap, value: `${courses.length}+`, label: "Khóa học" },
    { Icon: Award,       value: "100%",           label: "Thực chiến" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <CourseScrollHelper />

      {/* ══ HERO SECTION ══ */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0c1445 0%, #1a237e 60%, #1e3a5f 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: "#f59e0b" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#0066ff" }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left: text */}
            <div className="lg:col-span-7 text-white">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-5 uppercase tracking-widest"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}
              >
                <Zap size={11} strokeWidth={2.5} />
                Digital Learning
              </span>

              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
                Khóa học{" "}
                <span
                  className="relative"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Thực chiến
                </span>
                <br />
                <span className="text-white/90">MMO 2025</span>
              </h1>

              <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-lg">
                Hệ thống khóa học Digital Marketing, Facebook Ads, TikTok Ads, Google Ads
                và xây dựng thương hiệu giúp bạn kiếm tiền online bền vững.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-6 mb-8">
                {HERO_STATS.map(({ Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      <Icon size={16} strokeWidth={1.75} className="text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-white leading-none">{value}</p>
                      <p className="text-[11px] text-white/55 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="#khoa-hoc-grid"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                >
                  Khám phá ngay
                  <ChevronRight size={15} strokeWidth={2.5} />
                </Link>
                <Link
                  href="/dich-vu"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white/90 border border-white/20 hover:bg-white/10 transition-all"
                >
                  Dịch vụ MXH
                </Link>
              </div>
            </div>

            {/* Right: hero banner image */}
            <div className="lg:col-span-5">
              {featuredCourse?.thumbnail ? (
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl"
                  style={{ aspectRatio: "16/9" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredCourse.thumbnail}
                    alt="Khóa học thực chiến"
                    className="w-full h-full object-cover"
                  />
                  {/* TOP 1 badge */}
                  <div
                    className="absolute bottom-4 right-4 flex items-center gap-3 px-6 py-3 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      boxShadow: "0 6px 24px rgba(217,119,6,0.60)",
                    }}
                  >
                    <Award size={28} strokeWidth={2.5} className="text-white" />
                    <span className="text-xl font-extrabold text-white tracking-wide">TOP 1</span>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-2xl flex flex-col items-center justify-center gap-4 text-white text-center"
                  style={{
                    aspectRatio: "16/9",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <GraduationCap size={56} strokeWidth={1.5} className="text-white/40" />
                  <div>
                    <p className="text-2xl font-extrabold">{courses.length}+</p>
                    <p className="text-sm text-white/55">Khóa học đang mở</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ══ COURSES SECTION ══ */}
      <div id="khoa-hoc-grid" className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-12">

        {/* Category filter — centered, scrollable on mobile */}
        {uniqueCategories.length > 0 && (
          <div className="flex justify-center mb-8">
            <div
              className="flex items-center gap-2"
              style={{ overflowX: "auto", scrollbarWidth: "none", maxWidth: "100%", paddingBottom: "4px" }}
            >
              <Link
                href="/khoa-hoc"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
                style={
                  !category
                    ? { background: "linear-gradient(135deg, #e11d48, #be123c)", color: "#fff", boxShadow: "0 2px 8px rgba(225,29,72,0.35)" }
                    : { background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569" }
                }
              >
                Tất cả
              </Link>
              {uniqueCategories.map((cat) => {
                const catIcon = categoryIconMap.get(cat);
                const isActive = category === cat;
                return (
                  <Link
                    key={cat}
                    href={`/khoa-hoc?category=${encodeURIComponent(cat)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
                    style={
                      isActive
                        ? { background: "linear-gradient(135deg, #e11d48, #be123c)", color: "#fff", boxShadow: "0 2px 8px rgba(225,29,72,0.35)" }
                        : { background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569" }
                    }
                  >
                    {catIcon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={catIcon}
                        alt={cat}
                        width={16}
                        height={16}
                        loading="lazy"
                        decoding="async"
                        className={`w-4 h-4 object-contain shrink-0 ${isActive ? "brightness-0 invert" : ""}`}
                      />
                    )}
                    {cat}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-20 text-[#64748b]">
            <BookOpen size={48} strokeWidth={1.5} className="mx-auto mb-4 text-[#94a3b8]" />
            <p className="font-medium">Chưa có khóa học nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} isPriority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  isPriority = false,
}: {
  course: {
    slug: string;
    name: string;
    thumbnail: string | null;
    category: string;
    learningFormat: string;
    originalPrice: { toString(): string };
    salePrice: { toString(): string };
    duration: string | null;
    studentCount: number;
    rating: number;
    badge: string;
    saleDeadline: Date | null;
    description: string | null;
    contentList: unknown;
    totalViews: number;
  };
  isPriority?: boolean;
}) {
  const original = Number(course.originalPrice);
  const sale     = Number(course.salePrice);
  const isOnSale = sale < original;
  const isExpired = course.saleDeadline ? new Date(course.saleDeadline) < new Date() : false;
  const showSale  = isOnSale && !isExpired;
  const savings   = original - sale;
  const discountPct = original > 0 ? Math.round((1 - sale / original) * 100) : 0;
  const displayPrice = showSale ? sale : original;
  const contentItems = parseContentList(course.contentList);
  const badgeStyle   = course.badge !== "NONE" ? BADGE_STYLES[course.badge] : null;
  const formatMeta   = FORMAT_LABELS[course.learningFormat] ?? { label: course.learningFormat, color: "#64748b", bg: "#f1f5f9" };

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt={course.name}
            width={400}
            height={225}
            loading={isPriority ? "eager" : "lazy"}
            decoding="async"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
            <BookOpen size={36} strokeWidth={1.5} style={{ color: "#94a3b8" }} />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {badgeStyle && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.color}30` }}
            >
              {badgeStyle.label}
            </span>
          )}
        </div>

        {/* Rating top-right */}
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        >
          <Star size={10} strokeWidth={2} className="text-[#f59e0b]" />
          {course.rating.toFixed(1)}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Category + format */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#f1f5f9", color: "#475569" }}
          >
            {course.category}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: formatMeta.bg, color: formatMeta.color }}
          >
            {formatMeta.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug">
          {course.name}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-[#64748b] flex-wrap">
          <span className="flex items-center gap-1">
            <Users size={11} strokeWidth={1.75} />
            {course.studentCount.toLocaleString("vi-VN")}+
          </span>
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock size={11} strokeWidth={1.75} />
              {course.duration}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye size={11} strokeWidth={1.75} />
            {formatViews(course.totalViews)}
          </span>
        </div>

        {/* Price */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-extrabold" style={{ color: "#e11d48" }}>
              {formatVnd(displayPrice)}
            </span>
            {showSale && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                style={{ background: "#e11d48" }}
              >
                -{discountPct}%
              </span>
            )}
          </div>
          {showSale && (
            <p className="text-[11px] text-[#94a3b8] line-through mt-0.5">
              {formatVnd(original)}
            </p>
          )}
        </div>

        {/* Savings box */}
        {showSale && savings > 0 && (
          <div
            className="rounded-xl px-3 py-2 flex items-start gap-2"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <Zap size={13} strokeWidth={2} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <p className="text-[11px] font-semibold" style={{ color: "#92400e" }}>
                Tiết kiệm: {formatVnd(savings)}
              </p>
              {course.saleDeadline && (
                <p className="text-[10px] mt-0.5" style={{ color: "#92400e" }}>
                  Ưu đãi đến{" "}
                  {new Date(course.saleDeadline).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content preview */}
        {contentItems.length > 0 && (
          <ul className="space-y-1">
            {contentItems.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#475569]">
                <CheckCircle size={11} strokeWidth={2} style={{ color: "#16a34a", flexShrink: 0, marginTop: "1px" }} />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
            {contentItems.length > 3 && (
              <li className="text-[11px] text-[#94a3b8] pl-4 flex items-center gap-1">
                <TrendingUp size={10} strokeWidth={2} />
                +{contentItems.length - 3} nội dung khác
              </li>
            )}
          </ul>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <Link
            href={`/khoa-hoc/${course.slug}`}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
          >
            Xem chi tiết
            <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
