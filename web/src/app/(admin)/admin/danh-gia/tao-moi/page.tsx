import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import TestimonialForm from "../_components/TestimonialForm";

export const metadata: Metadata = { title: "Admin — Tạo đánh giá mới" };

export default async function CreateTestimonialPage() {
  const [courses, services] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/danh-gia" className="text-xs text-gray-500 hover:text-gray-700">← Đánh giá</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Tạo đánh giá mới</h1>
      <TestimonialForm courses={courses} services={services} />
    </div>
  );
}
