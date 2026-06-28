import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Admin — Đánh giá" };

const PAGE_SIZE = 25;

const STARS = (n: number) => "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(Math.max(0, 5 - Math.min(5, n)));

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const { page, type } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = type ? { productType: type } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const types = await prisma.review.findMany({
    select: { productType: true },
    distinct: ["productType"],
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Đánh giá</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} đánh giá</span>
      </div>

      {/* Type filter */}
      <AdminFilterBar
        basePath="/admin/reviews"
        selects={[
          {
            paramKey: "type",
            label: "Loại",
            placeholder: "Tất cả loại",
            options: types.map(({ productType }) => ({ value: productType, label: productType })),
          },
        ]}
      />

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loại / ID SP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Sao</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Bình luận</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Chưa có đánh giá</td>
              </tr>
            )}
            {reviews.map((review, i) => (
              <tr key={review.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{review.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{review.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500">{review.productType}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate max-w-[100px]">{review.productId}</p>
                </td>
                <td className="px-4 py-3 text-[#F59E0B] text-sm">{STARS(review.rating)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                  {review.comment ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(review.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/reviews"
          searchParams={type ? { type } : {}}
        />
      )}
    </div>
  );
}
