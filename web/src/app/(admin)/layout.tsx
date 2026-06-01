import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import PendingOrdersBadge from "./_components/PendingOrdersBadge";

type NavItem =
  | { type: "section"; label: string }
  | { type: "link"; href: string; label: string; icon: string };

const ADMIN_NAV: NavItem[] = [
  { type: "link",    href: "/admin/dashboard",           label: "Dashboard",      icon: "📊" },
  { type: "link",    href: "/admin/orders",              label: "Đơn hàng",       icon: "📦" },

  { type: "section", label: "SẢN PHẨM" },
  { type: "link",    href: "/admin/services",            label: "Dịch vụ",        icon: "⚡" },
  { type: "link",    href: "/admin/courses",             label: "Khóa học",       icon: "📚" },
  
  { type: "link",    href: "/admin/tut-tricks",          label: "Tut/Tricks",     icon: "📋" },
  { type: "link",    href: "/admin/mmo-products",        label: "Tài nguyên",   icon: "🎮" },
 
  

  { type: "section", label: "THÊM DANH MỤC MỚI" },
  { type: "link",    href: "/admin/course-categories",   label: "DM Khóa học",    icon: "🏷️" },
  { type: "link",    href: "/admin/service-categories",  label: "DM Dịch vụ",    icon: "🏷️" },
  { type: "link",    href: "/admin/resource-categories", label: "DM Tài nguyên", icon: "🏷️" },

  
  
 

  { type: "section", label: "CHẤT LƯỢNG & THÔNG BÁO " },
  { type: "link",    href: "/admin/complaints",          label: "Khiếu nại",      icon: "⚠️" },
  { type: "link",    href: "/admin/tickers",             label: "Ticker",         icon: "📡" },

  { type: "section", label: "TÀI CHÍNH" },
  { type: "link",    href: "/admin/deposits",            label: "Nạp tiền",       icon: "💰" },
  { type: "link",    href: "/admin/withdrawals",         label: "Rút tiền",       icon: "💸" },

  { type: "section", label: "BÁN HÀNG" },
  { type: "link",    href: "/admin/sellers",             label: "Sellers",        icon: "🏪" },
   { type: "link",    href: "/admin/san-pham-ban",        label: "SP Nhà bán hàng",     icon: "🛍️" },
  { type: "link",    href: "/admin/cai-dat-ban-hang",    label: "Cài đặt bán hàng",    icon: "⚙️" },

  { type: "section", label: "THỐNG KÊ & HỆ THỐNG" },
  { type: "link",    href: "/admin/users",               label: "Người dùng",     icon: "👥" },
  { type: "link",    href: "/admin/audit-log",           label: "Audit Log",      icon: "🔍" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || (me.role !== "ADMIN" && me.role !== "STAFF")) {
    redirect("/");
  }

  const pendingOrderCount = await prisma.order.count({ where: { status: "PENDING" } });

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <Link href="/" className="text-sm font-bold text-[#A855F7]">
            chuquangdoanh.net
          </Link>
          <p className="text-[10px] text-gray-500 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {ADMIN_NAV.map((item, i) =>
            item.type === "section" ? (
              <p key={i} className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase select-none">
                {item.label}
              </p>
            ) : item.href === "/admin/orders" ? (
              <PendingOrdersBadge key={item.href} initial={pendingOrderCount} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <Link href="/" className="block px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700 transition-colors">
            ← Về trang chủ
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
