import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import WithdrawalActionButtons from "./_components/WithdrawalActionButtons";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  COMPLETED: "Hoàn thành",
};

export default async function AdminAffiliateWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const [withdrawals, total] = await Promise.all([
    prisma.affiliateWithdrawal.findMany({
      include: { affiliate: { select: { fullName: true, affiliateCode: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.affiliateWithdrawal.count(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Rút hoa hồng Affiliate</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày yêu cầu</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3">{w.affiliate.fullName} <span className="text-xs text-gray-400">({w.affiliate.affiliateCode})</span></td>
                <td className="px-4 py-3 font-medium">{formatVnd(Number(w.netAmount))}</td>
                <td className="px-4 py-3">{STATUS_LABEL[w.status]}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(w.createdAt)}</td>
                <td className="px-4 py-3">
                  <WithdrawalActionButtons withdrawalId={w.id} status={w.status} />
                </td>
              </tr>
            ))}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có yêu cầu nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/admin/affiliate-withdrawals" />
    </div>
  );
}
