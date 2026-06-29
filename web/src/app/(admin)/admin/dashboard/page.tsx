import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import DashboardCharts from "./DashboardCharts";
import type { ChartPoint } from "./DashboardCharts";
import DashboardFilter from "./DashboardFilter";

export const metadata: Metadata = { title: "Admin Dashboard" };

type DailyAmountRow = { label: string; total: string };
type DailyCountRow  = { label: string; cnt:   string };

const ORDER_TYPE_META = [
  { key: "SERVICE",        label: "Dịch vụ",    icon: "⚙️",  color: "text-[#2563eb]",  bg: "bg-[#2563eb]/10" },
  { key: "COURSE",         label: "Khóa học",   icon: "🎓",  color: "text-[#7C3AED]",  bg: "bg-[#7C3AED]/10" },
  { key: "TUTTRICK",       label: "Tut-trick",  icon: "📖",  color: "text-[#F59E0B]",  bg: "bg-[#F59E0B]/10" },
  { key: "MMO_PRODUCT",    label: "Tài nguyên", icon: "💎",  color: "text-[#10B981]",  bg: "bg-[#10B981]/10" },
  { key: "SELLER_PRODUCT", label: "Nhà bán",    icon: "🏪",  color: "text-[#A855F7]",  bg: "bg-[#A855F7]/10" },
] as const;

function parseDateLocal(s: string): Date {
  const parts = s.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoFirstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const sp = await searchParams;

  const today = isoToday();
  const rawFrom = sp.dateFrom ?? isoFirstOfMonth();
  const rawTo   = sp.dateTo   ?? today;

  // Ensure from <= to
  const [orderedFrom, orderedTo] = rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom];

  const periodStart = parseDateLocal(orderedFrom);
  const periodEnd   = parseDateLocal(orderedTo);
  periodEnd.setDate(periodEnd.getDate() + 1); // exclusive upper bound

  const isSingleDay = orderedFrom === orderedTo;

  const todayDate = parseDateLocal(today);

  // ── Queries ─────────────────────────────────────────────────────────
  const [
    totalOrders, ordersToday,
    pendingWithdrawals, openComplaints,
    totalDeposits, depositsPeriod,
    recentOrders,
    withdrawalPeriod,
    sellerRevenuePeriod,
    approvedSellerCount,
    pendingWithdrawalAmount,
    revenueByType,
    refundPeriod,
    totalBalanceOnWeb,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayDate } } }),
    prisma.sellerWithdrawal.count({ where: { status: "PENDING", createdAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.complaint.count({ where: { status: "IN_REVIEW" } }),
    prisma.transaction.aggregate({
      where: { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] }, createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      select: {
        id: true, orderCode: true, itemName: true, finalPrice: true,
        status: true, createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.sellerWithdrawal.aggregate({
      where: {
        status: { in: ["APPROVED", "COMPLETED"] },
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { amount: true, netAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: { not: null },
        status: "DONE",
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { finalPrice: true },
      _count: { id: true },
    }),
    prisma.user.count({ where: { sellerStatus: "APPROVED", deletedAt: null } }),
    prisma.sellerWithdrawal.aggregate({
      where: { status: "PENDING", createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.order.groupBy({
      by: ["orderType"],
      where: { status: "DONE", createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { finalPrice: true },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "REFUND", createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.user.aggregate({
      where: { deletedAt: null },
      _sum: { balance: true },
    }),
  ]);

  // ── Chart data ───────────────────────────────────────────────────────
  let chartData: ChartPoint[];

  if (isSingleDay) {
    // Hourly aggregation (0–23h)
    const [hDeposits, hOrders, hOrderRevenue, hUsers] = await Promise.all([
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COALESCE(SUM(amount), 0)::text AS total
        FROM transactions
        WHERE type IN ('DEPOSIT_AUTO', 'DEPOSIT_MANUAL')
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COUNT(*)::text AS cnt
        FROM orders
        WHERE created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COALESCE(SUM(final_price), 0)::text AS total
        FROM orders
        WHERE status = 'DONE'
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COUNT(*)::text AS cnt
        FROM users
        WHERE deleted_at IS NULL
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
    ]);

    const depMap = new Map(hDeposits.map((r)    => [r.label, Number(r.total)]));
    const ordMap = new Map(hOrders.map((r)       => [r.label, Number(r.cnt)]));
    const revMap = new Map(hOrderRevenue.map((r) => [r.label, Number(r.total)]));
    const usrMap = new Map(hUsers.map((r)        => [r.label, Number(r.cnt)]));

    chartData = Array.from({ length: 24 }, (_, h) => {
      const lbl = String(h).padStart(2, "0");
      return {
        label:        `${lbl}h`,
        deposits:     depMap.get(lbl) ?? 0,
        orderRevenue: revMap.get(lbl) ?? 0,
        orders:       ordMap.get(lbl) ?? 0,
        newUsers:     usrMap.get(lbl) ?? 0,
      };
    });

  } else {
    // Daily aggregation — each day in [orderedFrom, orderedTo]
    const [dailyDeposits, dailyOrderRevenue, dailyOrders, dailyUsers] = await Promise.all([
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
               COALESCE(SUM(amount), 0)::text AS total
        FROM transactions
        WHERE type IN ('DEPOSIT_AUTO', 'DEPOSIT_MANUAL')
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
               COALESCE(SUM(final_price), 0)::text AS total
        FROM orders
        WHERE status = 'DONE'
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
               COUNT(*)::text AS cnt
        FROM orders
        WHERE created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
               COUNT(*)::text AS cnt
        FROM users
        WHERE deleted_at IS NULL
          AND created_at >= ${periodStart} AND created_at < ${periodEnd}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
    ]);

    const depMap = new Map(dailyDeposits.map((r)    => [r.label, Number(r.total)]));
    const revMap = new Map(dailyOrderRevenue.map((r) => [r.label, Number(r.total)]));
    const ordMap = new Map(dailyOrders.map((r)       => [r.label, Number(r.cnt)]));
    const usrMap = new Map(dailyUsers.map((r)        => [r.label, Number(r.cnt)]));

    // Build date array from orderedFrom to orderedTo inclusive
    const cursor = parseDateLocal(orderedFrom);
    const end    = parseDateLocal(orderedTo);
    chartData    = [];
    while (cursor <= end) {
      const isoKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const displayLbl = `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      chartData.push({
        label:        displayLbl,
        deposits:     depMap.get(isoKey) ?? 0,
        orderRevenue: revMap.get(isoKey) ?? 0,
        orders:       ordMap.get(isoKey) ?? 0,
        newUsers:     usrMap.get(isoKey) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // ── Revenue breakdown ────────────────────────────────────────────────
  const typeRevMap = new Map(
    revenueByType.map((r) => [r.orderType, { amount: Number(r._sum.finalPrice ?? 0), count: r._count.id }])
  );
  const grossRevenue   = revenueByType.reduce((s, r) => s + Number(r._sum.finalPrice ?? 0), 0);
  const refundAmount   = Number(refundPeriod._sum.amount ?? 0);
  const refundCount    = refundPeriod._count.id;
  const netRevenue     = grossRevenue - refundAmount;
  const totalDoneCount = revenueByType.reduce((s, r) => s + r._count.id, 0);

  // ── Stats cards ──────────────────────────────────────────────────────
  const STATS = [
    {
      label: "Tổng đơn hàng",
      value: totalOrders.toLocaleString("vi-VN"),
      sub:   `+${ordersToday} hôm nay`,
      color: "text-[#A855F7]",
    },
    {
      label: "Nạp tiền",
      value: formatVnd(Number(depositsPeriod._sum.amount ?? 0)),
      sub:   `All-time: ${formatVnd(Number(totalDeposits._sum.amount ?? 0))}`,
      color: "text-[#10B981]",
    },
    {
      label: "Tổng tiền trên web",
      value: formatVnd(Number(totalBalanceOnWeb._sum.balance ?? 0)),
      sub:   "Tổng balance user hiện tại",
      color: "text-[#2563eb]",
    },
    {
      label: "Rút chờ duyệt",
      value: pendingWithdrawals.toString(),
      sub:   `${formatVnd(Number(pendingWithdrawalAmount._sum.amount ?? 0))} · ${openComplaints} KN`,
      color: pendingWithdrawals > 0 ? "text-[#F59E0B]" : "text-gray-500",
    },
    {
      label: "Rút tiền",
      value: formatVnd(Number(withdrawalPeriod._sum.amount ?? 0)),
      sub:   `Sau phí: ${formatVnd(Number(withdrawalPeriod._sum.netAmount ?? 0))}`,
      color: "text-blue-600",
    },
    {
      label: "Doanh số seller",
      value: formatVnd(Number(sellerRevenuePeriod._sum.finalPrice ?? 0)),
      sub:   `${sellerRevenuePeriod._count.id} đơn · ${approvedSellerCount} seller`,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Filter — vị trí 2 */}
      <DashboardFilter rawFrom={orderedFrom} rawTo={orderedTo} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {STATS.map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-[10px] text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue breakdown by order type */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Doanh thu theo loại</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Chỉ tính đơn hoàn thành (DONE)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Doanh thu gộp</p>
              <p className="text-sm font-bold text-gray-700">{formatVnd(grossRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Thực thu (sau hoàn)</p>
              <p className={`text-sm font-bold ${netRevenue >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {formatVnd(netRevenue)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-px bg-gray-200">
          {ORDER_TYPE_META.map(({ key, label, icon, color, bg }) => {
            const d = typeRevMap.get(key) ?? { amount: 0, count: 0 };
            return (
              <div key={key} className={`p-4 ${bg} bg-white`}>
                <p className="text-[10px] text-gray-400 mb-1.5">{icon} {label}</p>
                <p className={`text-sm font-bold ${color}`}>{formatVnd(d.amount)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{d.count.toLocaleString("vi-VN")} đơn</p>
              </div>
            );
          })}
          <div className="p-4 bg-red-50">
            <p className="text-[10px] text-gray-400 mb-1.5">↩ Hoàn tiền</p>
            <p className="text-sm font-bold text-red-500">−{formatVnd(refundAmount)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{refundCount} giao dịch</p>
          </div>
          <div className="p-4 bg-emerald-50">
            <p className="text-[10px] text-gray-400 mb-1.5">= Net doanh thu</p>
            <p className={`text-sm font-bold ${netRevenue >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {formatVnd(netRevenue)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{totalDoneCount.toLocaleString("vi-VN")} đơn</p>
          </div>
        </div>
      </div>

      {/* Charts + date range filter */}
      <DashboardCharts
        data={chartData}
        rawFrom={orderedFrom}
        rawTo={orderedTo}
        isSingleDay={isSingleDay}
      />

      {/* Recent orders — full width */}
      <div className="rounded-xl border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Đơn hàng gần đây</h2>
          <Link href="/admin/orders" className="text-xs text-[#7C3AED] hover:text-[#A855F7]">Tất cả →</Link>
        </div>
        {recentOrders.map((order, i) => (
          <div key={order.id} className={`flex items-center gap-3 px-5 py-3 ${i !== 0 ? "border-t border-gray-200" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900 truncate">{order.itemName}</p>
              <p className="text-[10px] text-gray-500">{order.user.email} · {formatDate(order.createdAt)}</p>
            </div>
            <span className="text-xs text-[#A855F7] shrink-0">{formatVnd(Number(order.finalPrice))}</span>
          </div>
        ))}

      </div>
    </div>
  );
}
