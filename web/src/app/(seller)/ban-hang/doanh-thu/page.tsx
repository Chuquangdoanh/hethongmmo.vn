import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd } from "@/lib/utils/format";
import { TrendingUp, TrendingDown, BarChart3, ShoppingBag } from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";

export const metadata: Metadata = { title: "Doanh thu — Seller" };

export default async function SellerDoanhThuPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [allTime, thisMonth, lastMonth, productRevenue] = await Promise.all([
    prisma.order.aggregate({
      where: { sellerId: me.id, status: "DONE" },
      _sum: { finalPrice: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { sellerId: me.id, status: "DONE", createdAt: { gte: startOfMonth } },
      _sum: { finalPrice: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        sellerId: me.id, status: "DONE",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { finalPrice: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["itemName"],
      where: { sellerId: me.id, status: "DONE" },
      _sum: { finalPrice: true },
      _count: true,
      orderBy: { _sum: { finalPrice: "desc" } },
      take: 10,
    }),
  ]);

  const allTimeRevenue = Number(allTime._sum.finalPrice ?? 0);
  const thisMonthRevenue = Number(thisMonth._sum.finalPrice ?? 0);
  const lastMonthRevenue = Number(lastMonth._sum.finalPrice ?? 0);
  const growth = lastMonthRevenue > 0
    ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
    : null;
  const growthPositive = growth !== null && parseFloat(growth) >= 0;

  const STAT_CARDS = [
    {
      label: "Tổng doanh thu",
      value: formatVnd(allTimeRevenue),
      sub: `${allTime._count} đơn hoàn thành`,
      valueColor: "text-violet-600",
      iconBg: "bg-purple-50",
      Icon: TrendingUp,
      iconColor: "text-purple-600",
    },
    {
      label: "Tháng này",
      value: formatVnd(thisMonthRevenue),
      sub: `${thisMonth._count} đơn`,
      valueColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      Icon: BarChart3,
      iconColor: "text-emerald-600",
    },
    {
      label: "Tháng trước",
      value: formatVnd(lastMonthRevenue),
      sub: growth !== null
        ? `${growthPositive ? "↑" : "↓"} ${Math.abs(parseFloat(growth))}% so với tháng trước`
        : "Chưa có dữ liệu tháng trước",
      valueColor: "text-gray-800",
      iconBg: growthPositive ? "bg-emerald-50" : "bg-red-50",
      Icon: growthPositive ? TrendingUp : TrendingDown,
      iconColor: growthPositive ? "text-emerald-600" : "text-red-500",
    },
  ];

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="revenue" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <BarChart3 size={17} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Doanh thu</h1>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STAT_CARDS.map(({ label, value, sub, valueColor, iconBg, Icon, iconColor }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon size={17} className={iconColor} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
                <p className={`text-xs mt-1 ${
                  growth !== null && label === "Tháng trước"
                    ? growthPositive ? "text-emerald-600" : "text-red-500"
                    : "text-gray-400"
                }`}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Top products */}
          {productRevenue.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <ShoppingBag size={15} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Sản phẩm bán chạy</h2>
              </div>
              {productRevenue.map((p, i) => {
                const rev = Number(p._sum.finalPrice ?? 0);
                const maxRev = Number(productRevenue[0]?._sum?.finalPrice ?? 1);
                const pct = maxRev > 0 ? (rev / maxRev) * 100 : 0;
                return (
                  <div key={p.itemName} className={`px-5 py-4 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm text-gray-800 font-medium truncate max-w-[60%]">{p.itemName}</p>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-violet-600">{formatVnd(rev)}</span>
                        <span className="text-[11px] text-gray-400 ml-2">{p._count} đơn</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-violet-500 to-purple-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
