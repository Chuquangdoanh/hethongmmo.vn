import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getCachedPageVisibility } from "@/lib/services/public-page-config.service";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { r2Url } from "@/lib/utils/image-url";
import { formatVnd } from "@/lib/utils/format";
import { CheckCircle, Plus, Store, Wallet, Package, TicketCheck, Send, Settings } from "lucide-react";
import { NAV_LINKS, NAV_ICONS } from "./nav-links";
import SidebarNav, { type SidebarNavGroup, type SidebarNavItem } from "./SidebarNav";
import SidebarServiceAccordion from "./SidebarServiceAccordion";
import SidebarCollapseToggle from "./SidebarCollapseToggle";
import "./sidebar.css";

const TELEGRAM_COMMUNITY_URL = "https://t.me/BossMeta789";

export default async function Sidebar() {
  const [session, pageConfigs] = await Promise.all([auth(), getCachedPageVisibility()]);
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  const hiddenSet = new Set(pageConfigs.filter((p) => !p.isVisible).map((p) => p.pageKey));
  const isPageVisible = (href: string) => !hiddenSet.has(href.replace(/^\//, ""));
  const navLabel = (href: string) => NAV_LINKS.find((l) => l.href === href)?.label ?? href;

  let balance: number | null = null;
  let avatarUrl: string | null = null;
  let openTicketCount = 0;
  if (sessionUser?.id) {
    const [row, ticketCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: sessionUser.id }, select: { balance: true, avatarUrl: true } }),
      prisma.complaint.count({ where: { userId: sessionUser.id, status: { in: ["IN_REVIEW", "PENDING_ADMIN"] } } }),
    ]);
    if (row) {
      balance = Number(row.balance);
      avatarUrl = row.avatarUrl ? r2Url(row.avatarUrl) : null;
    }
    openTicketCount = ticketCount;
  }

  const [serviceCategories, activeServiceCats] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, iconUrl: true },
    }),
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);
  const activeCatNames = new Set(activeServiceCats.map((s) => s.category).filter(Boolean));
  const svcCatMap = new Map(serviceCategories.map((c) => [c.name, c]));
  const filteredServiceCategories = [
    ...serviceCategories.filter((c) => activeCatNames.has(c.name)),
    ...[...activeCatNames]
      .filter((name) => !svcCatMap.has(name))
      .sort()
      .map((name) => ({ name, iconUrl: null as string | null })),
  ];

  const isSeller = !!sessionUser && (
    (sessionUser.role === "SELLER" && sessionUser.sellerStatus === "APPROVED")
    || sessionUser.role === "STAFF"
    || sessionUser.role === "ADMIN"
  );

  const iconBadge = (href: string) => {
    const meta = NAV_ICONS[href];
    if (!meta) return undefined;
    const { Icon, bg, color } = meta;
    return (
      <span className="sb-icon-badge" style={{ background: bg }}>
        <Icon size={15} strokeWidth={1.75} style={{ color }} />
      </span>
    );
  };

  const systemItems: SidebarNavItem[] = [
    ...(isPageVisible("khoa-hoc")       ? [{ href: "/khoa-hoc",       label: navLabel("/khoa-hoc"),       icon: iconBadge("/khoa-hoc") }] : []),
    ...(isPageVisible("tut-tricks")     ? [{ href: "/tut-tricks",     label: navLabel("/tut-tricks"),     icon: iconBadge("/tut-tricks") }] : []),
    ...(isPageVisible("kho-tai-nguyen") ? [{ href: "/kho-tai-nguyen", label: navLabel("/kho-tai-nguyen"), icon: iconBadge("/kho-tai-nguyen") }] : []),
    ...(isPageVisible("tai-nguyen-mmo") ? [{ href: "/tai-nguyen-mmo", label: navLabel("/tai-nguyen-mmo"), icon: iconBadge("/tai-nguyen-mmo") }] : []),
    ...(isPageVisible("quang-cao")      ? [{ href: "/quang-cao",      label: navLabel("/quang-cao"),      icon: iconBadge("/quang-cao") }] : []),
    ...(isPageVisible("NetWorks")       ? [{ href: "/NetWorks",       label: navLabel("/NetWorks"),       icon: iconBadge("/NetWorks") }] : []),
    ...(sessionUser ? [{
      href: isSeller ? "/ban-hang" : "/dang-ky-ban-hang",
      label: "Seller Center",
      icon: <span className="sb-icon-badge" style={{ background: "#f0fdf4" }}><Store size={15} strokeWidth={1.75} style={{ color: "#16a34a" }} /></span>,
    }] : []),
  ];

  const groups: SidebarNavGroup[] = [
    { title: "HỆ THỐNG", items: systemItems },
  ];

  if (sessionUser) {
    groups.push({
      title: "TÀI CHÍNH",
      items: [
        { href: "/nap-tien", label: "Ví & Nạp tiền", icon: <span className="sb-icon-badge" style={{ background: "#dbeafe" }}><Wallet size={15} strokeWidth={1.75} style={{ color: "#2563eb" }} /></span> },
        { href: "/don-hang", label: "Đơn hàng",       icon: <span className="sb-icon-badge" style={{ background: "#fef3c7" }}><Package size={15} strokeWidth={1.75} style={{ color: "#b45309" }} /></span> },
      ],
    });
  }

  groups.push({
    title: "HỖ TRỢ",
    items: [
      ...(sessionUser ? [{
        href: "/ho-tro",
        label: "Ticket hỗ trợ",
        icon: <span className="sb-icon-badge" style={{ background: "#eff6ff" }}><TicketCheck size={15} strokeWidth={1.75} style={{ color: "#2563eb" }} /></span>,
        badge: openTicketCount || undefined,
      }] : []),
      {
        href: TELEGRAM_COMMUNITY_URL,
        label: "Telegram cộng đồng",
        icon: <span className="sb-icon-badge" style={{ background: "#e0f2fe" }}><Send size={15} strokeWidth={1.75} style={{ color: "#0891b2" }} /></span>,
        external: true,
      },
    ],
  });

  if (sessionUser) {
    groups.push({
      title: "CÀI ĐẶT",
      items: [
        { href: "/thong-tin-ca-nhan", label: "Cài đặt tài khoản", icon: <span className="sb-icon-badge" style={{ background: "#f1f5f9" }}><Settings size={15} strokeWidth={1.75} style={{ color: "#475569" }} /></span> },
      ],
    });
  }

  const homeItem: SidebarNavItem = { href: "/", label: navLabel("/"), icon: iconBadge("/") };
  const initials = sessionUser ? (sessionUser.fullName || sessionUser.email || "").slice(0, 2).toUpperCase() : "";

  return (
    <aside className="sb-sidebar">
      <div className="sb-scroll">
        <Link href="/" className="sb-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/djmedia-logo.gif" alt="hethongmmo.vn" className="sb-brand-logo" />
          <p className="sb-label sb-brand-headline">HỆ THỐNG MMO</p>
        </Link>

        {sessionUser && (
          <div className="sb-user-card">
            <Link href="/thong-tin-ca-nhan" className="sb-user-card-link" aria-label="Thông tin tài khoản">
              <div className="sb-user-avatar">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={sessionUser.fullName ?? ""} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="sb-label sb-user-info">
                <p className="sb-user-name">Tài khoản <CheckCircle size={12} /></p>
                {balance !== null && <p className="sb-user-balance">{formatVnd(balance)}</p>}
              </div>
            </Link>
            <Link href="/nap-tien" className="sb-user-add" aria-label="Nạp tiền">
              <Plus size={14} strokeWidth={2.5} />
            </Link>
          </div>
        )}

        <nav className="sb-nav" aria-label="Điều hướng chính">
          <SidebarNav
            homeItem={homeItem}
            groups={groups}
            serviceAccordion={
              isPageVisible("dich-vu") ? (
                <SidebarServiceAccordion categories={filteredServiceCategories} />
              ) : undefined
            }
          />
        </nav>
      </div>

      <div className="sb-footer">
        <SidebarCollapseToggle className="sb-collapse-btn" variant="footer" />
      </div>
    </aside>
  );
}
