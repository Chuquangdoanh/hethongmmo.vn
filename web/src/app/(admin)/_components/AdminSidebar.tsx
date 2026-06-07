"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Zap, BookOpen, FileText,
  Gamepad2, Tags, BookMarked, Tag, FolderOpen, ShieldCheck, Star,
  AlertTriangle, Radio, Wallet, ArrowDownCircle, ArrowUpCircle,
  Store, Settings, Users, Search, ChevronDown, Home, X, Lock,
  Inbox,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BadgeKey = "orders" | "complaints" | "withdrawals" | "deposits";
interface Badges    { orders: number; complaints: number; withdrawals: number; deposits: number }
interface Dismissed { orders: number; complaints: number; withdrawals: number; deposits: number }

interface Toast {
  id: string;
  key: BadgeKey;
  diff: number;
}

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  badge?: BadgeKey;
  adminOnly?: boolean;
}

interface NavSection {
  key: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
  links: NavLink[];
}

// ─── Toast metadata ──────────────────────────────────────────────────────────

const TOAST_META: Record<BadgeKey, { label: string; Icon: LucideIcon; color: string; bg: string; border: string; href: string }> = {
  orders:      { label: "đơn hàng mới chờ xử lý",   Icon: ShoppingBag,     color: "#f97316", bg: "#fff7ed", border: "#fed7aa", href: "/admin/orders"      },
  complaints:  { label: "khiếu nại mới cần xem",     Icon: AlertTriangle,   color: "#ef4444", bg: "#fef2f2", border: "#fecaca", href: "/admin/complaints"  },
  withdrawals: { label: "yêu cầu rút tiền đang chờ", Icon: ArrowUpCircle,   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", href: "/admin/withdrawals" },
  deposits:    { label: "giao dịch nạp tiền mới",    Icon: ArrowDownCircle, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", href: "/admin/deposits"    },
};

// ─── Nav config ──────────────────────────────────────────────────────────────

const SECTIONS: NavSection[] = [
  {
    key: "products", label: "Sản phẩm", Icon: Package, color: "#7c3aed", bg: "#ede9fe",
    links: [
      { href: "/admin/services",     label: "Dịch vụ",      Icon: Zap,      color: "#7c3aed" },
      { href: "/admin/courses",      label: "Khóa học",     Icon: BookOpen, color: "#0066ff" },
      { href: "/admin/tut-tricks",   label: "Tut / Tricks", Icon: FileText, color: "#475569" },
      { href: "/admin/mmo-products", label: "Tài nguyên",   Icon: Gamepad2, color: "#6366f1" },
    ],
  },
  {
    key: "categories", label: "Danh mục", Icon: Tags, color: "#0d9488", bg: "#ccfbf1",
    links: [
      { href: "/admin/course-categories",      label: "DM Khóa học",     Icon: BookMarked, color: "#0d9488" },
      { href: "/admin/service-categories",     label: "DM Dịch vụ",      Icon: Tag,        color: "#0d9488" },
      { href: "/admin/resource-categories",    label: "DM Tài nguyên",   Icon: FolderOpen, color: "#0d9488" },
      { href: "/admin/tut-trick-categories",   label: "DM Tut & Tricks", Icon: FileText,   color: "#0d9488" },
    ],
  },
  {
    key: "quality", label: "Chất lượng", Icon: ShieldCheck, color: "#f59e0b", bg: "#fef3c7",
    links: [
      { href: "/admin/danh-gia",   label: "Đánh giá",  Icon: Star,          color: "#f59e0b" },
      { href: "/admin/complaints", label: "Khiếu nại", Icon: AlertTriangle, color: "#ef4444", badge: "complaints" },
      { href: "/admin/tickers",    label: "Ticker",    Icon: Radio,         color: "#0066ff" },
    ],
  },
  {
    key: "finance", label: "Tài chính", Icon: Wallet, color: "#10b981", bg: "#d1fae5",
    links: [
      { href: "/admin/deposits",    label: "Nạp tiền", Icon: ArrowDownCircle, color: "#10b981", badge: "deposits"    },
      { href: "/admin/withdrawals", label: "Rút tiền", Icon: ArrowUpCircle,   color: "#ef4444", badge: "withdrawals" },
    ],
  },
  {
    key: "selling", label: "Bán hàng", Icon: Store, color: "#ec4899", bg: "#fce7f3",
    links: [
      { href: "/admin/sellers",          label: "Sellers",           Icon: Store,       color: "#ec4899" },
      { href: "/admin/san-pham-ban",     label: "SP Nhà bán hàng",  Icon: ShoppingBag, color: "#f97316" },
      { href: "/admin/cai-dat-ban-hang", label: "Cài đặt bán hàng", Icon: Settings,    color: "#64748b" },
    ],
  },
  {
    key: "system", label: "Hệ thống", Icon: Users, color: "#64748b", bg: "#f1f5f9",
    links: [
      { href: "/admin/users",      label: "Người dùng", Icon: Users,  color: "#0066ff" },
      { href: "/admin/audit-log",  label: "Audit Log",  Icon: Search, color: "#64748b" },
      { href: "/admin/phan-quyen", label: "Phân quyền", Icon: Lock,   color: "#64748b", adminOnly: true },
    ],
  },
];

const DEFAULT_DISMISSED: Dismissed = { orders: 0, complaints: 0, withdrawals: 0, deposits: 0 };
const DEFAULT_OPEN = Object.fromEntries(SECTIONS.map((s) => [s.key, true]));
const LS_OPEN      = "admin-sidebar-open";
const LS_DISMISSED = "admin-sidebar-dismissed";

// ─── Component ───────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  pendingOrderCount: number;
  /** Null = ADMIN (no filtering). Array = STAFF disabled page keys. */
  disabledPages: string[] | null;
  isAdmin: boolean;
}

export default function AdminSidebar({ pendingOrderCount, disabledPages, isAdmin }: AdminSidebarProps) {
  // Page keys that this user cannot access
  const disabledSet = disabledPages ? new Set(disabledPages) : null;
  const pathname = usePathname();

  const [badges, setBadges] = useState<Badges>({
    orders: pendingOrderCount, complaints: 0, withdrawals: 0, deposits: 0,
  });
  const [dismissed, setDismissed] = useState<Dismissed>(DEFAULT_DISMISSED);
  const [open, setOpen]           = useState<Record<string, boolean>>(DEFAULT_OPEN);
  const [hydrated, setHydrated]   = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);

  // Track previous badge counts — null = first load, skip diff check
  const prevBadgesRef = useRef<Badges | null>(null);

  // ── Hydrate localStorage ──
  useEffect(() => {
    try {
      const savedOpen = localStorage.getItem(LS_OPEN);
      if (savedOpen) setOpen(JSON.parse(savedOpen) as Record<string, boolean>);
      const savedDismissed = localStorage.getItem(LS_DISMISSED);
      if (savedDismissed) setDismissed(JSON.parse(savedDismissed) as Dismissed);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // ── Add toast + auto-dismiss ──
  const addToast = useCallback((key: BadgeKey, diff: number) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, key, diff }]); // max 5 toasts
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Poll /api/admin/badges every 30s ──
  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/admin/badges");
        if (!res.ok) return;
        const json = (await res.json()) as { data?: Badges };
        if (!json.data) return;
        const next = json.data;

        if (prevBadgesRef.current) {
          // Sau lần đầu: detect tăng → toast
          const prev = prevBadgesRef.current;
          (["orders", "complaints", "withdrawals", "deposits"] as BadgeKey[]).forEach((key) => {
            const diff = next[key] - prev[key];
            if (diff > 0) addToast(key, diff);
          });
        } else {
          // Lần đầu load: khởi tạo dismissed = current để không hiện badge giả
          setDismissed((prev) => {
            const init: Dismissed = {
              orders:      prev.orders      === 0 ? next.orders      : prev.orders,
              complaints:  prev.complaints  === 0 ? next.complaints  : prev.complaints,
              withdrawals: prev.withdrawals === 0 ? next.withdrawals : prev.withdrawals,
              deposits:    prev.deposits    === 0 ? next.deposits    : prev.deposits,
            };
            try { localStorage.setItem(LS_DISMISSED, JSON.stringify(init)); } catch { /* ignore */ }
            return init;
          });
        }

        prevBadgesRef.current = next;
        setBadges(next);
      } catch { /* silent */ }
    }

    void fetchBadges();
    const id = setInterval(fetchBadges, 30_000);
    return () => clearInterval(id);
  }, [addToast]);

  // ── Dismiss badge ──
  const dismiss = useCallback((key: BadgeKey) => {
    setDismissed((prev) => {
      const next = { ...prev, [key]: badges[key] };
      try { localStorage.setItem(LS_DISMISSED, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [badges]);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(LS_OPEN, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function hasBadge(key: BadgeKey) {
    return badges[key] > (dismissed[key] ?? 0);
  }

  function sectionHasBadge(section: NavSection) {
    return section.links.some((l) => l.badge && hasBadge(l.badge));
  }

  const orderActive       = isActive("/admin/orders");
  const orderBadgeVisible = hasBadge("orders");

  // Tổng tất cả unseen badges — hiển thị trên Dashboard link
  const totalUnread = (["orders", "complaints", "withdrawals", "deposits"] as BadgeKey[])
    .filter((k) => hasBadge(k))
    .reduce((sum, k) => sum + Math.max(0, badges[k] - (dismissed[k] ?? 0)), 0);

  return (
    <>
      {/* ── Toast notifications ── */}
      <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const meta = TOAST_META[toast.key];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-lg bg-white border w-72 animate-in slide-in-from-right-4 fade-in duration-300"
              style={{ borderColor: meta.border }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: meta.bg }}
              >
                <meta.Icon size={16} strokeWidth={2} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  +{toast.diff} {meta.label}
                </p>
                <Link
                  href={meta.href}
                  onClick={() => { dismiss(toast.key); removeToast(toast.id); }}
                  className="text-[11px] font-semibold underline underline-offset-2 transition-colors"
                  style={{ color: meta.color }}
                >
                  Xem ngay →
                </Link>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen sticky top-0">

        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <Link href="/" className="text-sm font-bold text-accent">hethongmmo.vn</Link>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium tracking-wide">Admin Panel</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">

          {/* Dashboard + tổng badge */}
          {(() => {
            const active = isActive("/admin/dashboard");
            return (
              <Link
                href="/admin/dashboard"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#fef9c3] text-[#78350f]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: active ? "#fef08a" : "#f1f5f9" }}
                >
                  <LayoutDashboard size={13} strokeWidth={1.75} style={{ color: active ? "#92400e" : "#94a3b8" }} />
                </div>
                <span className="flex-1">Dashboard</span>
                {totalUnread > 0 && <BadgeCount count={totalUnread} />}
              </Link>
            );
          })()}

          {/* Orders */}
          <Link
            href="/admin/orders"
            onClick={() => dismiss("orders")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              orderActive
                ? "bg-[#fef9c3] text-[#78350f]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: orderActive ? "#fef08a" : "#f1f5f9" }}
            >
              <ShoppingBag size={13} strokeWidth={1.75} style={{ color: orderActive ? "#92400e" : "#94a3b8" }} />
            </div>
            <span className="flex-1">Đơn hàng</span>
            {orderBadgeVisible && <BadgeCount count={badges.orders} />}
          </Link>

          {/* Đăng ký dịch vụ */}
          {(() => {
            const leadsActive = isActive("/admin/dang-ky-dich-vu");
            return (
              <Link
                href="/admin/dang-ky-dich-vu"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  leadsActive
                    ? "bg-[#fef9c3] text-[#78350f]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: leadsActive ? "#fef08a" : "#f1f5f9" }}
                >
                  <Inbox size={13} strokeWidth={1.75} style={{ color: leadsActive ? "#92400e" : "#94a3b8" }} />
                </div>
                <span className="flex-1">Đăng ký dịch vụ</span>
              </Link>
            );
          })()}

          <div className="h-px bg-gray-100 my-1.5" />

          {/* Collapsible sections */}
          {SECTIONS.map((section) => {
            const isOpen           = hydrated ? (open[section.key] ?? true) : true;
            const hasActive        = section.links.some((l) => isActive(l.href));
            const showSectionBadge = sectionHasBadge(section) && !isOpen;

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => toggle(section.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    hasActive && !isOpen
                      ? "bg-gray-100 text-gray-800"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: section.bg }}>
                    <section.Icon size={11} strokeWidth={2} style={{ color: section.color }} />
                  </div>
                  <span className="flex-1 text-left">{section.label}</span>
                  {showSectionBadge && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  )}
                  <ChevronDown
                    size={12} strokeWidth={2.5}
                    className="text-gray-400 shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </button>

                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-gray-100 mt-0.5 mb-1 space-y-0.5">
                    {section.links.map((link) => {
                      // Hide admin-only links from STAFF
                      if (link.adminOnly && !isAdmin) return null;
                      // Hide link if STAFF and page is disabled
                      const pageKey = link.href.replace(/^\//, ""); // "/admin/users" → "admin/users"
                      if (disabledSet?.has(pageKey)) return null;

                      const active    = isActive(link.href);
                      const linkBadge = link.badge ? hasBadge(link.badge) : false;

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => link.badge && dismiss(link.badge)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                            active
                              ? "bg-[#fef9c3] text-[#78350f] font-semibold"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                          }`}
                        >
                          <link.Icon
                            size={13}
                            strokeWidth={active ? 2 : 1.75}
                            className="shrink-0"
                            style={{ color: active ? "#92400e" : "#94a3b8" }}
                          />
                          <span className="flex-1">{link.label}</span>
                          {linkBadge && link.badge && <BadgeCount count={badges[link.badge]} />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-gray-100 shrink-0">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            <Home size={13} strokeWidth={1.75} className="shrink-0" />
            Về trang chủ
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BadgeCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse shrink-0">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavLinkItem({
  href, label, Icon, active,
}: {
  href: string; label: string; Icon: LucideIcon; color?: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-[#fef9c3] text-[#78350f]"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: active ? "#fef08a" : "#f1f5f9" }}
      >
        <Icon size={13} strokeWidth={1.75} style={{ color: active ? "#92400e" : "#94a3b8" }} />
      </div>
      {label}
    </Link>
  );
}
