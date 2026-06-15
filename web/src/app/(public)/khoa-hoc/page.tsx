import type { Metadata } from "next";
import Link from "next/link";
import CourseScrollHelper from "./_components/CourseScrollHelper";
import CategoryFilterClient from "./_components/CategoryFilterClient";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import {
  Star, Users, Clock, Eye, CheckCircle,
  Zap, BookOpen, TrendingUp, Award, GraduationCap, ChevronRight,
} from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "Khóa Học MMO Thực Chiến | Hệ Thống MMO",
  description: "Hệ thống khóa học Digital Marketing, Facebook Ads, TikTok Ads, Google Ads và xây dựng thương hiệu giúp bạn kiếm tiền online bền vững.",
  url: "/khoa-hoc",
  image: "/images/dj-media-classroom.jpg",
});

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
  ONLINE:  { label: "Khóa học online thực chiến",                color: "#0891b2", bg: "#e0f2fe" },
  OFFLINE: { label: "Khóa học thực chiến trực tiếp chuyên sâu", color: "#7c3aed", bg: "#ede9fe" },
  HYBRID:  { label: "Khóa Học Siêu VIP",                        color: "#16a34a", bg: "#dcfce7" },
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
  await guardPublicPage("khoa-hoc");
  const pageHero = await getSiteContent<{ badge: string; title: string; description: string }>(SITE_CONTENT_KEYS.PAGE_KHOA_HOC);
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

  // Sort 4 cấp: category displayOrder → course displayOrder → badge priority → studentCount DESC
  const courseCatOrder = new Map(courseCategoryDefs.map((c, idx) => [c.name, idx]));
  courses.sort((a, b) => {
    const oa = courseCatOrder.get(a.category ?? "") ?? 999;
    const ob = courseCatOrder.get(b.category ?? "") ?? 999;
    if (oa !== ob) return oa - ob;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    const pa = BADGE_PRIORITY[a.badge] ?? 99;
    const pb = BADGE_PRIORITY[b.badge] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.studentCount - a.studentCount;
  });

  const categoryIconMap  = new Map(courseCategoryDefs.map((c) => [c.name, c.icon]));
  // Sort filter buttons theo displayOrder của CourseCategory (không sort alpha)
  const catNameSet = new Set(rawCategories.map((c) => c.category).filter(Boolean));
  const uniqueCategories = courseCategoryDefs.map((c) => c.name).filter((n) => catNameSet.has(n));
  const categoriesWithIcons = uniqueCategories.map((name) => ({
    name,
    icon: categoryIconMap.get(name) ?? "",
  }));

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
      <div className="relative overflow-hidden bg-[#f1f5f9] border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-14">
          {/*
            Mobile (flex-col): order-1 → order-2 → order-3
              1. Badge + Tiêu đề
              2. Ảnh thumbnail
              3. Mô tả + Icon stats + Button

            Desktop (grid 12 cột): cột trái (7) chứa 1+3, cột phải (5) chứa ảnh — span 2 hàng
          */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-10">

            {/* 1 — Badge + Tiêu đề */}
            <div className="order-1 lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:self-end">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-5 uppercase tracking-widest"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}
              >
                <Zap size={11} strokeWidth={2.5} />
                {pageHero.badge}
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight">
                {pageHero.title}
              </h1>
            </div>

            {/* 2 — Ảnh thumbnail (thứ 2 trên mobile, cột phải span 2 hàng trên desktop) */}
            <div className="order-2 lg:col-start-8 lg:col-span-5 lg:row-start-1 lg:row-span-2">
              {featuredCourse?.thumbnail ? (
                <div className="relative aspect-video lg:aspect-auto lg:h-full rounded-2xl overflow-hidden shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r2Url(featuredCourse.thumbnail)}
                    alt="Khóa học thực chiến"
                    className="w-full h-full object-cover"
                  />
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
                  className="aspect-video lg:aspect-auto lg:h-full rounded-2xl flex flex-col items-center justify-center gap-4 text-[#111827] text-center"
                  style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)" }}
                >
                  <GraduationCap size={56} strokeWidth={1.5} className="text-[#9ca3af]" />
                  <div>
                    <p className="text-2xl font-extrabold">{courses.length}+</p>
                    <p className="text-sm text-[#6b7280]">Khóa học đang mở</p>
                  </div>
                </div>
              )}
            </div>

            {/* 3 — Mô tả + Icon stats + Button */}
            <div className="order-3 lg:col-start-1 lg:col-span-7 lg:row-start-2 lg:self-start">
              <p className="text-[#6b7280] text-sm leading-relaxed mb-8 max-w-lg">
                Hệ thống khóa học Digital Marketing, Facebook Ads, TikTok Ads, Google Ads
                và xây dựng thương hiệu giúp bạn kiếm tiền online bền vững.
              </p>

              {/* Stats icons */}
              <div className="flex flex-wrap items-center gap-6 mb-8">
                {HERO_STATS.map(({ Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(0,0,0,0.07)" }}
                    >
                      <Icon size={16} strokeWidth={1.75} className="text-[#374151]" />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-[#111827] leading-none">{value}</p>
                      <p className="text-[11px] text-[#6b7280] leading-tight">{label}</p>
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-[#374151] border border-[#d1d5db] hover:bg-[#e5e7eb] transition-all"
                >
                  Dịch vụ MXH
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ COURSES SECTION ══ */}
      <div id="khoa-hoc-grid" className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-12 scroll-mt-24">

        {/* Category filter — centered, scrollable on mobile */}
        {categoriesWithIcons.length > 0 && (
          <div className="flex justify-center mb-8">
            <CategoryFilterClient
              categories={categoriesWithIcons}
              activeCategory={category}
            />
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
    <Link href={`/khoa-hoc/${course.slug}`} className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r2Url(course.thumbnail)}
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
          <div
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
          >
            Xem chi tiết
            <ChevronRight size={14} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}
