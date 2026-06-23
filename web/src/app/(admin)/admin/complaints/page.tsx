import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CloseComplaintButton from "./_components/CloseComplaintButton";
import ComplaintsSearchInput from "./_components/ComplaintsSearchInput";

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
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const { page, status, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;

  // Nếu user gõ mã dạng "#KN-ABC12345", "KN-ABC12345", hoặc "ABC12345"
  // → tìm UUID bắt đầu bằng chuỗi đó qua raw SQL (Prisma không hỗ trợ string filter trên UUID)
  const idPrefix = search ? search.replace(/^#?KN-/i, "").toLowerCase() : undefined;
  const idMatches =
    idPrefix && idPrefix.length >= 4
      ? (
          await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id::text FROM complaints
            WHERE id::text ILIKE ${idPrefix + "%"}
            LIMIT 50
          `
        ).map((r) => r.id)
      : [];

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { subject:  { contains: search, mode: "insensitive" as const } },
            { user: { fullName: { contains: search, mode: "insensitive" as const } } },
            { user: { email:    { contains: search, mode: "insensitive" as const } } },
            ...(idMatches.length > 0 ? [{ id: { in: idMatches } }] : []),
          ],
        }
      : {}),
  };

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khiếu nại</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} khiếu nại</span>
        </div>
        <Suspense fallback={<div className="w-64 h-9 rounded-lg bg-gray-100 animate-pulse" />}>
          <ComplaintsSearchInput defaultValue={search ?? ""} />
        </Suspense>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Mã KN</th>
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
                <td className="px-4 py-3 whitespace-nowrap">
                  <span style={{ fontSize: "15px", fontFamily: "monospace", fontWeight: 500, color: "#0f172a" }}>
                    #KN-{c.id.slice(0, 8).toUpperCase()}
                  </span>
                </td>
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
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link prefetch={false} href={`/admin/complaints/${c.id}`} className="text-xs text-[#7C3AED] hover:text-[#A855F7]">
                    Xem
                  </Link>
                  <CloseComplaintButton complaintId={c.id} complaintStatus={c.status} />
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
          searchParams={{
            ...(status ? { status } : {}),
            ...(search ? { q: search } : {}),
          }}
        />
      )}
    </div>
  );
}
