import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

const PAGE_SIZE = 20;

export default async function AffiliateCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const where = { referrerAffiliateId: me.id };
  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, fullName: true, email: true, affiliateJoinedAt: true },
      orderBy: { affiliateJoinedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Khách hàng đã liên kết</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ngày liên kết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-gray-500">{c.affiliateJoinedAt ? formatDate(c.affiliateJoinedAt) : "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Chưa có khách hàng nào được liên kết</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/affiliate/customers" />
    </div>
  );
}
