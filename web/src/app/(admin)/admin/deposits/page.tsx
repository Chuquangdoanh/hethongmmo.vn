import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import ResolveUnmatchedButton from "./_components/ResolveUnmatchedButton";

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
        createdAt: true,
        user: { select: { email: true, fullName: true } },
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

  // Build href helpers that preserve current params
  function typeHref(key: string) {
    const params = new URLSearchParams();
    if (key)    params.set("type", key);
    if (search) params.set("q", search);
    return `/admin/deposits${params.size ? `?${params}` : ""}`;
  }

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

      {/* Search + Type filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search form — native GET, no client component needed */}
        <form method="get" action="/admin/deposits" className="flex-1 flex gap-2">
          {type && <input type="hidden" name="type" value={type} />}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Tìm email, họ tên, mã tham chiếu..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#7C3AED] bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
          >
            Tìm
          </button>
          {search && (
            <Link
              href={type ? `/admin/deposits?type=${type}` : "/admin/deposits"}
              className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 flex items-center"
            >
              <X size={14} />
            </Link>
          )}
        </form>

        {/* Type filter */}
        <div className="flex items-center gap-2 shrink-0">
          {[
            { key: "", label: "Tất cả" },
            { key: "AUTO", label: "Tự động" },
            { key: "MANUAL", label: "Thủ công" },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={typeHref(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                type === key || (!type && !key)
                  ? "bg-[#7C3AED] text-white"
                  : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Search result summary */}
      {search && (
        <p className="text-xs text-gray-500">
          {total > 0
            ? `${total} kết quả cho "${search}"`
            : `Không tìm thấy kết quả cho "${search}"`}
        </p>
      )}

      {/* Manual top-up user summary — only when MANUAL filter active */}
      {type === "MANUAL" && !search && <ManualDepositUserList />}

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
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Không có giao dịch
                </td>
              </tr>
            )}
            {transactions.map((tx, i) => (
              <tr key={tx.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50 transition-colors`}>
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
          searchParams={paginationParams}
        />
      )}
    </div>
  );
}

async function ManualDepositUserList() {
  const grouped = await prisma.transaction.groupBy({
    by: ["userId"],
    where: { type: "DEPOSIT_MANUAL" as never },
    _sum:   { amount: true },
    _count: { id: true },
    _max:   { createdAt: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  if (grouped.length === 0) return null;

  const userIds = grouped.map((g) => g.userId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, fullName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="rounded-xl border border-[#F59E0B]/30 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F59E0B]/20 bg-[#F59E0B]/5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#92400e]">Danh sách user đã nạp thủ công</h2>
          <p className="text-[11px] text-[#b45309] mt-0.5">{grouped.length} người dùng</p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#F59E0B]/15 text-[#92400e]">
          {formatVnd(grouped.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0))} tổng
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-140">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Người dùng</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tổng nạp</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Số lần</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Lần cuối</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grouped.map((g, idx) => {
              const user = userMap.get(g.userId ?? "");
              const total = Number(g._sum.amount ?? 0);
              const lastDate = g._max.createdAt;
              return (
                <tr key={g.userId ?? idx} className="hover:bg-[#F59E0B]/3 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-[#92400e]">
                          {(user?.fullName ?? user?.email ?? "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName || "—"}</p>
                        <p className="text-[11px] text-gray-400 font-mono truncate">{user?.email ?? g.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-[#F59E0B]">+{formatVnd(total)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F59E0B]/10 text-[11px] font-bold text-[#92400e]">
                      {g._count.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {lastDate ? formatDate(lastDate) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
