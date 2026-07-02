import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  VOIDED: "Đã hủy",
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  VOIDED: "bg-gray-100 text-gray-500",
};

export default async function AffiliateCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const where = { affiliateId: me.id };
  const [commissions, total] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where,
      include: { customer: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.affiliateCommission.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Lịch sử hoa hồng</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Giá trị đơn</th>
              <th className="px-4 py-3">Hoa hồng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.customer.fullName}</td>
                <td className="px-4 py-3">{formatVnd(Number(c.orderAmount))}</td>
                <td className="px-4 py-3 font-medium text-violet-600">{formatVnd(Number(c.amount))}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có hoa hồng nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/affiliate/commissions" />
    </div>
  );
}
