import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import CourseForm from "../../_components/CourseForm";
import CourseFaqManager from "./_components/CourseFaqManager";
import CourseSupportManager from "./_components/CourseSupportManager";

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

  const [course, faqCategories, faqs, supportItems] = await Promise.all([
    prisma.course.findUnique({
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
    }),
    prisma.courseFaqCategory.findMany({
      where: { courseId: id },
      include: {
        faqs: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true, question: true, answer: true,
            isActive: true, displayOrder: true, categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.courseFaq.findMany({
      where: { courseId: id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.courseSupportItem.findMany({
      where: { courseId: id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!course) notFound();

  const contentList = Array.isArray(course.contentList)
    ? (course.contentList as string[])
    : [];

  const commitments = Array.isArray(course.commitments)
    ? (course.commitments as string[])
    : [];

  const platformVariants = parsePlatformVariants(course.platformVariants);

  const saleDeadlineStr = course.saleDeadline
    ? new Date(course.saleDeadline).toISOString().slice(0, 10)
    : undefined;

  return (
    <div className="space-y-8">
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

      {/* ── Hỏi đáp ── */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="mb-5 pb-4 border-b border-[#f1f5f9]">
          <h2 className="text-lg font-bold text-text-dark">Hỏi đáp (FAQ)</h2>
          <p className="text-sm text-text-muted mt-1">
            Quản lý câu hỏi thường gặp cho khóa học này. Nhóm câu hỏi theo danh mục để dễ tìm kiếm.
          </p>
        </div>
        <CourseFaqManager
          courseId={id}
          initialCategories={faqCategories.map((c) => ({
            id: c.id,
            name: c.name,
            displayOrder: c.displayOrder,
            faqs: c.faqs.map((f) => ({
              id: f.id,
              question: f.question,
              answer: f.answer,
              isActive: f.isActive,
              displayOrder: f.displayOrder,
              categoryId: f.categoryId,
              category: f.category,
            })),
          }))}
          initialFaqs={faqs.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            isActive: f.isActive,
            displayOrder: f.displayOrder,
            categoryId: f.categoryId,
            category: f.category,
          }))}
        />
      </div>

      {/* ── Hỗ trợ trong khóa học ── */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="mb-5 pb-4 border-b border-[#f1f5f9]">
          <h2 className="text-lg font-bold text-text-dark">Hỗ trợ trong khóa học</h2>
          <p className="text-sm text-text-muted mt-1">
            Danh sách các quyền lợi & hỗ trợ hiển thị trong sidebar trang chi tiết khóa học.
          </p>
        </div>
        <CourseSupportManager
          courseId={id}
          initialItems={supportItems.map((i) => ({
            id: i.id,
            icon: i.icon,
            title: i.title,
            description: i.description,
            isActive: i.isActive,
            displayOrder: i.displayOrder,
          }))}
        />
      </div>
    </div>
  );
}
