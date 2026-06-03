import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import InlineStatusCell from "./_components/InlineStatusCell";
import DateFilter from "./_components/DateFilter";

export const metadata: Metadata = { title: "Admin — Đơn hàng" };

const PAGE_SIZE = 20;

const STATUS_BADGES: Record<string, string> = {
  PENDING:    "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
  PROCESSING: "bg-[#7C3AED]/10 text-[#A855F7] border border-[#A855F7]/20",
  DONE:       "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20",
  FROZEN:     "bg-[#0891b2]/10 text-[#0891b2] border border-[#0891b2]/20",
  
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý", PROCESSING: "Đang xử lý", DONE: "Hoàn thành",
  FROZEN: "Đóng băng",
};

const ORDER_TYPES = [
  { key: "SERVICE",        label: "Dịch vụ",   icon: "⚙️",  color: "#2563eb",  bg: "#2563eb" },
  { key: "COURSE",         label: "Khóa học",  icon: "🎓",  color: "#7C3AED",  bg: "#7C3AED" },
  { key: "TUTTRICK",       label: "Tut & Trick",icon: "📖", color: "#F59E0B",  bg: "#F59E0B" },
  { key: "MMO_PRODUCT",    label: "Tài nguyên", icon: "💎", color: "#10B981",  bg: "#10B981" },
  { key: "SELLER_PRODUCT", label: "Nhà bán",   icon: "🏪",  color: "#A855F7",  bg: "#A855F7" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  SERVICE:        "bg-[#2563eb]/10 text-[#2563eb]",
  COURSE:         "bg-[#7C3AED]/10 text-[#A855F7]",
  TUTTRICK:       "bg-[#F59E0B]/10 text-[#F59E0B]",
  MMO_PRODUCT:    "bg-[#10B981]/10 text-[#10B981]",
  SELLER_PRODUCT: "bg-[#A855F7]/10 text-[#A855F7]",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; orderType?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { page, status, orderType, dateFrom: dateFromParam, dateTo: dateToParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Default to today unless "all" is explicitly requested
  const isAllTime = dateFromParam === "all";
  const dateFilter = isAllTime ? {} : {
    createdAt: {
      gte: dateFromParam ? new Date(dateFromParam + "T00:00:00") : todayStart,
      lte: dateToParam && dateToParam !== "all" ? new Date(dateToParam + "T23:59:59") : todayEnd,
    },
  };

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(orderType ? { orderType: orderType as never } : {}),
    ...dateFilter,
  };

  // Card counts respect date filter + status filter but not orderType
  const typeCountsWhere = {
    ...(status ? { status: status as never } : {}),
    ...dateFilter,
  };

  const [orders, total, pendingCount, processingCount, doneToday, revenueToday, typeCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderCode: true, itemName: true, orderType: true,
        finalPrice: true, status: true, createdAt: true, warrantyVariant: true,
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "DONE", createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({
      where: { status: "DONE", createdAt: { gte: todayStart } },
      _sum: { finalPrice: true },
    }),
    prisma.order.groupBy({
      by: ["orderType"],
      where: typeCountsWhere,
      _count: { id: true },
    }),
  ]);

  const typeCountMap: Record<string, number> = {};
  for (const row of typeCounts) {
    typeCountMap[row.orderType] = row._count.id;
  }
  const grandTotal = Object.values(typeCountMap).reduce((a, b) => a + b, 0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build URL preserving current date + other filters
  function tabUrl(overrides: { status?: string; orderType?: string }) {
    const sp = new URLSearchParams();
    const s = "status" in overrides ? overrides.status : status;
    const ot = "orderType" in overrides ? overrides.orderType : orderType;
    if (s) sp.set("status", s);
    if (ot) sp.set("orderType", ot);
    if (dateFromParam) sp.set("dateFrom", dateFromParam);
    if (dateToParam) sp.set("dateTo", dateToParam);
    const q = sp.toString();
    return q ? `/admin/orders?${q}` : "/admin/orders";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Toàn bộ đơn hàng phân loại theo từng sản phẩm</p>
        </div>
        <span className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-600">
          {grandTotal.toLocaleString("vi-VN")} đơn
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide mb-2">Chờ xử lý</p>
          <p className="text-3xl font-bold text-[#F59E0B]">{pendingCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Cần xử lý ngay</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Đang xử lý</p>
          <p className="text-3xl font-bold text-[#A855F7]">{processingCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang trong quá trình</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Hoàn thành hôm nay</p>
          <p className="text-3xl font-bold text-[#10B981]">{doneToday.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đơn thành công</p>
        </div>
        <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 p-5">
          <p className="text-xs font-medium text-[#2563eb] uppercase tracking-wide mb-2">Doanh thu hôm nay</p>
          <p className="text-2xl font-bold text-[#2563eb]">{formatVnd(Number(revenueToday._sum.finalPrice ?? 0))}</p>
          <p className="text-xs text-gray-400 mt-1.5">Từ đơn hoàn thành</p>
        </div>
      </div>

      {/* Order type tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {/* All tab */}
        <Link
          href={tabUrl({ orderType: undefined })}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
            !orderType
              ? "bg-gray-900 border-gray-900 text-white shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <span className="text-lg leading-none">📋</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Tất cả</p>
            <p className={`text-sm font-bold ${!orderType ? "text-white" : "text-gray-800"}`}>
              {grandTotal.toLocaleString("vi-VN")}
            </p>
          </div>
        </Link>

        {ORDER_TYPES.map((t) => {
          const count = typeCountMap[t.key] ?? 0;
          const isActive = orderType === t.key;
          return (
            <Link
              key={t.key}
              href={tabUrl({ orderType: t.key })}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
                isActive
                  ? "border-current shadow-sm text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              style={isActive ? { backgroundColor: t.bg, borderColor: t.bg } : {}}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{t.label}</p>
                <p className={`text-sm font-bold ${isActive ? "text-white" : "text-gray-800"}`}>
                  {count.toLocaleString("vi-VN")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Date filter */}
      <DateFilter />

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Trạng thái:</span>
        {[
          { key: "", label: "Tất cả" },
          { key: "PENDING", label: "Chờ xử lý" },
          { key: "PROCESSING", label: "Đang xử lý" },
          { key: "DONE", label: "Hoàn thành" },
          { key: "FROZEN", label: "Đóng băng" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={tabUrl({ status: key || undefined })}
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
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} đơn hàng
            {orderType ? ` · ${ORDER_TYPES.find((t) => t.key === orderType)?.label ?? orderType}` : ""}
            {status ? ` · ${STATUS_LABELS[status] ?? status}` : ""}
          </span>
          {orderType && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${TYPE_COLORS[orderType] ?? ""}`}>
              {ORDER_TYPES.find((t) => t.key === orderType)?.icon}{" "}
              {ORDER_TYPES.find((t) => t.key === orderType)?.label}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Người mua</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Thời gian</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm font-medium text-gray-600">Không có đơn hàng nào</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc</p>
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const typeInfo = ORDER_TYPES.find((t) => t.key === order.orderType);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono font-semibold text-gray-700">{order.orderCode}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[order.orderType] ?? "bg-gray-100 text-gray-500"}`}>
                        {typeInfo?.icon} {typeInfo?.label ?? order.orderType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-900 font-medium truncate max-w-[180px]">{order.itemName}</p>
                      {order.warrantyVariant && (
                        <p className="text-[10px] text-[#A855F7] mt-0.5">BH: {order.warrantyVariant}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]">{order.user.fullName || "—"}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px] font-mono">{order.user.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#A855F7]">
                      {formatVnd(Number(order.finalPrice))}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <InlineStatusCell orderId={order.id} status={order.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 transition-colors"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/orders"
          searchParams={{
            ...(status ? { status } : {}),
            ...(orderType ? { orderType } : {}),
            ...(dateFromParam ? { dateFrom: dateFromParam } : {}),
            ...(dateToParam ? { dateTo: dateToParam } : {}),
          }}
        />
      )}
    </div>
  );
}
