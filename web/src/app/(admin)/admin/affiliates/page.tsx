import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import GrantAffiliateForm from "./_components/GrantAffiliateForm";
import CreateRuleForm from "./_components/CreateRuleForm";
import RuleActions from "./_components/RuleActions";

const PAGE_SIZE = 20;

const ORDER_TYPE_LABEL: Record<string, string> = {
  SERVICE: "Dịch vụ",
  COURSE: "Khóa học",
  TUTTRICK: "Tut / Tricks",
  MMO_PRODUCT: "Tài nguyên MMO",
  SELLER_PRODUCT: "Sản phẩm Seller",
  KHUONGFB_PRODUCT: "Sản phẩm Khuongfb",
};

function TabNav({ tab }: { tab: "list" | "rules" }) {
  const base = "px-4 py-2 text-sm font-medium border-b-2 -mb-px";
  const active = "border-violet-600 text-violet-700";
  const idle = "border-transparent text-gray-500 hover:text-gray-700";
  return (
    <div className="flex gap-2 border-b border-gray-200">
      <Link href="/admin/affiliates" className={`${base} ${tab === "list" ? active : idle}`}>
        Danh sách
      </Link>
      <Link href="/admin/affiliates?tab=rules" className={`${base} ${tab === "rules" ? active : idle}`}>
        % Hoa hồng
      </Link>
    </div>
  );
}

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab: "list" | "rules" = sp.tab === "rules" ? "rules" : "list";

  if (tab === "rules") {
    const rules = await prisma.affiliateCommissionRule.findMany({
      include: { affiliate: { select: { fullName: true, email: true, affiliateCode: true } } },
      orderBy: [{ affiliateId: "asc" }, { orderType: "asc" }, { createdAt: "desc" }],
    });

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Quản lý Affiliate</h1>
        <TabNav tab={tab} />

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Tạo rule % hoa hồng mới</h2>
          <CreateRuleForm />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Áp dụng cho</th>
                <th className="px-4 py-3">Loại sản phẩm</th>
                <th className="px-4 py-3">% hoa hồng</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    {r.affiliate ? (
                      <>
                        {r.affiliate.fullName}{" "}
                        <span className="text-xs text-gray-400 font-mono">({r.affiliate.affiliateCode})</span>
                      </>
                    ) : (
                      <span className="italic text-gray-500">Mặc định toàn hệ thống</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.orderType ? ORDER_TYPE_LABEL[r.orderType] ?? r.orderType : <span className="italic text-gray-500">Tất cả</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-violet-600">{Number(r.commissionPercent)}%</td>
                  <td className="px-4 py-3">{r.priority}</td>
                  <td className="px-4 py-3">
                    <span className={r.isActive ? "text-green-600" : "text-gray-400"}>
                      {r.isActive ? "Đang bật" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RuleActions ruleId={r.id} isActive={r.isActive} />
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Chưa có rule hoa hồng nào — cần tạo ít nhất 1 rule mặc định để hệ thống tính hoa hồng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── tab === "list" ────────────────────────────────────────────────
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const where = { isAffiliate: true };

  const pendingBankRequests = await prisma.bankChangeRequest.findMany({
    where: { status: "PENDING", seller: { isAffiliate: true } },
    select: { sellerId: true },
  });
  const pendingBankAffiliateIds = new Set(pendingBankRequests.map((r) => r.sellerId));

  const allAffiliateIds = await prisma.user.findMany({
    where,
    select: { id: true },
    orderBy: { affiliateJoinedAt: "desc" },
  });
  // Chờ duyệt STK lên đầu — sắp xếp ổn định nên vẫn giữ thứ tự ngày cấp trong từng nhóm
  const sortedIds = [...allAffiliateIds.map((a) => a.id)].sort((a, b) => {
    const aPending = pendingBankAffiliateIds.has(a) ? 0 : 1;
    const bPending = pendingBankAffiliateIds.has(b) ? 0 : 1;
    return aPending - bPending;
  });
  const total = sortedIds.length;
  const pageIds = sortedIds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const affiliatesRows = await prisma.user.findMany({
    where: { id: { in: pageIds } },
    select: {
      id: true, fullName: true, email: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
      _count: { select: { referredUsers: true, affiliateCommissionsEarned: true } },
    },
  });
  const affiliateRowById = new Map(affiliatesRows.map((a) => [a.id, a]));
  const affiliates = pageIds.map((id) => affiliateRowById.get(id)!);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Quản lý Affiliate</h1>
      <TabNav tab={tab} />

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
              <th className="px-4 py-3">Duyệt số tài khoản</th>
              <th className="px-4 py-3">Ngày cấp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {affiliates.map((a) => {
              const hasBankInfo = !!(a.bankNameEnc && a.bankAccountNumberEnc && a.bankAccountHolderEnc);
              const bankPending = pendingBankAffiliateIds.has(a.id);
              const bankStatusLabel = bankPending ? "Chờ duyệt" : hasBankInfo ? "Đã duyệt" : "Chưa có STK";
              const bankStatusColor = bankPending
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : hasBankInfo
                  ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                  : "text-gray-400 bg-gray-50 border-gray-200";

              return (
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
                  <td className="px-4 py-3">
                    <Link href={`/admin/affiliates/${a.id}`}>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bankStatusColor}`}>
                        {bankStatusLabel}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.affiliateJoinedAt ? formatDate(a.affiliateJoinedAt) : "—"}</td>
                </tr>
              );
            })}
            {affiliates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có Affiliate nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/admin/affiliates" />
    </div>
  );
}
