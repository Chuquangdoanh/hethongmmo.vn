import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getCachedPageVisibility } from "@/lib/services/public-page-config.service";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { r2Url } from "@/lib/utils/image-url";
import { formatVnd } from "@/lib/utils/format";
import { CheckCircle, Plus, Store, Wallet, Package, TicketCheck, Send, Settings, MessageCircleWarning, Rocket, Banknote } from "lucide-react";
import { NAV_LINKS, NAV_ICONS } from "./nav-links";
import SidebarNav, { type SidebarNavGroup, type SidebarNavItem } from "./SidebarNav";
import SidebarServiceAccordion from "./SidebarServiceAccordion";
import SidebarCollapseToggle from "./SidebarCollapseToggle";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import "./sidebar.css";

export default async function Sidebar() {
  const [session, pageConfigs, contactCms] = await Promise.all([
    auth(),
    getCachedPageVisibility(),
    getSiteContent<{ quickButtons?: { id: string; label: string; href: string }[] }>(SITE_CONTENT_KEYS.CONTACT_SUPPORT),
  ]);
  const telegramCommunityUrl = contactCms.quickButtons?.find((b) => b.id === "telegram")?.href ?? "https://t.me/BossMeta789";
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  const hiddenSet   = new Set(pageConfigs.filter((p) => !p.isVisible).map((p) => p.pageKey));
  const featuredSet = new Set(pageConfigs.filter((p) => p.isFeatured).map((p) => p.pageKey));
  const isPageVisible  = (href: string) => !hiddenSet.has(href.replace(/^\//, ""));
  const isFeaturedPage = (href: string) => featuredSet.has(href.replace(/^\//, ""));
  const navLabel = (href: string) => NAV_LINKS.find((l) => l.href === href)?.label ?? href;

  const isSeller = !!sessionUser && (
    (sessionUser.role === "SELLER" && sessionUser.sellerStatus === "APPROVED")
    || sessionUser.role === "STAFF"
    || sessionUser.role === "ADMIN"
  );

  let balance: number | null = null;
  let avatarUrl: string | null = null;
  let openTicketCount = 0;
  let sellerOpenComplaintCount = 0;
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

    if (isSeller) {
      const sellerOrderIds = (
        await prisma.order.findMany({
          where: { sellerId: sessionUser.id },
          select: { id: true },
        })
      ).map((o) => o.id);
      if (sellerOrderIds.length > 0) {
        sellerOpenComplaintCount = await prisma.complaint.count({
          where: { orderId: { in: sellerOrderIds }, status: "IN_REVIEW" },
        });
      }
    }
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

  const iconBadge = (href: string) => {
    const meta = NAV_ICONS[href];
    if (!meta) return undefined;
    const { Icon } = meta;
    return (
      <span className="sb-icon-badge">
        <Icon size={15} strokeWidth={1.75} />
      </span>
    );
  };

  const systemItems: SidebarNavItem[] = [
    ...(isPageVisible("khoa-hoc")       ? [{ href: "/khoa-hoc",       label: navLabel("/khoa-hoc"),       icon: iconBadge("/khoa-hoc"),       isFeatured: isFeaturedPage("/khoa-hoc") }]       : []),
    ...(isPageVisible("tut-tricks")     ? [{ href: "/tut-tricks",     label: navLabel("/tut-tricks"),     icon: iconBadge("/tut-tricks"),     isFeatured: isFeaturedPage("/tut-tricks") }]     : []),
    ...(isPageVisible("kho-tai-nguyen") ? [{ href: "/kho-tai-nguyen", label: navLabel("/kho-tai-nguyen"), icon: iconBadge("/kho-tai-nguyen"), isFeatured: isFeaturedPage("/kho-tai-nguyen") }] : []),
    ...(isPageVisible("tai-nguyen-mmo") ? [{ href: "/tai-nguyen-mmo", label: navLabel("/tai-nguyen-mmo"), icon: iconBadge("/tai-nguyen-mmo"), isFeatured: isFeaturedPage("/tai-nguyen-mmo") }] : []),
    ...(isPageVisible("quang-cao")      ? [{ href: "/quang-cao",      label: navLabel("/quang-cao"),      icon: iconBadge("/quang-cao"),      isFeatured: isFeaturedPage("/quang-cao") }]      : []),
    ...(isPageVisible("NetWorks")       ? [{ href: "/NetWorks",       label: navLabel("/NetWorks"),       icon: iconBadge("/NetWorks"),       isFeatured: isFeaturedPage("/NetWorks") }]       : []),
    ...(sessionUser ? [{
      href: isSeller ? "/ban-hang" : "/dang-ky-ban-hang",
      label: "Mở Gian Hàng",
      exact: true,
      icon: isSeller
        ? <span className="sb-icon-badge"><Store size={15} strokeWidth={1.75} /></span>
        : <span className="sb-icon-badge"><Rocket size={15} strokeWidth={1.75} /></span>,
    }] : []),
  ];

  const groups: SidebarNavGroup[] = [
    { title: "HỆ THỐNG", items: systemItems },
  ];

  if (sessionUser) {
    groups.push({
      title: "TÀI CHÍNH",
      items: [
        { href: "/nap-tien",    label: "Ví & Nạp tiền", icon: <span className="sb-icon-badge"><Wallet   size={15} strokeWidth={1.75} /></span> },
        { href: "/don-hang",    label: "Đơn hàng",       icon: <span className="sb-icon-badge"><Package  size={15} strokeWidth={1.75} /></span> },
        ...(isSeller ? [{
          href: "/ban-hang/vi",
          label: "Ví Seller",
          icon: <span className="sb-icon-badge"><Banknote size={15} strokeWidth={1.75} /></span>,
        }] : []),
      ],
    });
  }

  groups.push({
    title: "HỖ TRỢ",
    items: [
      ...(sessionUser ? [{
        href: "/ho-tro",
        label: "Hộp thư hỗ trợ",
        icon: <span className="sb-icon-badge"><TicketCheck size={15} strokeWidth={1.75} /></span>,
        badge: openTicketCount || undefined,
      }] : []),
      ...(isSeller ? [{
        href: "/ban-hang/khieu-nai",
        label: "Khiếu nại từ khách",
        icon: <span className="sb-icon-badge"><MessageCircleWarning size={15} strokeWidth={1.75} /></span>,
        badge: sellerOpenComplaintCount || undefined,
      }] : []),
      {
        href: telegramCommunityUrl,
        label: "Telegram cộng đồng",
        icon: <span className="sb-icon-badge"><Send size={15} strokeWidth={1.75} /></span>,
        external: true,
      },
    ],
  });

  if (sessionUser) {
    groups.push({
      title: "CÀI ĐẶT",
      items: [
        { href: "/thong-tin-ca-nhan", label: "Cài đặt tài khoản", icon: <span className="sb-icon-badge"><Settings size={15} strokeWidth={1.75} /></span> },
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
          <p className="sb-label sb-brand-headline cqd-hud-frame">HỆ THỐNG MMO</p>
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
