import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import TestimonialList from "./_components/TestimonialList";

export const metadata: Metadata = { title: "Admin — Đánh giá" };

export default async function AdminTestimonialsPage() {
  const items = await prisma.testimonial.findMany({
    include: { course: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ type: "asc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
  });

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

      <TestimonialList items={items} />
    </div>
  );
}
