import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import ResolveUnmatchedButton from "./_components/ResolveUnmatchedButton";
import ManualDepositPanel from "./_components/ManualDepositPanel";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Admin — Nạp tiền" };

const PAGE_SIZE = 25;

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>;
}) {
  const { page, type, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const search = q?.trim() ?? "";

  const typeWhere =
    type === "AUTO"   ? { type: "DEPOSIT_AUTO" as never } :
    type === "MANUAL" ? { type: "DEPOSIT_MANUAL" as never } :
    { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] as never[] } };

  const searchWhere = search ? {
    OR: [
      { user: { email:    { contains: search, mode: "insensitive" as const } } },
      { user: { fullName: { contains: search, mode: "insensitive" as const } } },
      { referenceCode:    { contains: search, mode: "insensitive" as const } },
    ],
  } : {};

  const where = search ? { AND: [typeWhere, searchWhere] } : typeWhere;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        amount: true,
        referenceCode: true,
        description: true,
        accountNumber: true,
        transactionDate: true,
        createdAt: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const [autoTotal, manualTotal] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT_AUTO" as never },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT_MANUAL" as never },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (type)   paginationParams.type = type;
  if (search) paginationParams.q    = search;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nạp tiền</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1">Tự động (SePay)</p>
          <p className="text-xl font-bold text-[#10B981]">
            {formatVnd(Number(autoTotal._sum.amount ?? 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">{autoTotal._count.toLocaleString("vi-VN")} giao dịch</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1">Thủ công</p>
          <p className="text-xl font-bold text-[#F59E0B]">
            {formatVnd(Number(manualTotal._sum.amount ?? 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">{manualTotal._count.toLocaleString("vi-VN")} giao dịch</p>
        </div>
      </div>

      {/* Unmatched transfers */}
      <UnmatchedTransfersSection />

      {/* Search + Type filter */}
      <AdminFilterBar
        basePath="/admin/deposits"
        search={{ placeholder: "Tìm theo email, tên, mã giao dịch..." }}
        selects={[
          {
            paramKey: "type",
            label: "Loại nạp",
            placeholder: "Tất cả loại",
            options: [
              { value: "AUTO", label: "Tự động" },
              { value: "MANUAL", label: "Thủ công" },
            ],
          },
        ]}
      />

      {/* Search result summary */}
      {search && (
        <p className="text-xs text-gray-500">
          {total > 0
            ? `${total} kết quả cho "${search}"`
            : `Không tìm thấy kết quả cho "${search}"`}
        </p>
      )}

      {/* Manual deposit panel — user list filtered by top search bar */}
      {type === "MANUAL" && <ManualDepositPanel search={search} />}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-200">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Số tiền</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nội dung / Ngân hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mã tham chiếu</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Không có giao dịch
                </td>
              </tr>
            )}
            {transactions.map((tx, i) => (
              <tr key={tx.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50 transition-colors`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{tx.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{tx.user.email}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{tx.user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    tx.type === "DEPOSIT_AUTO"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}>
                    {tx.type === "DEPOSIT_AUTO" ? "Auto" : "Thủ công"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-[#10B981] whitespace-nowrap">
                  +{formatVnd(Number(tx.amount))}
                </td>
                <td className="px-4 py-3 max-w-60">
                  <p className="text-xs text-gray-700 truncate" title={tx.description}>{tx.description}</p>
                  {tx.accountNumber && (
                    <p className="text-[10px] text-gray-400 mt-0.5">STK: {tx.accountNumber}</p>
                  )}
                  {tx.transactionDate && (
                    <p className="text-[10px] text-gray-400">GD: {tx.transactionDate}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                  {tx.referenceCode ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/deposits"
          searchParams={paginationParams}
        />
      )}
    </div>
  );
}


async function UnmatchedTransfersSection() {
  const unmatched = await prisma.unmatchedTransfer.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, content: true, amount: true, referenceCode: true, createdAt: true },
  });

  if (unmatched.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-5">
      <h2 className="text-sm font-semibold text-[#EF4444] mb-3">
        Giao dịch chưa khớp ({unmatched.length})
      </h2>
      <div className="space-y-3">
        {unmatched.map((ut) => (
          <div key={ut.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-gray-500 text-xs font-mono">{ut.referenceCode}</p>
              <p className="text-[10px] text-gray-500 truncate max-w-65">{ut.content}</p>
              <p className="text-[10px] text-gray-400">{formatDate(ut.createdAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[#EF4444] font-semibold text-sm">+{formatVnd(Number(ut.amount))}</span>
              <ResolveUnmatchedButton
                id={ut.id}
                referenceCode={ut.referenceCode}
                amount={Number(ut.amount)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
