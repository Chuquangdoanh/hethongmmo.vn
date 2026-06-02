import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import CourseForm from "../../_components/CourseForm";

export const metadata: Metadata = { title: "Admin — Sửa khóa học" };

interface PlatformVariant {
  name: string;
  icon: string;
}

function parsePlatformVariants(raw: unknown): PlatformVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") return [{ name: item, icon: "📱" }];
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), icon: String(obj.icon ?? "📱") }];
    }
    return [];
  });
}

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      learningFormat: true,
      originalPrice: true,
      salePrice: true,
      duration: true,
      instructorName: true,
      badge: true,
      description: true,
      isActive: true,
      displayOrder: true,
      thumbnail: true,
      youtubeUrl: true,
      studentCount: true,
      rating: true,
      totalViews: true,
      totalOrders: true,
      contentList: true,
      platformVariants: true,
      saleDeadline: true,
      seoTitle: true,
      seoDescription: true,
      requiresAccountType: true,
      requiresCccd: true,
      commitments: true,
      registrationProcedure: true,
    },
  });

  if (!course) notFound();

  const contentList = Array.isArray(course.contentList)
    ? (course.contentList as string[])
    : [];

  const commitments = Array.isArray(course.commitments)
    ? (course.commitments as string[])
    : [];

  const platformVariants = parsePlatformVariants(course.platformVariants);

  // saleDeadline is @db.Date — format as YYYY-MM-DD for <input type="date">
  const saleDeadlineStr = course.saleDeadline
    ? new Date(course.saleDeadline).toISOString().slice(0, 10)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/courses" className="text-xs text-gray-500 hover:text-gray-500">
          ← Khóa học
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sửa khóa học</h1>
      <CourseForm
        initial={{
          id: course.id,
          name: course.name,
          slug: course.slug,
          category: course.category,
          learningFormat: course.learningFormat,
          originalPrice: Number(course.originalPrice),
          salePrice: Number(course.salePrice),
          duration: course.duration ?? undefined,
          instructorName: course.instructorName ?? undefined,
          badge: course.badge,
          description: course.description ?? undefined,
          isActive: course.isActive,
          displayOrder: course.displayOrder,
          thumbnail: course.thumbnail ?? undefined,
          youtubeUrl: course.youtubeUrl ?? undefined,
          studentCount: course.studentCount,
          rating: course.rating,
          totalViews: course.totalViews,
          totalOrders: course.totalOrders,
          contentList,
          platformVariants,
          saleDeadline: saleDeadlineStr,
          seoTitle: course.seoTitle ?? undefined,
          seoDescription: course.seoDescription ?? undefined,
          requiresAccountType: course.requiresAccountType,
          requiresCccd: course.requiresCccd,
          commitments,
          registrationProcedure: course.registrationProcedure ?? undefined,
        }}
      />
    </div>
  );
}
