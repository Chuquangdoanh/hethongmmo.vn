import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  CreditCard, Wallet, TrendingUp, LayoutList, FileText,
  ArrowUp, ArrowDown,
} from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import UserProfileHero from "@/components/shared/UserProfileHero";

export const metadata: Metadata = { title: "Lịch sử giao dịch" };

const TX_TYPE_LABELS: Record<string, string> = {
  DEPOSIT_AUTO:        "Nạp tiền tự động",
  DEPOSIT_MANUAL:      "Nạp tiền thủ công",
  BUY_SERVICE:         "Mua dịch vụ",
  BUY_COURSE:          "Mua khóa học",
  BUY_TUTTRICK:        "Mua Tut/Trick",
  BUY_MMO_PRODUCT:     "Mua tài nguyên",
  BUY_SELLER_PRODUCT:  "Mua sản phẩm",
  REFUND:              "Hoàn tiền",
  SELLER_PAYOUT:       "Doanh thu bán hàng",
  WITHDRAWAL_FEE:      "Phí rút tiền",
  ADMIN_ADJUSTMENT:    "Hệ Thống MMO",
};

const PAGE_SIZE = 10;

export default async function LichSuGiaoDichPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const [user, lastDeposit, txs, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        fullName: true, email: true, role: true, uidPrefix: true,
        balance: true, totalDeposited: true, totalSpent: true, avatarUrl: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId: me.id, type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, type: true, amount: true, balanceBefore: true,
        balanceAfter: true, description: true, createdAt: true,
      },
    }),
    prisma.transaction.count({ where: { userId: me.id } }),
  ]);

  if (!user) redirect("/");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SUMMARY = [
    { label: "Tổng giao dịch", value: total.toLocaleString("vi-VN"),       Icon: LayoutList, color: "text-slate-700",   iconBg: "bg-slate-100",   iconColor: "text-slate-500"  },
    { label: "Trang hiện tại", value: `${currentPage} / ${totalPages}`,     Icon: FileText,   color: "text-slate-700",   iconBg: "bg-gray-100",    iconColor: "text-gray-500"   },
    { label: "Số dư hiện tại", value: formatVnd(Number(user.balance)),       Icon: Wallet,     color: "text-blue-600",    iconBg: "bg-blue-50",     iconColor: "text-blue-500"   },
    { label: "Tổng đã nạp",    value: formatVnd(Number(user.totalDeposited)),Icon: TrendingUp, color: "text-emerald-600", iconBg: "bg-emerald-50",  iconColor: "text-emerald-500"},
  ];

  return (
    <>
      <UserProfileHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        uidPrefix={user.uidPrefix}
        balance={Number(user.balance)}
        totalDeposited={Number(user.totalDeposited)}
        totalSpent={Number(user.totalSpent)}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="transactions"
        avatarUrl={user.avatarUrl ?? null}
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        {txs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <CreditCard size={24} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-500">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUMMARY.map(({ label, value, Icon, color, iconBg, iconColor }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <Icon size={13} className={iconColor} />
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  </div>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              <span />
              <span>Loại giao dịch</span>
              <span className="text-right w-28">Số dư trước</span>
              <span className="text-right w-28">Số tiền</span>
              <span className="text-right w-28">Số dư sau</span>
            </div>

            {/* List */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {txs.map((tx, i) => {
                const isCredit = Number(tx.amount) > 0;
                return (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_auto_auto] items-start gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 ${
                      i !== 0 ? "border-t border-gray-100" : ""
                    } hover:bg-gray-50 transition-colors`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      isCredit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}>
                      {isCredit
                        ? <ArrowUp size={13} />
                        : <ArrowDown size={13} />
                      }
                    </div>

                    {/* Label + desc + date */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                        {TX_TYPE_LABELS[tx.type] ?? tx.type}
                      </p>
                      {tx.description && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{tx.description}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>

                    {/* Mobile: amount only */}
                    <div className="sm:hidden text-right">
                      <p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                        {isCredit ? "+" : ""}{formatVnd(Number(tx.amount))}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Còn: {formatVnd(Number(tx.balanceAfter))}</p>
                    </div>

                    {/* Desktop: balance before */}
                    <div className="hidden sm:block text-right w-28 shrink-0">
                      <p className="text-xs text-gray-400">{formatVnd(Number(tx.balanceBefore))}</p>
                    </div>

                    {/* Desktop: amount */}
                    <div className="hidden sm:block text-right w-28 shrink-0">
                      <p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                        {isCredit ? "+" : ""}{formatVnd(Number(tx.amount))}
                      </p>
                    </div>

                    {/* Desktop: balance after */}
                    <div className="hidden sm:block text-right w-28 shrink-0">
                      <p className="text-xs font-medium text-gray-800">{formatVnd(Number(tx.balanceAfter))}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/lich-su-giao-dich" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
