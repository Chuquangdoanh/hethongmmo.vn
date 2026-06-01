import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import CourseCategoryManager from "./_components/CourseCategoryManager";

export const metadata: Metadata = { title: "Admin — Danh mục khóa học" };

export default async function AdminCourseCategoriesPage() {
  const categories = await prisma.courseCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Danh mục khóa học</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý danh mục và icon hiển thị trên trang khóa học. Icon lấy từ{" "}
          <a href="https://svgl.app" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
            svgl.app
          </a>
        </p>
      </div>
      <CourseCategoryManager initialCategories={categories} />
    </div>
  );
}
