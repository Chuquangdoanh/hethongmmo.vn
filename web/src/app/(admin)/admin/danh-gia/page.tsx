import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import TestimonialList from "./_components/TestimonialList";
import type { ServiceStat } from "./_components/ServiceFilterPanel";

export const metadata: Metadata = { title: "Admin — Đánh giá" };

export default async function AdminTestimonialsPage() {
  const [items, allServices, serviceRatingGroups, allCourses, courseRatingGroups, courseOverall, serviceOverall] = await Promise.all([
    prisma.testimonial.findMany({
      include: { course: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ type: "asc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.service.findMany({
      select: { id: true, name: true, category: true },
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.testimonial.groupBy({
      by: ["serviceId"],
      where: { type: "SERVICE", serviceId: { not: null } },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.course.findMany({
      select: { id: true, name: true, category: true },
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.testimonial.groupBy({
      by: ["courseId"],
      where: { type: "COURSE", courseId: { not: null } },
      _avg: { rating: true },
      _count: { id: true },
    }),
    // Overall averages across all CMS testimonials
    prisma.testimonial.aggregate({
      where: { type: "COURSE" },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.testimonial.aggregate({
      where: { type: "SERVICE" },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  const serviceRatingMap = new Map(
    serviceRatingGroups.map((r) => [r.serviceId!, { avg: r._avg.rating ?? 0, count: r._count.id }])
  );
  const courseRatingMap = new Map(
    courseRatingGroups.map((r) => [r.courseId!, { avg: r._avg.rating ?? 0, count: r._count.id }])
  );

  const serviceStats: ServiceStat[] = allServices.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    reviewCount: serviceRatingMap.get(s.id)?.count ?? 0,
    averageRating: serviceRatingMap.get(s.id)?.avg ?? 0,
  }));

  const courseStats: ServiceStat[] = allCourses.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    reviewCount: courseRatingMap.get(c.id)?.count ?? 0,
    averageRating: courseRatingMap.get(c.id)?.avg ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá</h1>
          <p className="text-sm text-gray-500 mt-1">Đánh giá do admin tạo — hiển thị trên khóa học và dịch vụ</p>
        </div>
        <Link
          href="/admin/danh-gia/tao-moi"
          className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors"
        >
          + Tạo đánh giá mới
        </Link>
      </div>

      <TestimonialList items={items} serviceStats={serviceStats} courseStats={courseStats} />
    </div>
  );
}
