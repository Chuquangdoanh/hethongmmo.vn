import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatDate, formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Admin — Hỗ trợ gian hàng đối tác" };

const PAGE_SIZE = 20;

const STATUS_BADGES: Record<string, string> = {
  OPEN:     "bg-[#F59E0B]/10 text-[#F59E0B]",
  RESOLVED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-[#3B82F6]/10 text-[#3B82F6]",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN:     "Đang mở",
  RESOLVED: "Đã đóng",
  REFUNDED: "Đã hoàn tiền",
};

export default async function AdminPartnerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const session = await auth();
  try { requireStaff(session); } catch { redirect("/"); }

  const { page, status, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { subject:      { contains: search, mode: "insensitive" as const } },
            { providerName: { contains: search, mode: "insensitive" as const } },
            { user: { email: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [threads, total] = await Promise.all([
    prisma.partnerSupportThread.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, kind: true, subject: true, providerName: true, status: true, createdAt: true,
        user: { select: { email: true, fullName: true } },
        order: { select: { orderCode: true, finalPrice: true } },
      },
    }),
    prisma.partnerSupportThread.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hỗ trợ gian hàng đối tác</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} cuộc trò chuyện — tách biệt với Khiếu nại seller</span>
        </div>
      </div>

      <AdminFilterBar
        basePath="/admin/doi-tac-ho-tro"
        search={{ placeholder: "Tìm theo gian hàng, tiêu đề, email..." }}
        selects={[
          {
            paramKey: "status",
            label: "Trạng thái",
            placeholder: "Tất cả trạng thái",
            options: [
              { value: "OPEN", label: "Đang mở" },
              { value: "RESOLVED", label: "Đã đóng" },
              { value: "REFUNDED", label: "Đã hoàn tiền" },
            ],
          },
        ]}
      />

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Gian hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người mua</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chủ đề</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Đơn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {threads.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">Chưa có cuộc trò chuyện nào</td></tr>
            ) : threads.map((t, i) => (
              <tr key={t.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.providerName}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{t.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{t.user.email}</p>
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.kind === "PRESALE" ? "bg-amber-100 text-amber-700" : "bg-[#0d9488]/10 text-[#0d9488]"
                    }`}>
                      {t.kind === "PRESALE" ? "Tư vấn" : "Hỗ trợ đơn"}
                    </span>
                    <span className="text-sm text-gray-500 truncate">{t.subject}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {t.order ? (
                    <>
                      <p className="font-mono">#{t.order.orderCode}</p>
                      <p className="text-emerald-600 font-semibold">{formatVnd(Number(t.order.finalPrice))}</p>
                    </>
                  ) : (
                    <span className="text-gray-300">— (trước mua)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[t.status] ?? ""}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link prefetch={false} href={`/admin/doi-tac-ho-tro/${t.id}`} className="text-xs text-[#0d9488] hover:text-[#0f766e] font-semibold">
                    Xem &amp; trả lời
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
          basePath="/admin/doi-tac-ho-tro"
          searchParams={{ ...(status ? { status } : {}), ...(search ? { q: search } : {}) }}
        />
      )}
    </div>
  );
}
