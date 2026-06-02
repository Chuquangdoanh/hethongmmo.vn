import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import TestimonialForm from "../../_components/TestimonialForm";

export const metadata: Metadata = { title: "Admin — Sửa đánh giá" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item, courses, services] = await Promise.all([
    prisma.testimonial.findUnique({ where: { id } }),
    prisma.course.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, category: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/danh-gia" className="text-xs text-gray-500 hover:text-gray-700">← Đánh giá</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sửa đánh giá</h1>
      <TestimonialForm
        courses={courses}
        services={services}
        initial={{
          id:               item.id,
          type:             item.type,
          courseId:         item.courseId  ?? undefined,
          serviceId:        item.serviceId ?? undefined,
          category:         item.category  ?? undefined,
          reviewerName:     item.reviewerName,
          reviewerRole:     item.reviewerRole ?? undefined,
          reviewerAvatar:   item.reviewerAvatar ?? undefined,
          reviewerInitials: item.reviewerInitials ?? undefined,
          reviewerColor:    item.reviewerColor ?? undefined,
          content:          item.content,
          rating:           item.rating,
          isActive:         item.isActive,
          displayOrder:     item.displayOrder,
        }}
      />
    </div>
  );
}
