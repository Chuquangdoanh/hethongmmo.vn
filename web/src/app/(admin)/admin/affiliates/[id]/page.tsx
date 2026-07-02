import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getAffiliateStats, buildReferralLink } from "@/lib/services/affiliate.service";
import { APP_URL } from "@/config/env";
import { formatVnd } from "@/lib/utils/format";
import AffiliateStatusToggle from "./_components/AffiliateStatusToggle";
import RevokeAffiliateButton from "./_components/RevokeAffiliateButton";
import ReassignCustomerForm from "./_components/ReassignCustomerForm";
import CustomerOrdersRow from "./_components/CustomerOrdersRow";

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const affiliate = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, email: true, phone: true,
      isAffiliate: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true,
      referredUsers: {
        select: {
          id: true, fullName: true, email: true, affiliateJoinedAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { affiliateJoinedAt: "desc" },
        take: 50,
      },
    },
  });
  if (!affiliate || !affiliate.isAffiliate) notFound();

  const stats = await getAffiliateStats(id);
  const referralLink = affiliate.affiliateCode ? buildReferralLink(affiliate.affiliateCode, APP_URL) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{affiliate.fullName}</h1>
          <p className="text-sm text-gray-500">{affiliate.email} — Mã: <span className="font-mono">{affiliate.affiliateCode}</span></p>
        </div>
        <div className="flex gap-2">
          <AffiliateStatusToggle affiliateId={affiliate.id} status={affiliate.affiliateStatus} />
          <RevokeAffiliateButton affiliateId={affiliate.id} />
        </div>
      </div>

      {referralLink && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Link giới thiệu</p>
          <code className="text-sm">{referralLink}</code>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Khách hàng</p>
          <p className="text-xl font-semibold">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tổng đơn hàng</p>
          <p className="text-xl font-semibold">{stats.totalOrders}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tổng doanh thu</p>
          <p className="text-xl font-semibold">{formatVnd(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Hoa hồng chờ duyệt</p>
          <p className="text-xl font-semibold text-amber-600">{formatVnd(stats.commissionPending)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Hoa hồng đã duyệt</p>
          <p className="text-xl font-semibold text-green-600">{formatVnd(stats.commissionApproved)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Chuyển / gỡ liên kết khách hàng</h2>
        <ReassignCustomerForm affiliateId={affiliate.id} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <p className="px-4 pt-4 text-xs text-gray-400">Bấm vào 1 khách hàng để xem chi tiết đơn hàng của khách đó.</p>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ngày liên kết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {affiliate.referredUsers.map((u) => (
              <CustomerOrdersRow
                key={u.id}
                affiliateId={affiliate.id}
                customerId={u.id}
                fullName={`${u.fullName} (${u._count.orders} đơn)`}
                email={u.email}
                joinedAt={u.affiliateJoinedAt ? u.affiliateJoinedAt.toISOString() : null}
              />
            ))}
            {affiliate.referredUsers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Chưa có khách hàng nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
