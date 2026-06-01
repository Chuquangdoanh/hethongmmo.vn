import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Khiếu nại" };

const PAGE_SIZE = 20;

const STATUS_BADGES: Record<string, string> = {
  OPEN:      "bg-[#EF4444]/10 text-[#EF4444]",
  IN_REVIEW: "bg-[#F59E0B]/10 text-[#F59E0B]",
  RESOLVED:  "bg-[#10B981]/10 text-[#10B981]",
  REJECTED:  "bg-[#EF4444]/10 text-[#EF4444]",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN:      "Mở",
  IN_REVIEW: "Đang xem xét",
  RESOLVED:  "Hoàn thành",
  REJECTED:  "Đóng băng",
};

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = status ? { status: status as never } : {};

  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Khiếu nại</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} khiếu nại</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] as const).map((s) => (
          <Link
            key={s}
            href={s ? `/admin/complaints?status=${s}` : "/admin/complaints"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === s || (!status && !s)
                ? "bg-[#7C3AED] text-white"
                : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
            }`}
          >
            {s ? (STATUS_LABELS[s] ?? s) : "Tất cả"}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chủ đề</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c, i) => (
              <tr key={c.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{c.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{c.user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{c.subject}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[c.status] ?? ""}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/complaints/${c.id}`} className="text-xs text-[#7C3AED] hover:text-[#A855F7]">
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/complaints"
          searchParams={status ? { status } : {}}
        />
      )}
    </div>
  );
}
