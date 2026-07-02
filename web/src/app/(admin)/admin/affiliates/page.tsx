import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import GrantAffiliateForm from "./_components/GrantAffiliateForm";

const PAGE_SIZE = 20;

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = { isAffiliate: true };
  const [affiliates, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true,
        _count: { select: { referredUsers: true, affiliateCommissionsEarned: true } },
      },
      orderBy: { affiliateJoinedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Quản lý Affiliate</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Cấp quyền Affiliate cho tài khoản</h2>
        <GrantAffiliateForm />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Mã Affiliate</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày cấp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {affiliates.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/affiliates/${a.id}`} className="font-medium text-violet-600 hover:underline">
                    {a.fullName}
                  </Link>
                  <div className="text-xs text-gray-400">{a.email}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.affiliateCode}</td>
                <td className="px-4 py-3">{a._count.referredUsers}</td>
                <td className="px-4 py-3">
                  <span className={a.affiliateStatus === "ACTIVE" ? "text-green-600" : "text-red-600"}>
                    {a.affiliateStatus === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{a.affiliateJoinedAt ? formatDate(a.affiliateJoinedAt) : "—"}</td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có Affiliate nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/admin/affiliates" />
    </div>
  );
}
