import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import TutTrickCategoryManager from "./_components/TutTrickCategoryManager";

export const metadata: Metadata = { title: "Admin — Danh mục Tut & Tricks" };

export default async function AdminTutTrickCategoriesPage() {
  const categories = await prisma.tutTrickCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, iconUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Danh mục Tut &amp; Tricks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý danh mục phân loại tài liệu. Ví dụ: Có phí, Miễn phí, VIP, Nâng cao...
        </p>
      </div>
      <TutTrickCategoryManager initialCategories={categories} />
    </div>
  );
}
