import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import ResourceCategoryManager from "./_components/ResourceCategoryManager";

export const metadata: Metadata = { title: "Admin — Danh mục tài nguyên" };

export default async function AdminResourceCategoriesPage() {
  const categories = await prisma.resourceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, iconUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Danh mục tài nguyên</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý danh mục và icon hiển thị trên trang tài nguyên MMO. Upload ảnh hoặc dùng icon từ{" "}
          <a href="https://svgl.app" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
            svgl.app
          </a>
        </p>
      </div>
      <ResourceCategoryManager initialCategories={categories} />
    </div>
  );
}
