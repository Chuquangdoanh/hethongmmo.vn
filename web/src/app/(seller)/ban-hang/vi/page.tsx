import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { getSellerTierConfig } from "@/lib/services/seller.service";
import { SELLER_ESCROW_MINIMUM } from "@/lib/services/wallet.service";
import {
  Shield, CheckCircle2, ReceiptText, ArrowDownToLine, ArrowUpRight,
} from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import EscrowDepositForm from "./_components/EscrowDepositForm";

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

const TABS = [
  { key: "escrow",  label: "Ký quỹ" },
  { key: "history", label: "Lịch sử" },
];

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
  const { tab = "escrow" } = await searchParams;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const sellerRow = await prisma.user.findUnique({
    where: { id: me.id },
    select: { balance: true, sellerTier: true, sellerEscrow: true },
  });

  const tierCfg     = await getSellerTierConfig(sellerRow?.sellerTier ?? "STANDARD");
  const userBalance = Number(sellerRow?.balance ?? 0);
  const sellerEscrow = Number(sellerRow?.sellerEscrow ?? 0);
  const escrowMet   = sellerEscrow >= SELLER_ESCROW_MINIMUM;

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

  const activeTab = TABS.some((t) => t.key === tab) ? tab : "escrow";

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="withdrawal" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">

        {/* Tab nav */}
        <div className="flex gap-0.5 mb-6 border-b border-gray-200">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/ban-hang/vi?tab=${key}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? "text-violet-700 border-violet-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ── Ký quỹ ── */}
        {activeTab === "escrow" && (
          <div className="space-y-6">
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

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-sm">Ký quỹ là gì?</p>
              <p>Ký quỹ là khoản tiền bạn gửi vào hệ thống để đảm bảo hoạt động bán hàng nghiêm túc và tin cậy.</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Cần ít nhất <strong>{formatVnd(SELLER_ESCROW_MINIMUM)}</strong> để được rút tiền bán hàng.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Tiền ký quỹ sẽ liên tục hoạt động trong thời gian bạn còn hoạt động bán hàng.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Tiền ký quỹ <strong>có thể rút lại</strong> — khi bạn không còn hoạt động bán hàng.</li>
                <li className="flex items-start gap-1.5"><span className="text-violet-500 mt-0.5">•</span> Đơn hàng khi không xử lý khiếu nại sẽ ảnh hưởng đến ký quỹ.</li>
              </ul>
            </div>

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

        {/* ── Lịch sử ── */}
        {activeTab === "history" && (
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
