import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Nạp tiền" };

const PAGE_SIZE = 25;

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const { page, type } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const typeFilter =
    type === "AUTO"   ? { type: "DEPOSIT_AUTO" as never } :
    type === "MANUAL" ? { type: "DEPOSIT_MANUAL" as never } :
    { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] as never[] } };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: typeFilter,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        referenceCode: true,
        createdAt: true,
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.transaction.count({ where: typeFilter }),
  ]);

  // Aggregate totals
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nạp tiền</h1>
      </div>

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

      {/* Type filter */}
      <div className="flex items-center gap-2">
        {[
          { key: "", label: "Tất cả" },
          { key: "AUTO", label: "Tự động" },
          { key: "MANUAL", label: "Thủ công" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={key ? `/admin/deposits?type=${key}` : "/admin/deposits"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              type === key || (!type && !key)
                ? "bg-[#7C3AED] text-white"
                : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Số tiền</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mã TK</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Không có giao dịch</td>
              </tr>
            )}
            {transactions.map((tx, i) => (
              <tr key={tx.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{tx.user.fullName}</p>
                  <p className="text-[11px] text-gray-500">{tx.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    tx.type === "DEPOSIT_AUTO"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}>
                    {tx.type === "DEPOSIT_AUTO" ? "Auto" : "Manual"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-[#10B981]">
                  +{formatVnd(Number(tx.amount))}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">
                  {tx.referenceCode ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(tx.createdAt)}</td>
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
          searchParams={type ? { type } : {}}
        />
      )}
    </div>
  );
}

async function UnmatchedTransfersSection() {
  const unmatched = await prisma.unmatchedTransfer.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, content: true, amount: true, referenceCode: true, createdAt: true },
  });

  if (unmatched.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-5">
      <h2 className="text-sm font-semibold text-[#EF4444] mb-3">
        Giao dịch chưa khớp ({unmatched.length})
      </h2>
      <div className="space-y-2">
        {unmatched.map((ut) => (
          <div key={ut.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-500 text-xs font-mono">{ut.referenceCode}</p>
              <p className="text-[10px] text-gray-500 truncate max-w-[240px]">{ut.content}</p>
            </div>
            <span className="text-[#EF4444] font-semibold">+{formatVnd(Number(ut.amount))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
