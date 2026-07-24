import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

const PAGE_SIZE = 20;

export default async function SupportTicketsTabContent({
  page,
  q,
}: {
  page?: string;
  q?: string;
}) {
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() || undefined;

  const where = search
    ? {
        OR: [
          { user:   { fullName: { contains: search, mode: "insensitive" as const } } },
          { user:   { email:    { contains: search, mode: "insensitive" as const } } },
          { seller: { fullName: { contains: search, mode: "insensitive" as const } } },
          { seller: { email:    { contains: search, mode: "insensitive" as const } } },
          { order:  { orderCode: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user:   { select: { fullName: true, email: true } },
        seller: { select: { fullName: true, email: true } },
        order:  { select: { orderCode: true, itemName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { senderName: true, content: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hỗ trợ sau khi mua</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} ticket hỗ trợ</span>
        </div>
      </div>

      <AdminFilterBar
        basePath="/admin/complaints"
        preserveParams={["tab"]}
        search={{ placeholder: "Tìm theo tên/email người mua, người bán, mã đơn..." }}
      />

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mã đơn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người mua</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người bán</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tin nhắn cuối</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Số tin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Cập nhật</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  Chưa có ticket hỗ trợ nào
                </td>
              </tr>
            )}
            {tickets.map((t, i) => {
              const last = t.messages[0];
              return (
                <tr key={t.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 font-mono">#{t.order.orderCode}</p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[160px]">{t.order.itemName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{t.user.fullName ?? t.user.email}</p>
                    <p className="text-[11px] text-gray-500">{t.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{t.seller.fullName ?? t.seller.email}</p>
                    <p className="text-[11px] text-gray-500">{t.seller.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {last ? (
                      <p className="text-xs text-gray-600 truncate">
                        <span className="font-medium">{last.senderName}:</span> {last.content}
                      </p>
                    ) : (
                      <span className="text-xs text-gray-400">Chưa có tin nhắn</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t._count.messages}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.updatedAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link prefetch={false} href={`/admin/complaints/support/${t.id}`} className="text-xs text-[#7C3AED] hover:text-[#A855F7]">
                      Xem
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/complaints"
          searchParams={{
            tab: "support",
            ...(search ? { q: search } : {}),
          }}
        />
      )}
    </div>
  );
}
