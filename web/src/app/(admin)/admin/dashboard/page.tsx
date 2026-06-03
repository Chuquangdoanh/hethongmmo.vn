import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import DashboardCharts from "./DashboardCharts";
import type { ChartPoint } from "./DashboardCharts";

export const metadata: Metadata = { title: "Admin Dashboard" };

type DailyAmountRow  = { label: string; total: string };
type DailyCountRow   = { label: string; cnt:   string };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();

  // Determine filter mode
  const filterDate   = sp.date ?? null;                                                          // "YYYY-MM-DD"
  const selectedYear  = Math.max(2020, Math.min(2099, parseInt(sp.year  ?? String(now.getFullYear()),  10)));
  const selectedMonth = Math.max(1,    Math.min(12,   parseInt(sp.month ?? String(now.getMonth() + 1), 10)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Always-on queries ──────────────────────────────────────────────
  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd   = new Date(selectedYear, selectedMonth, 1);

  const [
    totalUsers, newUsersToday, totalOrders, ordersToday,
    pendingWithdrawals, openComplaints,
    totalDeposits, depositsToday,
    recentOrders, recentUsers,
    monthWithdrawal,
    sellerRevenueMonth,
    approvedSellerCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.transaction.aggregate({
      where: { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] }, createdAt: { gte: today } },
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
    prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 5, where: { deletedAt: null },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    }),
    prisma.sellerWithdrawal.aggregate({
      where: {
        status: { in: ["APPROVED", "COMPLETED"] },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true, netAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: { not: null },
        status: "DONE",
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { finalPrice: true },
      _count: { id: true },
    }),
    prisma.user.count({ where: { sellerStatus: "APPROVED", deletedAt: null } }),
  ]);

  // ── Build chart data ───────────────────────────────────────────────
  let chartData: ChartPoint[];

  if (filterDate) {
    // ── DAY MODE: hourly aggregation ──
    const dayStart = new Date(filterDate);
    const dayEnd   = new Date(filterDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [hDeposits, hOrders, hOrderRevenue, hUsers] = await Promise.all([
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COALESCE(SUM(amount), 0)::text AS total
        FROM transactions
        WHERE type IN ('DEPOSIT_AUTO', 'DEPOSIT_MANUAL')
          AND created_at >= ${dayStart} AND created_at < ${dayEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COUNT(*)::text AS cnt
        FROM orders
        WHERE created_at >= ${dayStart} AND created_at < ${dayEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COALESCE(SUM(final_price), 0)::text AS total
        FROM orders
        WHERE seller_id IS NOT NULL AND status = 'DONE'
          AND created_at >= ${dayStart} AND created_at < ${dayEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24') AS label,
               COUNT(*)::text AS cnt
        FROM users
        WHERE deleted_at IS NULL
          AND created_at >= ${dayStart} AND created_at < ${dayEnd}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
      `,
    ]);

    const depMap = new Map(hDeposits.map((r)      => [r.label, Number(r.total)]));
    const ordMap = new Map(hOrders.map((r)         => [r.label, Number(r.cnt)]));
    const revMap = new Map(hOrderRevenue.map((r)   => [r.label, Number(r.total)]));
    const usrMap = new Map(hUsers.map((r)          => [r.label, Number(r.cnt)]));

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
    // ── MONTH MODE: daily aggregation ──
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate   = new Date(selectedYear, selectedMonth,     1);

    const [dailyDeposits, dailyOrderRevenue, dailyOrders, dailyUsers] = await Promise.all([
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD') AS label,
               COALESCE(SUM(amount), 0)::text AS total
        FROM transactions
        WHERE type IN ('DEPOSIT_AUTO', 'DEPOSIT_MANUAL')
          AND created_at >= ${startDate} AND created_at < ${endDate}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyAmountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD') AS label,
               COALESCE(SUM(final_price), 0)::text AS total
        FROM orders
        WHERE seller_id IS NOT NULL AND status = 'DONE'
          AND created_at >= ${startDate} AND created_at < ${endDate}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD') AS label,
               COUNT(*)::text AS cnt
        FROM orders
        WHERE created_at >= ${startDate} AND created_at < ${endDate}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD') AS label,
               COUNT(*)::text AS cnt
        FROM users
        WHERE deleted_at IS NULL
          AND created_at >= ${startDate} AND created_at < ${endDate}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
    ]);

    const depMap = new Map(dailyDeposits.map((r)     => [r.label, Number(r.total)]));
    const revMap = new Map(dailyOrderRevenue.map((r) => [r.label, Number(r.total)]));
    const ordMap = new Map(dailyOrders.map((r)       => [r.label, Number(r.cnt)]));
    const usrMap = new Map(dailyUsers.map((r)        => [r.label, Number(r.cnt)]));

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const lbl = String(i + 1).padStart(2, "0");
      return {
        label:        lbl,
        deposits:     depMap.get(lbl) ?? 0,
        orderRevenue: revMap.get(lbl) ?? 0,
        orders:       ordMap.get(lbl) ?? 0,
        newUsers:     usrMap.get(lbl) ?? 0,
      };
    });
  }

  const periodDepositTotal = chartData.reduce((s, d) => s + d.deposits, 0);

  const STATS = [
    {
      label: "Tổng người dùng",
      value: totalUsers.toLocaleString("vi-VN"),
      sub:   `+${newUsersToday} hôm nay`,
      color: "text-gray-900",
    },
    {
      label: "Tổng đơn hàng",
      value: totalOrders.toLocaleString("vi-VN"),
      sub:   `+${ordersToday} hôm nay`,
      color: "text-[#A855F7]",
    },
    {
      label: "Nạp tiền hôm nay",
      value: formatVnd(Number(depositsToday._sum.amount ?? 0)),
      sub:   `Tổng: ${formatVnd(Number(totalDeposits._sum.amount ?? 0))}`,
      color: "text-[#10B981]",
    },
    {
      label: "Rút tiền chờ duyệt",
      value: pendingWithdrawals.toString(),
      sub:   `${openComplaints} khiếu nại mở`,
      color: pendingWithdrawals > 0 ? "text-[#F59E0B]" : "text-gray-500",
    },
    {
      label: `Rút tiền T${selectedMonth}/${selectedYear}`,
      value: formatVnd(Number(monthWithdrawal._sum.amount ?? 0)),
      sub:   `Sau phí: ${formatVnd(Number(monthWithdrawal._sum.netAmount ?? 0))}`,
      color: "text-blue-600",
    },
    {
      label: `Doanh số seller T${selectedMonth}/${selectedYear}`,
      value: formatVnd(Number(sellerRevenueMonth._sum.finalPrice ?? 0)),
      sub:   `${sellerRevenueMonth._count.id} đơn · ${approvedSellerCount} seller`,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

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

      {/* Charts + filter */}
      <DashboardCharts
        data={chartData}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        filterDate={filterDate}
        periodDepositTotal={periodDepositTotal}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent orders */}
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

        {/* Recent users */}
        <div className="rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Người dùng mới</h2>
            <Link href="/admin/users" className="text-xs text-[#7C3AED] hover:text-[#A855F7]">Tất cả →</Link>
          </div>
          {recentUsers.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 px-5 py-3 ${i !== 0 ? "border-t border-gray-200" : ""}`}>
              <div className="h-7 w-7 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A855F7] text-xs font-bold shrink-0">
                {(u.fullName || u.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 truncate">{u.fullName}</p>
                <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
              </div>
              <span className="text-[10px] text-gray-500 shrink-0">{formatDate(u.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
