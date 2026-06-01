import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import WithdrawalProcessForm from "./WithdrawalProcessForm";

export const metadata: Metadata = { title: "Xử lý rút tiền" };

export default async function AdminWithdrawalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const withdrawal = await prisma.sellerWithdrawal.findUnique({
    where: { id },
    select: {
      id: true, amount: true, feeAmount: true, netAmount: true,
      feePercent: true, status: true, rejectReason: true,
      qualifyingOrderIds: true, createdAt: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
      seller: {
        select: {
          id: true, email: true, fullName: true, phone: true, balance: true,
        },
      },
    },
  });

  if (!withdrawal) notFound();

  const bankName          = withdrawal.bankNameEnc          ? decrypt(withdrawal.bankNameEnc          as unknown as Buffer) : null;
  const bankAccountNumber = withdrawal.bankAccountNumberEnc ? decrypt(withdrawal.bankAccountNumberEnc as unknown as Buffer) : null;
  const bankAccountHolder = withdrawal.bankAccountHolderEnc ? decrypt(withdrawal.bankAccountHolderEnc as unknown as Buffer) : null;

  const orderIds = withdrawal.qualifyingOrderIds as string[];

  // Fetch qualifying orders for this withdrawal
  const orders = orderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true, orderCode: true, itemName: true,
          finalPrice: true, originalPrice: true,
          createdAt: true, withdrawn: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const orderTotal = orders.reduce(
    (sum, o) => sum + Number(o.finalPrice ?? o.originalPrice),
    0,
  );

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Chờ duyệt", APPROVED: "Đã duyệt",
    COMPLETED: "Đã chuyển", REJECTED: "Từ chối", PROCESSING: "Đang xử lý",
  };
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "text-amber-600 bg-amber-50 border-amber-200",
    APPROVED: "text-emerald-600 bg-emerald-50 border-emerald-200",
    COMPLETED: "text-violet-600 bg-violet-50 border-violet-200",
    REJECTED: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/withdrawals" className="text-xs text-gray-500 hover:text-gray-700">← Rút tiền</Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Chi tiết rút tiền</h1>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[withdrawal.status] ?? "text-gray-500"}`}>
          {STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
        </span>
      </div>

      {/* Seller info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Thông tin seller</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Họ tên", value: withdrawal.seller.fullName },
            { label: "Email", value: withdrawal.seller.email },
            { label: "Số dư hiện tại", value: formatVnd(Number(withdrawal.seller.balance)) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className="text-gray-800">{value ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* Bank account info */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-100/60 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-800">Tài khoản ngân hàng</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-blue-500 mb-0.5">Ngân hàng</p>
              <p className="font-semibold text-blue-900">{bankName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 mb-0.5">Số tài khoản</p>
              <p className="font-mono font-bold text-blue-900 tracking-wider">{bankAccountNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 mb-0.5">Chủ tài khoản</p>
              <p className="font-semibold text-blue-900 uppercase">{bankAccountHolder ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Amount summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Tổng kết thanh toán</h2>
        <div className="space-y-2.5">
          {[
            { label: "Tổng doanh thu đơn hàng", value: formatVnd(orderTotal), highlight: false },
            { label: `Phí dịch vụ (${withdrawal.feePercent}%)`, value: `-${formatVnd(Number(withdrawal.feeAmount))}`, highlight: false },
            { label: "Thực nhận", value: formatVnd(Number(withdrawal.netAmount)), highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className={highlight ? "font-bold text-emerald-600" : "text-gray-800"}>{value}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>Ngày yêu cầu</span>
            <span>{formatDate(withdrawal.createdAt)}</span>
          </div>
          {withdrawal.rejectReason && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lý do từ chối</span>
              <span className="text-red-500">{withdrawal.rejectReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Qualifying orders */}
      {orders.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Đơn hàng trong yêu cầu ({orders.length})</h2>
            <span className="text-xs text-gray-500">{formatVnd(orderTotal)}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{o.itemName}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{o.orderCode} · {formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-700">{formatVnd(Number(o.finalPrice ?? o.originalPrice))}</p>
                  {o.withdrawn && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Đã rút</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process form */}
      {withdrawal.status === "PENDING" && (
        <WithdrawalProcessForm withdrawalId={id} netAmount={Number(withdrawal.netAmount)} />
      )}

      {withdrawal.status === "APPROVED" && (
        <WithdrawalProcessForm withdrawalId={id} netAmount={Number(withdrawal.netAmount)} completeOnly />
      )}
    </div>
  );
}
