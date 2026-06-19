import Link from "next/link";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { Wallet, TrendingUp, TrendingDown, Calendar } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  USER:   "Thành viên",
  SELLER: "Nhà bán hàng",
  STAFF:  "Nhân viên",
  ADMIN:  "Quản trị viên",
};

const TABS = [
  { key: "profile",      label: "Thông tin hồ sơ",  href: "/thong-tin-ca-nhan" },
  { key: "deposit",      label: "Nạp tiền",          href: "/nap-tien" },
  { key: "orders",       label: "Lịch sử mua hàng",  href: "/don-hang" },
  { key: "transactions", label: "Lịch sử giao dịch", href: "/lich-su-giao-dich" },
  { key: "chat",         label: "Ticket hỗ trợ",      href: "/tro-chuyen" },
];

interface Props {
  fullName: string;
  email: string;
  role: string;
  uidPrefix: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt: Date | null;
  activeTab: "profile" | "deposit" | "orders" | "transactions" | "chat";
  avatarUrl?: string | null;
}

export default function UserProfileHero({
  fullName, email, role, uidPrefix,
  balance, totalDeposited, totalSpent, lastDepositAt,
  activeTab, avatarUrl,
}: Props) {
  const initials   = (fullName || email).slice(0, 2).toUpperCase();
  const roleLabel  = ROLE_LABELS[role] ?? "Thành viên";

  const STATS = [
    {
      Icon: Wallet,       label: "Số dư hiện tại",
      value: formatVnd(balance),
      color: "text-blue-300",    iconBg: "bg-blue-500/10",
    },
    {
      Icon: TrendingUp,   label: "Tổng tiền nạp",
      value: formatVnd(totalDeposited),
      color: "text-emerald-400", iconBg: "bg-emerald-500/10",
    },
    {
      Icon: TrendingDown, label: "Tổng tiền sử dụng",
      value: formatVnd(totalSpent),
      color: "text-rose-400",    iconBg: "bg-rose-500/10",
    },
    {
      Icon: Calendar,     label: "Ngày nạp gần nhất",
      value: lastDepositAt ? formatDate(lastDepositAt) : "Chưa có",
      color: "text-amber-300",   iconBg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-8 bg-linear-to-br from-slate-800 to-text-dark">
      <div className="px-4 md:px-6 lg:px-8 pt-8 pb-0">

        {/* Identity row */}
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2Url(avatarUrl)}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover shrink-0 shadow-lg ring-2 ring-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg ring-2 ring-white/20">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{fullName}</h1>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">id : {uidPrefix.toUpperCase()}</p>
            <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full border border-slate-500/60 text-slate-300 text-[11px] font-medium">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Stats row */}
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
