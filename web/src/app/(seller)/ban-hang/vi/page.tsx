import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { getSellerTierConfig } from "@/lib/services/seller.service";
import { getSellerBankChangeRequests } from "@/lib/services/bank-change-request.service";
import { SELLER_ESCROW_MINIMUM } from "@/lib/services/wallet.service";
import { decrypt } from "@/lib/security/encryption";
import {
  Wallet, TrendingUp, ArrowDownToLine, Clock, Lock, PackageX,
  ReceiptText, Banknote, History, ArrowUpRight, Shield, CheckCircle2,
} from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import WalletTabsNav from "./_components/WalletTabsNav";
import EscrowDepositForm from "./_components/EscrowDepositForm";
import WithdrawalForm from "../../rut-tien/WithdrawalForm";
import BankChangeRequestForm from "../../rut-tien/BankChangeRequestForm";

export const metadata: Metadata = { title: "Ví Seller" };

type WdRecord = {
  id: string;
  amount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  status: string;
  rejectReason: string | null;
  createdAt: Date;
  qualifyingOrderIds: Prisma.JsonValue;
};

type TxRecord = {
  id: string;
  type: string;
  amount: Prisma.Decimal;
  description: string;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  createdAt: Date;
};

type QualifyingOrderRow = {
  id: string; order_code: string; item_name: string;
  final_price: string; original_price: string; created_at: Date;
};

type FrozenOrderRow = {
  id: string; order_code: string; item_name: string;
  final_price: string; created_at: Date;
};

type ShopRow = { shop_locked: boolean };
type QualifyingSum = { total: string };

const WD_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Chờ duyệt", cls: "text-amber-600" },
  APPROVED:  { label: "Đã duyệt",  cls: "text-blue-600" },
  COMPLETED: { label: "Đã chuyển", cls: "text-emerald-600" },
  REJECTED:  { label: "Từ chối",   cls: "text-red-500" },
};

const TX_LABELS: Record<string, string> = {
  SELLER_PAYOUT:        "Doanh thu đơn hàng",
  WITHDRAWAL_FEE:       "Rút tiền (sau phí)",
  ADMIN_ADJUSTMENT:     "Điều chỉnh từ Admin",
  COMPLAINT_DEDUCTION:  "Khấu trừ khiếu nại",
  SELLER_REGISTRATION:  "Phí đăng ký bán hàng",
  SELLER_SLOT_PURCHASE: "Mua thêm slot sản phẩm",
  ESCROW_DEPOSIT:       "Nạp ký quỹ",
};

const TX_IS_CREDIT: Record<string, boolean> = {
  SELLER_PAYOUT:        true,
  ADMIN_ADJUSTMENT:     true,
  WITHDRAWAL_FEE:       false,
  COMPLAINT_DEDUCTION:  false,
  SELLER_REGISTRATION:  false,
  SELLER_SLOT_PURCHASE: false,
  ESCROW_DEPOSIT:       false,
};

export default async function ViSellerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "overview" } = await searchParams;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  // ── Luôn fetch ──
  const sellerRow = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      balance: true, sellerTier: true, sellerEscrow: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
    },
  });

  const tierCfg = await getSellerTierConfig(sellerRow?.sellerTier ?? "STANDARD");
  const holdDays  = tierCfg.hold_days;
  const feePercent = tierCfg.fee_percent;
  const minAmount  = tierCfg.min_withdrawal;
  const holdDate   = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000);
  const userBalance   = Number(sellerRow?.balance ?? 0);
  const sellerEscrow  = Number(sellerRow?.sellerEscrow ?? 0);
  const escrowMet     = sellerEscrow >= SELLER_ESCROW_MINIMUM;

  const [qualifyingSumRows, pendingWithdrawal] = await Promise.all([
    prisma.$queryRaw<QualifyingSum[]>`
      SELECT COALESCE(SUM(final_price), 0)::text AS total FROM orders
      WHERE seller_id = ${me.id} AND status = 'DONE' AND withdrawn = false AND created_at < ${holdDate}
    `,
    prisma.sellerWithdrawal.findFirst({
      where: { sellerId: me.id, status: "PENDING" },
      select: { id: true, amount: true, createdAt: true, qualifyingOrderIds: true },
    }),
  ]);

  const qualifyingGross = Number(qualifyingSumRows[0]?.total ?? 0);
  const qualifyingFee   = Math.floor(qualifyingGross * feePercent / 100);
  const qualifyingNet   = qualifyingGross - qualifyingFee;

  // ── Overview tab ──
  let totalRevenue  = 0;
  let totalWithdrawn = 0;

  if (tab === "overview") {
    const [revenueAgg, withdrawnAgg] = await Promise.all([
      prisma.order.aggregate({ where: { sellerId: me.id, status: "DONE" }, _sum: { finalPrice: true } }),
      prisma.sellerWithdrawal.aggregate({
        where: { sellerId: me.id, status: { in: ["APPROVED", "COMPLETED"] } },
        _sum: { amount: true },
      }),
    ]);
    totalRevenue   = Number(revenueAgg._sum.finalPrice ?? 0);
    totalWithdrawn = Number(withdrawnAgg._sum.amount ?? 0);
  }

  // ── Withdraw tab ──
  let qualifyingRaw: QualifyingOrderRow[] = [];
  let frozenRaw: FrozenOrderRow[]         = [];
  let shopLocked                          = false;
  let withdrawalHistory: WdRecord[]       = [];
  let currentBankName: string | null          = null;
  let currentBankAccountNumber: string | null = null;
  let currentBankAccountHolder: string | null = null;
  let bankChangeRequests: Awaited<ReturnType<typeof getSellerBankChangeRequests>> = [];

  if (tab === "withdraw") {
    const [qualRaw, frzRaw, shopRows, wdHistory, bcr] = await Promise.all([
      prisma.$queryRaw<QualifyingOrderRow[]>`
        SELECT id, order_code, item_name, final_price, original_price, created_at FROM orders
        WHERE seller_id = ${me.id} AND status = 'DONE' AND withdrawn = false AND created_at < ${holdDate}
        ORDER BY created_at DESC
      `,
      prisma.$queryRaw<FrozenOrderRow[]>`
        SELECT id, order_code, item_name, final_price, created_at FROM orders
        WHERE seller_id = ${me.id} AND status = 'FROZEN' ORDER BY created_at DESC
      `,
      prisma.$queryRaw<ShopRow[]>`SELECT shop_locked FROM users WHERE id = ${me.id}`,
      prisma.sellerWithdrawal.findMany({
        where: { sellerId: me.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, amount: true, netAmount: true, feeAmount: true,
          status: true, rejectReason: true, createdAt: true, qualifyingOrderIds: true,
        },
      }),
      getSellerBankChangeRequests(me.id),
    ]);

    qualifyingRaw     = qualRaw;
    frozenRaw         = frzRaw;
    shopLocked        = shopRows[0]?.shop_locked ?? false;
    withdrawalHistory = wdHistory;
    bankChangeRequests = bcr;

    currentBankName          = sellerRow?.bankNameEnc          ? decrypt(sellerRow.bankNameEnc          as unknown as Buffer) : null;
    currentBankAccountNumber = sellerRow?.bankAccountNumberEnc ? decrypt(sellerRow.bankAccountNumberEnc as unknown as Buffer) : null;
    currentBankAccountHolder = sellerRow?.bankAccountHolderEnc ? decrypt(sellerRow.bankAccountHolderEnc as unknown as Buffer) : null;
  }
  const hasBankInfo = !!(currentBankName && currentBankAccountNumber && currentBankAccountHolder);

  // ── History tab ──
  let fullWithdrawalHistory: WdRecord[] = [];
  let txHistory: TxRecord[]             = [];

  if (tab === "history") {
    const [wdAll, txAll] = await Promise.all([
      prisma.sellerWithdrawal.findMany({
        where: { sellerId: me.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, amount: true, netAmount: true, feeAmount: true,
          status: true, rejectReason: true, createdAt: true, qualifyingOrderIds: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: me.id,
          type: {
            in: [
              "SELLER_PAYOUT", "WITHDRAWAL_FEE", "ADMIN_ADJUSTMENT",
              "COMPLAINT_DEDUCTION", "SELLER_REGISTRATION", "SELLER_SLOT_PURCHASE",
              "ESCROW_DEPOSIT",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, type: true, amount: true, description: true,
          balanceBefore: true, balanceAfter: true, createdAt: true,
        },
      }),
    ]);
    fullWithdrawalHistory = wdAll;
    txHistory             = txAll;
  }

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="withdrawal" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <WalletTabsNav active={tab} />

        {/* ── Tổng quan ── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { Icon: Wallet,          label: "Số dư ví",       value: formatVnd(userBalance),    sub: "Hiện tại trong ví",       valueColor: "text-violet-600",  iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
                { Icon: ArrowDownToLine, label: "Có thể rút",     value: formatVnd(qualifyingNet),  sub: `Sau phí ${feePercent}%`,  valueColor: "text-emerald-600", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
                { Icon: Banknote,        label: "Đã rút",         value: formatVnd(totalWithdrawn), sub: "Tổng đã được duyệt",      valueColor: "text-gray-700",    iconBg: "bg-gray-100",   iconColor: "text-gray-500" },
                { Icon: TrendingUp,      label: "Tổng doanh thu", value: formatVnd(totalRevenue),   sub: "Đơn hoàn thành",          valueColor: "text-blue-600",    iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
              ] as const).map(({ Icon, label, value, sub, valueColor, iconBg, iconColor }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <Icon size={15} className={iconColor} />
                    </div>
                    <span className="text-[11px] text-gray-500">{label}</span>
                  </div>
                  <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Escrow status */}
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${escrowMet ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${escrowMet ? "bg-emerald-100" : "bg-amber-100"}`}>
                {escrowMet
                  ? <CheckCircle2 size={16} className="text-emerald-600" />
                  : <Shield size={16} className="text-amber-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${escrowMet ? "text-emerald-700" : "text-amber-700"}`}>
                  Ký quỹ: {formatVnd(sellerEscrow)}
                  {escrowMet ? " ✓" : ` / ${formatVnd(SELLER_ESCROW_MINIMUM)} tối thiểu`}
                </p>
                <p className={`text-xs mt-0.5 ${escrowMet ? "text-emerald-600" : "text-amber-600"}`}>
                  {escrowMet
                    ? "Đủ điều kiện rút tiền bán hàng."
                    : `Cần nạp thêm ${formatVnd(SELLER_ESCROW_MINIMUM - sellerEscrow)} để được rút tiền.`
                  }
                </p>
              </div>
              {!escrowMet && (
                <Link href="/ban-hang/vi?tab=escrow" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">
                  Nạp ngay →
                </Link>
              )}
            </div>

            {pendingWithdrawal && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700">Có yêu cầu rút tiền đang chờ duyệt</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {formatVnd(Number(pendingWithdrawal.amount))} — gửi lúc {formatDate(pendingWithdrawal.createdAt)}
                  </p>
                </div>
                <Link href="/ban-hang/vi?tab=history" className="shrink-0 text-xs font-medium text-amber-700 hover:underline">
                  Xem →
                </Link>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href="/ban-hang/vi?tab=withdraw"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                <ArrowDownToLine size={15} /> Rút tiền
              </Link>
              <Link
                href="/ban-hang/vi?tab=history"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <History size={15} /> Lịch sử giao dịch
              </Link>
            </div>
          </div>
        )}

        {/* ── Ký quỹ ── */}
        {tab === "escrow" && (
          <div className="space-y-6">
            {/* Status card */}
            <div className={`rounded-2xl border p-5 ${escrowMet ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${escrowMet ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {escrowMet
                    ? <CheckCircle2 size={20} className="text-emerald-600" />
                    : <Shield size={20} className="text-amber-600" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-bold ${escrowMet ? "text-emerald-700" : "text-amber-700"}`}>
                    {escrowMet ? "Đủ điều kiện rút tiền" : "Chưa đủ ký quỹ tối thiểu"}
                  </p>
                  <p className={`text-xs mt-0.5 ${escrowMet ? "text-emerald-600" : "text-amber-600"}`}>
                    {escrowMet
                      ? "Ký quỹ của bạn đã đáp ứng yêu cầu tối thiểu."
                      : `Cần thêm ${formatVnd(SELLER_ESCROW_MINIMUM - sellerEscrow)} để đủ điều kiện.`
                    }
                  </p>
                </div>
              </div>

              {/* Escrow progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Ký quỹ hiện tại</span>
                  <span className={escrowMet ? "text-emerald-700" : "text-amber-700"}>
                    {formatVnd(sellerEscrow)} / {formatVnd(SELLER_ESCROW_MINIMUM)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${escrowMet ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, (sellerEscrow / SELLER_ESCROW_MINIMUM) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-sm">Ký quỹ là gì?</p>
              <p>Ký quỹ là khoản tiền bạn gửi vào hệ thống để đảm bảo hoạt động bán hàng nghiêm túc và tin cậy.</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Cần ít nhất <strong>{formatVnd(SELLER_ESCROW_MINIMUM)}</strong> để được rút tiền bán hàng.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Tiền ký quỹ tách biệt hoàn toàn khỏi số dư mua hàng.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Tiền ký quỹ <strong>không thể rút lại</strong> — chỉ có thể nạp thêm.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Số dư ví hiện tại: <strong>{formatVnd(userBalance)}</strong></li>
              </ul>
            </div>

            {/* Deposit form */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={15} className="text-violet-600" /> Nạp ký quỹ
              </h2>
              <EscrowDepositForm
                currentEscrow={sellerEscrow}
                userBalance={userBalance}
                escrowMinimum={SELLER_ESCROW_MINIMUM}
              />
            </div>
          </div>
        )}

        {/* ── Rút tiền ── */}
        {tab === "withdraw" && (
          <div className="space-y-6">
            {shopLocked && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Gian hàng đang bị khóa</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Bạn không thể rút tiền khi shop bị khóa. Vui lòng mở khóa gian hàng tại{" "}
                    <Link href="/ban-hang" className="underline font-medium">Quản lý bán hàng</Link> trước.
                  </p>
                </div>
              </div>
            )}

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

            {frozenRaw.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-red-100">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <PackageX size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700">{frozenRaw.length} đơn hàng bị đóng băng</p>
                    <p className="text-[11px] text-red-500 mt-0.5">Các đơn này bị đóng băng do khiếu nại và không thể rút tiền</p>
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

            <BankChangeRequestForm
              currentBankName={currentBankName}
              currentBankAccountNumber={currentBankAccountNumber}
              currentBankAccountHolder={currentBankAccountHolder}
              recentRequests={bankChangeRequests}
            />

            {withdrawalHistory.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ReceiptText size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-800">Lịch sử rút tiền</h2>
                </div>
                {withdrawalHistory.map((w, i) => (
                  <div
                    key={w.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium">
                        Rút {formatVnd(Number(w.amount))}
                        <span className="text-[11px] text-gray-400 font-normal ml-2">
                          ({(w.qualifyingOrderIds as string[]).length} đơn)
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Thực nhận: {formatVnd(Number(w.netAmount))} · Phí: {formatVnd(Number(w.feeAmount))}
                      </p>
                      {w.rejectReason && <p className="text-[11px] text-red-500">Lý do từ chối: {w.rejectReason}</p>}
                      <p className="text-[11px] text-gray-400">{formatDate(w.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${WD_STYLES[w.status]?.cls ?? "text-gray-500"}`}>
                      {WD_STYLES[w.status]?.label ?? w.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Lịch sử ── */}
        {tab === "history" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-800">Yêu cầu rút tiền</h2>
                </div>
                <span className="text-[11px] text-gray-400">{fullWithdrawalHistory.length} gần nhất</span>
              </div>
              {fullWithdrawalHistory.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">Chưa có yêu cầu rút tiền nào</div>
              ) : (
                fullWithdrawalHistory.map((w, i) => (
                  <div
                    key={w.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium">
                        Rút {formatVnd(Number(w.amount))}
                        <span className="text-[11px] text-gray-400 font-normal ml-2">
                          ({(w.qualifyingOrderIds as string[]).length} đơn)
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Thực nhận: {formatVnd(Number(w.netAmount))} · Phí: {formatVnd(Number(w.feeAmount))}
                      </p>
                      {w.rejectReason && <p className="text-[11px] text-red-500">Từ chối: {w.rejectReason}</p>}
                      <p className="text-[11px] text-gray-400">{formatDate(w.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${WD_STYLES[w.status]?.cls ?? "text-gray-500"}`}>
                      {WD_STYLES[w.status]?.label ?? w.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-800">Giao dịch tài chính</h2>
                </div>
                <span className="text-[11px] text-gray-400">{txHistory.length} gần nhất</span>
              </div>
              {txHistory.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">Chưa có giao dịch nào</div>
              ) : (
                txHistory.map((tx, i) => {
                  const isCredit = TX_IS_CREDIT[tx.type] ?? true;
                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-50" : "bg-red-50"}`}>
                        <ArrowUpRight
                          size={14}
                          className={`${isCredit ? "text-emerald-600" : "text-red-500"} ${isCredit ? "" : "rotate-180"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{TX_LABELS[tx.type] ?? tx.type}</p>
                        {tx.description && <p className="text-[11px] text-gray-400 truncate">{tx.description}</p>}
                        <p className="text-[11px] text-gray-400">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                          {isCredit ? "+" : "-"}{formatVnd(Number(tx.amount))}
                        </p>
                        <p className="text-[10px] text-gray-400">Số dư: {formatVnd(Number(tx.balanceAfter))}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
