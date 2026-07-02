import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { buildReferralLink, getAffiliateStats } from "@/lib/services/affiliate.service";
import { APP_URL } from "@/config/env";
import { formatVnd } from "@/lib/utils/format";
import CopyButton from "@/components/shared/CopyButton";

type AffiliateStats = Awaited<ReturnType<typeof getAffiliateStats>>;

const STAT_LABELS: Array<{ key: keyof AffiliateStats; label: string; isMoney: boolean }> = [
  { key: "totalClicks", label: "Tổng lượt click", isMoney: false },
  { key: "totalCustomers", label: "Khách hàng đã liên kết", isMoney: false },
  { key: "totalOrders", label: "Tổng số đơn hàng", isMoney: false },
  { key: "totalRevenue", label: "Tổng doanh thu mang về", isMoney: true },
  { key: "commissionPending", label: "Hoa hồng chờ duyệt", isMoney: true },
  { key: "commissionApproved", label: "Hoa hồng đã duyệt", isMoney: true },
];

export default async function AffiliateDashboardPage() {
  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { isAffiliate: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true },
  });

  if (!user?.isAffiliate || !user.affiliateCode) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Bạn chưa được cấp quyền Affiliate</h1>
        <p className="mt-2 text-sm text-gray-500">Liên hệ Admin để được cấp link giới thiệu và bắt đầu nhận hoa hồng.</p>
      </div>
    );
  }

  const referralLink = buildReferralLink(user.affiliateCode, APP_URL);
  const qrDataUrl = await QRCode.toDataURL(referralLink);
  const stats = await getAffiliateStats(me.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
        <p className="text-sm text-gray-500">
          Mã: <span className="font-mono">{user.affiliateCode}</span> — Trạng thái:{" "}
          <span className={user.affiliateStatus === "ACTIVE" ? "text-green-600" : "text-red-600"}>
            {user.affiliateStatus === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
        <Image src={qrDataUrl} alt="QR code affiliate" width={140} height={140} className="rounded-lg border" unoptimized />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-700">Link giới thiệu của bạn</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800">{referralLink}</code>
            <CopyButton text={referralLink} />
          </div>
          <p className="text-xs text-gray-400">Khách hàng chỉ cần truy cập link này 1 lần — hệ thống sẽ tự động gắn vĩnh viễn.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STAT_LABELS.map(({ key, label, isMoney }) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {isMoney ? formatVnd(stats[key]) : stats[key].toLocaleString("vi-VN")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/affiliate/customers" className="text-sm font-medium text-violet-600 hover:underline">
          Danh sách khách hàng →
        </Link>
        <Link href="/affiliate/commissions" className="text-sm font-medium text-violet-600 hover:underline">
          Lịch sử hoa hồng →
        </Link>
        <Link href="/affiliate/withdrawals" className="text-sm font-medium text-violet-600 hover:underline">
          Rút hoa hồng →
        </Link>
      </div>
    </div>
  );
}
