import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import ServiceCategoryManager from "./_components/ServiceCategoryManager";

export const metadata: Metadata = { title: "Admin — Danh mục dịch vụ" };

export default async function AdminServiceCategoriesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, iconUrl: true, displayOrder: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Danh mục dịch vụ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý danh mục và icon hiển thị trong form dịch vụ. Upload ảnh hoặc dùng icon từ{" "}
          <a href="https://svgl.app" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
            svgl.app
          </a>
        </p>
      </div>
      <ServiceCategoryManager initialCategories={categories} />
    </div>
  );
}
