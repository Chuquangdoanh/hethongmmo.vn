import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import RequestWithdrawalForm from "./_components/RequestWithdrawalForm";
import BankChangeRequestForm from "@/components/shared/BankChangeRequestForm";
import { affiliateWithdrawalHoldCutoff, getAffiliateWithdrawalSettings } from "@/lib/services/affiliate-withdrawal.service";
import { getSellerBankChangeRequests } from "@/lib/services/bank-change-request.service";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  COMPLETED: "Hoàn thành",
};

export default async function AffiliateWithdrawalsPage() {
  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const settings = await getAffiliateWithdrawalSettings();
  const holdCutoff = affiliateWithdrawalHoldCutoff(settings.hold_days);

  const [qualifying, onHoldCount, withdrawals, meRow, bankChangeRequests] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where: {
        affiliateId: me.id, status: "APPROVED", withdrawn: false,
        order: { createdAt: { lte: holdCutoff } },
      },
      include: { customer: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.affiliateCommission.count({
      where: {
        affiliateId: me.id, status: "APPROVED", withdrawn: false,
        order: { createdAt: { gt: holdCutoff } },
      },
    }),
    prisma.affiliateWithdrawal.findMany({
      where: { affiliateId: me.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.user.findUnique({
      where: { id: me.id },
      select: { bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true },
    }),
    getSellerBankChangeRequests(me.id),
  ]);

  const currentBankName          = meRow?.bankNameEnc          ? decrypt(meRow.bankNameEnc          as unknown as Buffer) : null;
  const currentBankAccountNumber = meRow?.bankAccountNumberEnc ? decrypt(meRow.bankAccountNumberEnc as unknown as Buffer) : null;
  const currentBankAccountHolder = meRow?.bankAccountHolderEnc ? decrypt(meRow.bankAccountHolderEnc as unknown as Buffer) : null;
  const hasBankInfo = !!(currentBankName && currentBankAccountNumber && currentBankAccountHolder);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Rút hoa hồng</h1>

      <BankChangeRequestForm
        currentBankName={currentBankName}
        currentBankAccountNumber={currentBankAccountNumber}
        currentBankAccountHolder={currentBankAccountHolder}
        recentRequests={bankChangeRequests}
        apiEndpoint="/api/affiliate/bank-change-request"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Hoa hồng đủ điều kiện rút</h2>
        <p className="text-xs text-gray-400 mb-3">
          Hoa hồng chỉ đủ điều kiện rút sau khi đơn hàng phát sinh trên {settings.hold_days} ngày.
          {onHoldCount > 0 && ` Hiện có ${onHoldCount} khoản đang trong thời gian giữ, chưa thể rút.`}
          {settings.withdrawal_fee_percent > 0 && ` Phí rút: ${settings.withdrawal_fee_percent}%.`}
          {settings.min_withdrawal_amount > 0 && ` Số tiền rút tối thiểu: ${formatVnd(settings.min_withdrawal_amount)}.`}
        </p>
        <RequestWithdrawalForm
          commissions={qualifying.map((c) => ({ id: c.id, amount: Number(c.amount), customerName: c.customer.fullName }))}
          feePercent={settings.withdrawal_fee_percent}
          minAmount={settings.min_withdrawal_amount}
          hasBankInfo={hasBankInfo}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày yêu cầu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3 font-medium">{formatVnd(Number(w.netAmount))}</td>
                <td className="px-4 py-3">{STATUS_LABEL[w.status]}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(w.createdAt)}</td>
              </tr>
            ))}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Chưa có yêu cầu rút tiền nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
