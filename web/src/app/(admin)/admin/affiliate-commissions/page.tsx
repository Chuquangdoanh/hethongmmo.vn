import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CommissionActionButtons from "./_components/CommissionActionButtons";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  VOIDED: "Đã hủy",
};

export default async function AdminAffiliateCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const validStatus: "PENDING" | "APPROVED" | "VOIDED" | undefined =
    status === "PENDING" || status === "APPROVED" || status === "VOIDED" ? status : undefined;

  const where = validStatus ? { status: validStatus } : {};
  const [commissions, total] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where,
      include: {
        affiliate: { select: { fullName: true, affiliateCode: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.affiliateCommission.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Duyệt hoa hồng Affiliate</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Giá trị đơn</th>
              <th className="px-4 py-3">Hoa hồng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.affiliate.fullName} <span className="text-xs text-gray-400">({c.affiliate.affiliateCode})</span></td>
                <td className="px-4 py-3">{c.customer.fullName}</td>
                <td className="px-4 py-3">{formatVnd(Number(c.orderAmount))}</td>
                <td className="px-4 py-3 font-medium text-violet-600">{formatVnd(Number(c.amount))}</td>
                <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <CommissionActionButtons commissionId={c.id} status={c.status} />
                </td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có hoa hồng nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/admin/affiliate-commissions" />
    </div>
  );
}
