"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Zap, BookOpen, FileText,
  Gamepad2, Tags, BookMarked, Tag, FolderOpen, ShieldCheck, Star,
  AlertTriangle, Radio, Wallet, ArrowDownCircle, ArrowUpCircle,
  Store, Settings, Users, Search, ChevronDown, Home, X, Lock,
  Inbox, Monitor, Globe, Share2, Ticket,
  type LucideIcon,
} from "lucide-react";
import type { PermissionCode } from "@/lib/constants/modules";
import { useNotificationSound } from "@/lib/hooks/useNotificationSound";

// ─── Types ───────────────────────────────────────────────────────────────────

type BadgeKey = "orders" | "complaints" | "withdrawals" | "deposits" | "banTaiNguyen" | "dangKyDichVu";
interface Badges    { orders: number; complaints: number; withdrawals: number; deposits: number; banTaiNguyen: number; dangKyDichVu: number }
interface Dismissed { orders: number; complaints: number; withdrawals: number; deposits: number; banTaiNguyen: number; dangKyDichVu: number }

// Chỉ phát âm thanh thông báo cho 4 mục: Đơn hàng, Bán tài nguyên, Đăng ký dịch vụ, Khiếu nại
const SOUND_ENABLED_KEYS = new Set<BadgeKey>(["orders", "complaints", "banTaiNguyen", "dangKyDichVu"]);

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
  /** STAFF must have this permission to see the link. Absent = always visible. */
  permission?: PermissionCode;
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
  orders:       { label: "đơn hàng mới chờ xử lý",     Icon: ShoppingBag,     color: "#f97316", bg: "#fff7ed", border: "#fed7aa", href: "/admin/orders"          },
  complaints:   { label: "khiếu nại mới cần xem",       Icon: AlertTriangle,   color: "#ef4444", bg: "#fef2f2", border: "#fecaca", href: "/admin/complaints"      },
  withdrawals:  { label: "yêu cầu rút tiền đang chờ",   Icon: ArrowUpCircle,   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", href: "/admin/withdrawals"     },
  deposits:     { label: "giao dịch nạp tiền mới",      Icon: ArrowDownCircle, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", href: "/admin/deposits"        },
  banTaiNguyen: { label: "đơn bán tài nguyên chờ xử lý", Icon: Package,         color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", href: "/admin/ban-tai-nguyen"  },
  dangKyDichVu: { label: "đăng ký dịch vụ mới",          Icon: Inbox,           color: "#b45309", bg: "#fffbeb", border: "#fde68a", href: "/admin/dang-ky-dich-vu" },
};

// ─── Nav config ──────────────────────────────────────────────────────────────

const SECTIONS: NavSection[] = [
  {
    key: "products", label: "Sản phẩm", Icon: Package, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/services",     label: "Dịch vụ",      Icon: Zap,      color: "#94a3b8", permission: "services:read"   },
      { href: "/admin/courses",      label: "Khóa học",     Icon: BookOpen, color: "#94a3b8", permission: "courses:read"    },
      { href: "/admin/tut-tricks",   label: "Tut / Tricks", Icon: FileText, color: "#94a3b8", permission: "tut_tricks:read" },
      { href: "/admin/mmo-products", label: "Tài nguyên",   Icon: Gamepad2, color: "#94a3b8", permission: "resources:read"  },
      { href: "/admin/khuongfb",     label: "Khuongfb",     Icon: Globe,    color: "#94a3b8", adminOnly: true                },
      { href: "/admin/vps",          label: "VPS (VNCloud)", Icon: Monitor, color: "#94a3b8", adminOnly: true                },
      { href: "/admin/coupons",      label: "Mã giảm giá",  Icon: Ticket,   color: "#94a3b8", adminOnly: true                },
    ],
  },
  {
    key: "categories", label: "Danh mục", Icon: Tags, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/course-categories",    label: "DM Khóa học",     Icon: BookMarked, color: "#94a3b8", permission: "categories:read" },
      { href: "/admin/service-categories",   label: "DM Dịch vụ",      Icon: Tag,        color: "#94a3b8", permission: "categories:read" },
      { href: "/admin/resource-categories",  label: "DM Tài nguyên",   Icon: FolderOpen, color: "#94a3b8", permission: "categories:read" },
      { href: "/admin/tut-trick-categories", label: "DM Tut & Tricks", Icon: FileText,   color: "#94a3b8", permission: "categories:read" },
      { href: "/admin/nhan-su-danh-muc",     label: "Nhân sự DM",      Icon: Users,      color: "#94a3b8", permission: "categories:read" },
    ],
  },
  {
    key: "quality", label: "Chất lượng", Icon: ShieldCheck, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/complaints", label: "Khiếu nại", Icon: AlertTriangle, color: "#94a3b8", badge: "complaints", permission: "complaints:read" },
      { href: "/admin/doi-tac-ho-tro", label: "Hỗ trợ đối tác", Icon: Store, color: "#94a3b8", adminOnly: true },
      { href: "/admin/danh-gia",   label: "Đánh giá",  Icon: Star,          color: "#94a3b8",                      permission: "products:read"    },
      { href: "/admin/tickers",    label: "Ticker",    Icon: Radio,         color: "#94a3b8",                      permission: "content:read"     },
    ],
  },
  {
    key: "finance", label: "Tài chính", Icon: Wallet, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/deposits",    label: "Nạp tiền", Icon: ArrowDownCircle, color: "#94a3b8", badge: "deposits",    permission: "finance:read" },
      { href: "/admin/withdrawals", label: "Rút tiền", Icon: ArrowUpCircle,   color: "#94a3b8", badge: "withdrawals", permission: "finance:read" },
    ],
  },
  {
    key: "selling", label: "Bán hàng", Icon: Store, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/sellers",          label: "Sellers",           Icon: Store,       color: "#94a3b8", permission: "sellers:read"          },
      { href: "/admin/san-pham-ban",     label: "SP Nhà bán hàng",  Icon: ShoppingBag, color: "#94a3b8", permission: "seller_products:read"  },
      { href: "/admin/cai-dat-ban-hang", label: "Cài đặt bán hàng", Icon: Settings,    color: "#94a3b8", adminOnly: true                     },
    ],
  },
  
  {
    key: "affiliate", label: "Affiliate", Icon: Share2, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/affiliates",             label: "Affiliate & %",  Icon: Share2,      color: "#94a3b8", adminOnly: true },
      { href: "/admin/affiliate-commissions",  label: "Hoa hồng",       Icon: Wallet,      color: "#94a3b8", adminOnly: true },
      { href: "/admin/affiliate-withdrawals",  label: "Rút hoa hồng",   Icon: ArrowUpCircle, color: "#94a3b8", adminOnly: true },
    ],
  },
  {
    key: "system", label: "Hệ thống", Icon: Users, color: "#94a3b8", bg: "#f1f5f9",
    links: [
      { href: "/admin/users",      label: "Người dùng", Icon: Users,  color: "#94a3b8", permission: "users:read"      },
      { href: "/admin/audit-log",  label: "Audit Log",  Icon: Search, color: "#94a3b8", permission: "audit_logs:read" },
      { href: "/admin/phan-quyen", label: "Phân quyền", Icon: Lock,   color: "#94a3b8", adminOnly: true               },
    ],
  },
];

const DEFAULT_DISMISSED: Dismissed = { orders: 0, complaints: 0, withdrawals: 0, deposits: 0, banTaiNguyen: 0, dangKyDichVu: 0 };
const DEFAULT_OPEN = Object.fromEntries(SECTIONS.map((s) => [s.key, true]));
const LS_OPEN      = "admin-sidebar-open";
const LS_DISMISSED = "admin-sidebar-dismissed";

// ─── Component ───────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  pendingOrderCount: number;
  /**
   * Null = ADMIN (no filtering).
   * Array = STAFF's individual PermissionCode list.
   */
  permissions: PermissionCode[] | null;
  isAdmin: boolean;
  notificationSoundUrl?: string | null;
}

export default function AdminSidebar({ pendingOrderCount, permissions, isAdmin, notificationSoundUrl }: AdminSidebarProps) {
  const permSet = permissions ? new Set(permissions) : null;
  const pathname = usePathname();
  const playNotificationSound = useNotificationSound(notificationSoundUrl);

  const [badges, setBadges] = useState<Badges>({
    orders: pendingOrderCount, complaints: 0, withdrawals: 0, deposits: 0, banTaiNguyen: 0, dangKyDichVu: 0,
  });
  const [dismissed, setDismissed] = useState<Dismissed>(DEFAULT_DISMISSED);
  const [open, setOpen]           = useState<Record<string, boolean>>(DEFAULT_OPEN);
  const [hydrated, setHydrated]   = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);

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
    setToasts((prev) => [...prev.slice(-4), { id, key, diff }]);
    if (SOUND_ENABLED_KEYS.has(key)) playNotificationSound();
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, [playNotificationSound]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Real-time badges qua SSE — poll nằm ở server (không phụ thuộc tab trình duyệt
  // bị ẩn/throttle như setInterval phía client trước đây) ──
  useEffect(() => {
    function handleBadges(next: Badges) {
      if (prevBadgesRef.current) {
        const prev = prevBadgesRef.current;
        (["orders", "complaints", "withdrawals", "deposits", "banTaiNguyen", "dangKyDichVu"] as BadgeKey[]).forEach((key) => {
          const diff = next[key] - prev[key];
          if (diff > 0) addToast(key, diff);
        });
      } else {
        setDismissed((prev) => {
          const init: Dismissed = {
            orders:       prev.orders       === 0 ? next.orders       : prev.orders,
            complaints:   prev.complaints   === 0 ? next.complaints   : prev.complaints,
            withdrawals:  prev.withdrawals  === 0 ? next.withdrawals  : prev.withdrawals,
            deposits:     prev.deposits     === 0 ? next.deposits     : prev.deposits,
            banTaiNguyen: prev.banTaiNguyen === 0 ? next.banTaiNguyen : prev.banTaiNguyen,
            dangKyDichVu: prev.dangKyDichVu === 0 ? next.dangKyDichVu : prev.dangKyDichVu,
          };
          try { localStorage.setItem(LS_DISMISSED, JSON.stringify(init)); } catch { /* ignore */ }
          return init;
        });
      }

      prevBadgesRef.current = next;
      setBadges(next);
    }

    const es = new EventSource("/api/admin/badges/stream", { withCredentials: true });
    es.addEventListener("badges", (evt) => {
      try {
        handleBadges(JSON.parse((evt as MessageEvent<string>).data) as Badges);
      } catch { /* ignore malformed event */ }
    });

    return () => es.close();
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

  /** Returns true when current user can see this link. */
  function canSeeLink(link: NavLink): boolean {
    if (link.adminOnly) return isAdmin;
    if (!isAdmin && link.permission && permSet && !permSet.has(link.permission)) return false;
    return true;
  }

  function sectionHasBadge(section: NavSection) {
    return section.links.some((l) => l.badge && hasBadge(l.badge));
  }

  const orderActive        = isActive("/admin/orders");
  const orderBadgeVisible  = hasBadge("orders");
  const productSaleActive  = isActive("/admin/ban-tai-nguyen");
  const productSaleBadgeVisible = hasBadge("banTaiNguyen");
  const leadsBadgeVisible  = hasBadge("dangKyDichVu");

  const totalUnread = (["orders", "complaints", "withdrawals", "deposits", "banTaiNguyen", "dangKyDichVu"] as BadgeKey[])
    .filter((k) => hasBadge(k))
    .reduce((sum, k) => sum + Math.max(0, badges[k] - (dismissed[k] ?? 0)), 0);

  // Top-level link visibility
  const canSeeDashboard   = isAdmin || !permSet || permSet.has("dashboard:read");
  const canSeeOrders      = isAdmin || !permSet || permSet.has("orders:read");
  const canSeeLeads       = isAdmin || !permSet || permSet.has("sellers:read");
  const canSeeCmsSettings = isAdmin || !permSet || permSet.has("content:read");

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
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="Logo" width={36} height={36} className="shrink-0 rounded-lg" />
            <div>
              <p className="text-sm font-bold text-[#7C3AED] leading-tight tracking-wide">HỆ THỐNG MMO</p>
              <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">

          {/* Dashboard + tổng badge */}
          {canSeeDashboard && (() => {
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
                  style={{ background: active ? "#dbeafe" : "#f1f5f9" }}
                >
                  <LayoutDashboard size={13} strokeWidth={1.75} style={{ color: active ? "#2563eb" : "#94a3b8" }} />
                </div>
                <span className="flex-1">Dashboard</span>
                {totalUnread > 0 && <BadgeCount count={totalUnread} />}
              </Link>
            );
          })()}

          {/* Orders */}
          {canSeeOrders && (
            <Link
              href="/admin/orders"
              onClick={() => dismiss("orders")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                orderActive
                  ? "bg-[#eff6ff] text-[#1d4ed8]"
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
          )}

          {/* Bán tài nguyên */}
          {canSeeOrders && (
            <Link
              href="/admin/ban-tai-nguyen"
              onClick={() => dismiss("banTaiNguyen")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                productSaleActive
                  ? "bg-[#f0fdf4] text-[#065f46]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: productSaleActive ? "#bbf7d0" : "#f1f5f9" }}
              >
                <Package size={13} strokeWidth={1.75} style={{ color: productSaleActive ? "#059669" : "#94a3b8" }} />
              </div>
              <span className="flex-1">Bán tài nguyên</span>
              {productSaleBadgeVisible && <BadgeCount count={badges.banTaiNguyen} />}
            </Link>
          )}

          {/* Đăng ký dịch vụ */}
          {canSeeLeads && (() => {
            const leadsActive = isActive("/admin/dang-ky-dich-vu");
            return (
              <Link
                href="/admin/dang-ky-dich-vu"
                onClick={() => dismiss("dangKyDichVu")}
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
                {leadsBadgeVisible && <BadgeCount count={badges.dangKyDichVu} />}
              </Link>
            );
          })()}

          <div className="h-px bg-gray-100 my-1.5" />

          {/* Collapsible sections */}
          {SECTIONS.map((section) => {
            // Filter links user can see
            const visibleLinks = section.links.filter(canSeeLink);
            // Hide entire section if no links visible
            if (visibleLinks.length === 0) return null;

            const isOpen           = hydrated ? (open[section.key] ?? true) : true;
            const hasActive        = visibleLinks.some((l) => isActive(l.href));
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
                    {visibleLinks.map((link) => {
                      const active    = isActive(link.href);
                      const linkBadge = link.badge ? hasBadge(link.badge) : false;

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => link.badge && dismiss(link.badge)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                            active
                              ? "bg-[#eff6ff] text-[#1d4ed8] font-semibold"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                          }`}
                        >
                          <link.Icon
                            size={13}
                            strokeWidth={active ? 2 : 1.75}
                            className="shrink-0"
                            style={{ color: active ? "#2563eb" : "#94a3b8" }}
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

          {/* ── Cài đặt group ── */}
          {canSeeCmsSettings && (
            <>
              <div className="h-px bg-gray-100 my-1.5" />
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Cài đặt
              </p>
              {(() => {
                const cmsActive = isActive("/admin/cai-dat-giao-dien");
                return (
                  <Link
                    href="/admin/cai-dat-giao-dien"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      cmsActive
                        ? "bg-[#eff6ff] text-[#1d4ed8]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: cmsActive ? "#dbeafe" : "#f1f5f9" }}
                    >
                      <Monitor size={13} strokeWidth={1.75} style={{ color: cmsActive ? "#2563eb" : "#94a3b8" }} />
                    </div>
                    <span className="flex-1">Cài đặt giao diện</span>
                  </Link>
                );
              })()}
              {isAdmin && (() => {
                const sysActive = isActive("/admin/cai-dat-he-thong");
                return (
                  <Link
                    href="/admin/cai-dat-he-thong"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sysActive
                        ? "bg-[#eff6ff] text-[#1d4ed8]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: sysActive ? "#dbeafe" : "#f1f5f9" }}
                    >
                      <Settings size={13} strokeWidth={1.75} style={{ color: sysActive ? "#2563eb" : "#94a3b8" }} />
                    </div>
                    <span className="flex-1">Cài đặt ngân hàng</span>
                  </Link>
                );
              })()}
            </>
          )}
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
