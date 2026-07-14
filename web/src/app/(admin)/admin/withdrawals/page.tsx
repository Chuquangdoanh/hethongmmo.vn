import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

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


function getDateLabel(dateRange: string | undefined, from: string | undefined, to: string | undefined): string {
  const hasRange = (from && from !== "all") || to;
  if (hasRange) {
    const fmt = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (from && from !== "all" && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from && from !== "all") return `Từ ${fmt(from)}`;
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

  // "all" là sentinel của nút nhanh "Tất cả" trong AdminFilterBar (không phải ngày thật) —
  // cùng quy ước với admin/sellers, admin/orders, admin/ban-tai-nguyen.
  const isAllTime = from === "all";
  // Custom date range takes precedence over quick filter
  const hasCustomRange = !isAllTime && Boolean(from || to);
  const dateBounds = isAllTime
    ? {}
    : hasCustomRange
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
        }
      : (() => {
          const d = getDateFrom(dateRange);
          return d ? { gte: d } : {};
        })();
  const hasDateFilter = Object.keys(dateBounds).length > 0;

  // Danh sách yêu cầu lọc theo ngày tạo (createdAt) — khớp với cột "Ngày tạo" hiển thị
  // trong bảng, và hoạt động với mọi trạng thái (kể cả PENDING chưa có processedAt).
  const createdAtFilter = hasDateFilter ? { createdAt: dateBounds } : {};
  const where = {
    ...(status ? { status: status as never } : {}),
    ...createdAtFilter,
  };

  // Tổng đã chi vẫn tính theo ngày xử lý (processedAt) — tiền thực sự rời khỏi hệ thống
  const processedAtFilter = hasDateFilter ? { processedAt: dateBounds } : {};

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
        </div>
      </div>

      {/* Status + Date filter */}
      <AdminFilterBar
        basePath="/admin/withdrawals"
        selects={[
          {
            paramKey: "status",
            label: "Trạng thái",
            placeholder: "Tất cả trạng thái",
            options: [
              { value: "PENDING", label: "Chờ duyệt" },
              { value: "APPROVED", label: "Đã duyệt" },
              { value: "COMPLETED", label: "Hoàn thành" },
              { value: "REJECTED", label: "Từ chối" },
            ],
          },
        ]}
        dateRange={{ fromKey: "from", toKey: "to", showQuickDates: true }}
      />

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
                      prefetch={false}
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
