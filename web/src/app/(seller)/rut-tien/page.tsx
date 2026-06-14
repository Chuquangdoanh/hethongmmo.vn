import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { getSellerTierConfig } from "@/lib/services/seller.service";
import {
  ArrowDownToLine, Lock, Clock, TrendingUp, Wallet,
  ReceiptText, AlertTriangle, PackageX,
} from "lucide-react";
import WithdrawalForm from "./WithdrawalForm";
import BankChangeRequestForm from "./BankChangeRequestForm";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import { decrypt } from "@/lib/security/encryption";
import { getSellerBankChangeRequests } from "@/lib/services/bank-change-request.service";

export const metadata: Metadata = { title: "Rút tiền" };

export default async function RutTienPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const sellerRow = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      sellerTier:           true,
      bankNameEnc:          true,
      bankAccountNumberEnc: true,
      bankAccountHolderEnc: true,
    },
  });

  const tierCfg = await getSellerTierConfig(sellerRow?.sellerTier ?? "STANDARD");
  const holdDays = tierCfg.hold_days;
  const feePercent = tierCfg.fee_percent;
  const minAmount = tierCfg.min_withdrawal;

  // eslint-disable-next-line react-hooks/purity
  const holdDate = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000);

  type ShopRow = { shop_locked: boolean };
  const shopRows = await prisma.$queryRaw<ShopRow[]>`SELECT shop_locked FROM users WHERE id = ${me.id}`;
  const shopLocked = shopRows[0]?.shop_locked ?? false;

  type QualifyingOrderRow = {
    id: string;
    order_code: string;
    item_name: string;
    final_price: string;
    original_price: string;
    created_at: Date;
  };

  type FrozenOrderRow = {
    id: string;
    order_code: string;
    item_name: string;
    final_price: string;
    created_at: Date;
  };

  const [qualifyingRaw, frozenRaw, withdrawals, pendingWithdrawal, statsAgg] = await Promise.all([
    prisma.$queryRaw<QualifyingOrderRow[]>`
      SELECT id, order_code, item_name, final_price, original_price, created_at
      FROM orders
      WHERE seller_id = ${me.id}
        AND status = 'DONE'
        AND withdrawn = false
        AND created_at < ${holdDate}
      ORDER BY created_at DESC
    `,
    prisma.$queryRaw<FrozenOrderRow[]>`
      SELECT id, order_code, item_name, final_price, created_at
      FROM orders
      WHERE seller_id = ${me.id}
        AND status = 'FROZEN'
      ORDER BY created_at DESC
    `,
    prisma.sellerWithdrawal.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, amount: true, netAmount: true, feeAmount: true,
        status: true, rejectReason: true, createdAt: true,
        qualifyingOrderIds: true,
      },
    }),
    prisma.sellerWithdrawal.findFirst({
      where: { sellerId: me.id, status: "PENDING" },
      select: { id: true, amount: true, createdAt: true, qualifyingOrderIds: true },
    }),
    prisma.order.aggregate({
      where: { sellerId: me.id, status: "DONE" },
      _sum: { finalPrice: true },
    }),
  ]);

  const totalRevenue = Number(statsAgg._sum.finalPrice ?? 0);

  const qualifyingTotal = qualifyingRaw.reduce(
    (sum, o) => sum + Number(o.final_price ?? o.original_price),
    0,
  );
  const qualifyingFee = Math.floor(qualifyingTotal * feePercent / 100);
  const qualifyingNet = qualifyingTotal - qualifyingFee;

  const STATUS_STYLES: Record<string, string> = {
    PENDING:   "text-amber-600",
    APPROVED:  "text-emerald-600",
    COMPLETED: "text-violet-600",
    REJECTED:  "text-red-500",
  };
  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Chờ duyệt", APPROVED: "Đã duyệt",
    COMPLETED: "Đã chuyển", REJECTED: "Từ chối",
  };

  const totalWithdrawnAgg = await prisma.sellerWithdrawal.aggregate({
    where: { sellerId: me.id, status: { in: ["APPROVED", "COMPLETED"] } },
    _sum: { amount: true },
  });
  const totalWithdrawn = Number(totalWithdrawnAgg._sum.amount ?? 0);

  const currentBankName          = sellerRow?.bankNameEnc          ? decrypt(sellerRow.bankNameEnc          as unknown as Buffer) : null;
  const currentBankAccountNumber = sellerRow?.bankAccountNumberEnc ? decrypt(sellerRow.bankAccountNumberEnc as unknown as Buffer) : null;
  const currentBankAccountHolder = sellerRow?.bankAccountHolderEnc ? decrypt(sellerRow.bankAccountHolderEnc as unknown as Buffer) : null;
  const hasBankInfo = !!(currentBankName && currentBankAccountNumber && currentBankAccountHolder);

  const bankChangeRequests = await getSellerBankChangeRequests(me.id);

  const STATS = [
    {
      Icon: TrendingUp,       label: "Doanh số bán hàng",
      value: formatVnd(totalRevenue),
      sub: "Tổng đơn hoàn thành",
      valueColor: "text-violet-600", iconBg: "bg-purple-50", iconColor: "text-purple-600",
    },
    {
      Icon: ArrowDownToLine,  label: "Đã rút",
      value: formatVnd(totalWithdrawn),
      sub: "Đã được duyệt",
      valueColor: "text-gray-700", iconBg: "bg-gray-100", iconColor: "text-gray-500",
    },
    {
      Icon: Wallet,           label: "Có thể rút",
      value: formatVnd(qualifyingNet),
      sub: `Sau phí ${feePercent}%`,
      valueColor: "text-emerald-600", iconBg: "bg-emerald-50", iconColor: "text-emerald-600",
    },
  ];

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="withdrawal" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <ArrowDownToLine size={17} className="text-violet-600" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Rút tiền</h1>
              {tierCfg.label && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-violet-100 text-violet-700">
                  {tierCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Shop locked notice */}
          {shopLocked && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Lock size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">Gian hàng đang bị khóa</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Bạn không thể rút tiền khi shop bị khóa. Vui lòng mở khóa gian hàng tại trang{" "}
                  <a href="/ban-hang" className="underline font-medium">Quản lý bán hàng</a> trước.
                </p>
              </div>
            </div>
          )}

          {/* Revenue stats */}
          <div className="grid grid-cols-3 gap-3">
            {STATS.map(({ Icon, label, value, sub, valueColor, iconBg, iconColor }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon size={15} className={iconColor} />
                  </div>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
                <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Pending withdrawal notice */}
          {pendingWithdrawal && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700">Đang chờ duyệt</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Yêu cầu rút {formatVnd(Number(pendingWithdrawal.amount))} gửi lúc {formatDate(pendingWithdrawal.createdAt)} đang được xử lý.
                  Bạn không thể gửi yêu cầu mới cho đến khi yêu cầu này được duyệt hoặc từ chối.
                </p>
              </div>
            </div>
          )}

          {/* Frozen orders warning */}
          {frozenRaw.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-red-100">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <PackageX size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {frozenRaw.length} đơn hàng bị đóng băng
                  </p>
                  <p className="text-[11px] text-red-500 mt-0.5">
                    Các đơn này bị đóng băng do khiếu nại và không thể rút tiền
                  </p>
                </div>
              </div>
              <div className="divide-y divide-red-100">
                {frozenRaw.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-red-800 truncate">{o.item_name}</p>
                      <p className="text-[11px] text-red-400">#{o.order_code} · {formatDate(o.created_at)}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-600 shrink-0 ml-3 line-through">
                      {formatVnd(Number(o.final_price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Withdrawal form */}
          {!pendingWithdrawal && !shopLocked && (
            <WithdrawalForm
              qualifyingOrders={qualifyingRaw.map((o) => ({
                id: o.id,
                orderCode: o.order_code,
                itemName: o.item_name,
                price: Number(o.final_price ?? o.original_price),
                createdAt: formatDate(o.created_at),
              }))}
              feePercent={feePercent}
              minAmount={minAmount}
              holdDays={holdDays}
              hasBankInfo={hasBankInfo}
            />
          )}

          {/* Bank info & change request */}
          <BankChangeRequestForm
            currentBankName={currentBankName}
            currentBankAccountNumber={currentBankAccountNumber}
            currentBankAccountHolder={currentBankAccountHolder}
            recentRequests={bankChangeRequests}
          />

          {/* History */}
          {withdrawals.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <ReceiptText size={15} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Lịch sử rút tiền</h2>
              </div>
              {withdrawals.map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">
                      Rút {formatVnd(Number(w.amount))}
                      <span className="text-[11px] text-gray-400 font-normal ml-2">
                        ({(w.qualifyingOrderIds as string[]).length} đơn hàng)
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Thực nhận: {formatVnd(Number(w.netAmount))} · Phí: {formatVnd(Number(w.feeAmount))}
                    </p>
                    {w.rejectReason && (
                      <p className="text-[11px] text-red-500">Lý do: {w.rejectReason}</p>
                    )}
                    <p className="text-[11px] text-gray-400">{formatDate(w.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold ${STATUS_STYLES[w.status] ?? "text-gray-500"}`}>
                    {STATUS_LABELS[w.status] ?? w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
