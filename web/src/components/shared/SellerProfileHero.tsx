import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { TrendingUp, CheckCircle, Clock, Package } from "lucide-react";
const COLOR_MAP: Record<string, string> = {
  gray:   "border-gray-400/50 text-gray-300",
  slate:  "border-slate-300/60 text-slate-200",
  amber:  "border-amber-400/60 text-amber-300",
  violet: "border-violet-400/60 text-violet-300",
  blue:   "border-blue-400/60 text-blue-300",
  green:  "border-green-400/60 text-green-300",
  red:    "border-red-400/60 text-red-300",
};

export type SellerActiveTab = "overview" | "products" | "orders" | "complaints" | "revenue" | "withdrawal" | "danh-muc";

const TABS: Array<{ key: SellerActiveTab; label: string; href: string }> = [
  { key: "overview",   label: "Tổng quan",  href: "/ban-hang" },
  { key: "products",   label: "Sản phẩm",   href: "/san-pham" },
  { key: "orders",     label: "Đơn hàng",   href: "/ban-hang/don-hang" },
  { key: "complaints", label: "Khiếu nại",  href: "/ban-hang/khieu-nai" },
  { key: "revenue",    label: "Doanh thu",  href: "/ban-hang/doanh-thu" },
  { key: "withdrawal", label: "Rút tiền",   href: "/rut-tien" },
  { key: "danh-muc",   label: "Danh mục",   href: "/danh-muc" },
];

interface Props {
  userId: string;
  activeTab: SellerActiveTab;
}

export default async function SellerProfileHero({ userId, activeTab }: Props) {
  const [user, tierDef, revenueAgg, pendingCount, productCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, uidPrefix: true, sellerTier: true, avatarUrl: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { sellerTier: true } })
      .then((u) => prisma.sellerTierDefinition.findUnique({ where: { key: u?.sellerTier ?? "STANDARD" } })),
    prisma.order.aggregate({
      where: { sellerId: userId, status: "DONE" },
      _sum: { finalPrice: true },
      _count: true,
    }),
    prisma.order.count({ where: { sellerId: userId, status: "PENDING" } }),
    prisma.sellerProduct.count({ where: { sellerId: userId, deletedAt: null } }),
  ]);

  if (!user) return null;

  const totalRevenue = Number(revenueAgg._sum.finalPrice ?? 0);
  const initials = (user.fullName ?? user.email ?? "?").slice(0, 2).toUpperCase();

  const STATS = [
    { Icon: TrendingUp,  label: "Doanh thu",      value: formatVnd(totalRevenue),                  color: "text-emerald-400", iconBg: "bg-emerald-500/10" },
    { Icon: CheckCircle, label: "Đơn hoàn thành", value: revenueAgg._count.toLocaleString("vi-VN"), color: "text-teal-400",    iconBg: "bg-teal-500/10"    },
    { Icon: Clock,       label: "Đơn chờ xử lý",  value: pendingCount.toLocaleString("vi-VN"),      color: "text-amber-300",  iconBg: "bg-amber-500/10"   },
    { Icon: Package,     label: "Sản phẩm",        value: productCount.toLocaleString("vi-VN"),      color: "text-blue-300",   iconBg: "bg-blue-500/10"    },
  ];

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-8 bg-linear-to-br from-slate-800 to-text-dark">
      <div className="px-4 md:px-6 lg:px-8 pt-8 pb-0">
        {/* Identity */}
        <div className="flex items-center gap-4 mb-6">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2Url(user.avatarUrl)}
              alt={user.fullName ?? ""}
              className="w-16 h-16 rounded-full object-cover shrink-0 shadow-lg ring-2 ring-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg ring-2 ring-white/20">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{user.fullName ?? user.email}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">id : {user.uidPrefix?.toUpperCase()}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex px-2.5 py-0.5 rounded-full border border-violet-500/60 text-violet-300 text-[11px] font-medium">
                Nhà bán hàng
              </span>
              {tierDef && (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${COLOR_MAP[tierDef.badgeColor] ?? COLOR_MAP["gray"]}`}>
                  {tierDef.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map(({ Icon, label, value, color, iconBg }) => (
            <div key={label} className="rounded-xl bg-white/6 border border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg}`}>
                  <Icon size={11} className={color} />
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">{label}</span>
              </div>
              <p className={`text-sm font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto scrollbar-none -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8">
          {TABS.map(({ key, label, href }) => (
            <Link
              key={key}
              href={href}
              className={`shrink-0 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-gray-50 text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
