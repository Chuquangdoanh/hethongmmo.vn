import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import { DateRangeFilter } from "./_components/DateRangeFilter";

export const metadata: Metadata = { title: "Admin — Rút tiền" };

const PAGE_SIZE = 20;

const STATUS_BADGES: Record<string, string> = {
  PENDING:   "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
  APPROVED:  "bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20",
  COMPLETED: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20",
  REJECTED:  "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", COMPLETED: "Hoàn thành", REJECTED: "Từ chối",
};

const DATE_RANGE_LABELS: Record<string, string> = {
  today: "Hôm nay", week: "Tuần này", month: "Tháng này",
};

function getDateFrom(range: string | undefined): Date | undefined {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return undefined;
}

function buildUrl(params: { status?: string; dateRange?: string; from?: string; to?: string }): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  // dateRange and custom from/to are mutually exclusive — dateRange wins if both present
  if (params.dateRange) {
    qs.set("dateRange", params.dateRange);
  } else {
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
  }
  const str = qs.toString();
  return `/admin/withdrawals${str ? `?${str}` : ""}`;
}

function getDateLabel(dateRange: string | undefined, from: string | undefined, to: string | undefined): string {
  if (from || to) {
    const fmt = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `Từ ${fmt(from)}`;
    return `Đến ${fmt(to!)}`;
  }
  if (dateRange && DATE_RANGE_LABELS[dateRange]) return DATE_RANGE_LABELS[dateRange]!;
  return "Tất cả thời gian";
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; dateRange?: string; from?: string; to?: string }>;
}) {
  const { page, status, dateRange, from, to } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = status ? { status: status as never } : {};

  // Custom date range takes precedence over quick filter
  const hasCustomRange = Boolean(from || to);
  const processedAtFilter = hasCustomRange
    ? {
        processedAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
        },
      }
    : (() => {
        const d = getDateFrom(dateRange);
        return d ? { processedAt: { gte: d } } : {};
      })();

  // APPROVED = balance đã trừ, đang chờ chuyển khoản; COMPLETED = đã chuyển khoản xong
  // Cả hai đều tính vào "Tổng đã chi" vì tiền seller đã bị cam kết chi ra từ bước APPROVED
  const totalAmountWhere = {
    status: { in: ["APPROVED", "COMPLETED"] as ("APPROVED" | "COMPLETED")[] },
    ...processedAtFilter,
  };

  const [withdrawals, total, pendingCount, completedCount, totalAmountAgg, pendingAmountAgg] = await Promise.all([
    prisma.sellerWithdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, amount: true, netAmount: true, feePercent: true, feeAmount: true,
        status: true, createdAt: true, processedAt: true, rejectReason: true,
        seller: { select: { email: true, fullName: true } },
      },
    }),
    prisma.sellerWithdrawal.count({ where }),
    prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.sellerWithdrawal.count({ where: { status: "COMPLETED" } }),
    prisma.sellerWithdrawal.aggregate({ where: totalAmountWhere, _sum: { netAmount: true } }),
    prisma.sellerWithdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Rút tiền</h1>
          <p className="text-sm text-gray-500 mt-1">Yêu cầu rút tiền từ các nhà bán hàng</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-sm font-semibold text-[#F59E0B]">
            ⚠ {pendingCount} chờ duyệt
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng yêu cầu</p>
          <p className="text-3xl font-bold text-gray-900">{total.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Tất cả trạng thái</p>
        </div>
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide mb-2">Chờ duyệt</p>
          <p className="text-3xl font-bold text-[#F59E0B]">{pendingCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">{formatVnd(Number(pendingAmountAgg._sum.amount ?? 0))}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đã hoàn thành</p>
          <p className="text-3xl font-bold text-[#10B981]">{completedCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Yêu cầu thành công</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Tổng đã chi</p>
          <p className="text-2xl font-bold text-[#A855F7]">{formatVnd(Number(totalAmountAgg._sum.netAmount ?? 0))}</p>
          <p className="text-xs text-gray-400 mt-1.5">
            {getDateLabel(dateRange, from, to)} · Đã duyệt + Hoàn thành
          </p>
          <div className="flex items-center gap-1 mt-2.5 flex-wrap">
            {(["", "today", "week", "month"] as const).map((key) => (
              <Link
                key={key}
                href={buildUrl({ status, dateRange: key || undefined })}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                  !hasCustomRange && (dateRange ?? "") === key
                    ? "bg-[#A855F7] text-white"
                    : "bg-white border border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10"
                }`}
              >
                {key === "" ? "Tất cả" : DATE_RANGE_LABELS[key]}
              </Link>
            ))}
          </div>
          <DateRangeFilter initialFrom={from ?? ""} initialTo={to ?? ""} status={status} />
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "", label: "Tất cả" },
          { key: "PENDING", label: "Chờ duyệt" },
          { key: "APPROVED", label: "Đã duyệt" },
          { key: "COMPLETED", label: "Hoàn thành" },
          { key: "REJECTED", label: "Từ chối" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={buildUrl({ status: key || undefined, dateRange, from, to })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              status === key || (!status && !key)
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} yêu cầu{status ? ` · ${STATUS_LABELS[status] ?? status}` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Seller</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Yêu cầu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Phí (%)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Thực nhận</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">💸</p>
                    <p className="text-sm font-medium text-gray-600">Không có yêu cầu rút tiền</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc trạng thái</p>
                  </td>
                </tr>
              )}
              {withdrawals.map((w) => (
                <tr key={w.id} className={`hover:bg-gray-50 transition-colors ${w.status === "PENDING" ? "bg-[#F59E0B]/3" : ""}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-xs font-bold flex-shrink-0">
                        {(w.seller.fullName || w.seller.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{w.seller.fullName}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[160px]">{w.seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-gray-700">
                    {formatVnd(Number(w.amount))}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="text-sm font-semibold text-[#F59E0B]">{w.feePercent}%</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">-{formatVnd(Number(w.feeAmount))}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#10B981]">
                    {formatVnd(Number(w.netAmount))}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${STATUS_BADGES[w.status] ?? ""}`}>
                      {STATUS_LABELS[w.status] ?? w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(w.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/withdrawals/${w.id}`}
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        w.status === "PENDING"
                          ? "text-[#F59E0B] bg-[#F59E0B]/8 hover:bg-[#F59E0B]/15"
                          : "text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15"
                      }`}
                    >
                      {w.status === "PENDING" ? "Xử lý ngay" : "Chi tiết"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/withdrawals"
          searchParams={status ? { status } : {}}
        />
      )}
    </div>
  );
}
