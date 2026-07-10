import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import CategoryStaffManager from "./_components/CategoryStaffManager";

export const metadata: Metadata = { title: "Admin — Nhân sự theo danh mục" };

// Danh mục ảo cho các trang tĩnh không có bộ lọc danh mục — hiển thị toàn bộ đội ngũ, không cần khách lọc
const EXTRA_STAFF_PAGES = ["Quảng cáo", "Network"];

export default async function AdminCategoryStaffPage() {
  const [categories, staff] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.categoryStaff.findMany({
      orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, category: true, name: true, role: true,
        description: true, avatarUrl: true, displayOrder: true, isActive: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nhân sự theo danh mục</h1>
        <p className="text-sm text-gray-500 mt-1">
          Thêm danh sách nhân sự (ảnh + tên + chức vụ + mô tả) hiển thị ở cuối trang Dịch vụ khi
          khách lọc theo từng danh mục. Chọn danh mục rồi thêm nhân sự — mỗi danh mục mới đều có thể thêm.
          Riêng danh mục &quot;Quảng cáo&quot; và &quot;Network&quot; hiển thị toàn bộ đội ngũ ở cuối
          trang /quang-cao và /NetWorks (không cần khách lọc).
        </p>
      </div>
      <CategoryStaffManager
        categories={[...categories.map((c) => c.name), ...EXTRA_STAFF_PAGES]}
        initialStaff={staff}
      />
    </div>
  );
}
