import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getCachedPageVisibility } from "@/lib/services/public-page-config.service";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { r2Url } from "@/lib/utils/image-url";
import { Search, Bell, TicketCheck } from "lucide-react";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import SidebarCollapseToggle from "./SidebarCollapseToggle";
import { NAV_LINKS } from "./nav-links";
import "./header.css";

export default async function Header() {
  const [session, pageConfigs] = await Promise.all([
    auth(),
    getCachedPageVisibility(),
  ]);
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  const hiddenSet   = new Set(pageConfigs.filter((p) => !p.isVisible).map((p) => p.pageKey));
  const featuredSet = new Set(pageConfigs.filter((p) => p.isFeatured).map((p) => p.pageKey));
  const visibleLinks = NAV_LINKS
    .filter((l) => !hiddenSet.has(l.href.replace(/^\//, "")))
    .map((l) => ({ ...l, isFeatured: featuredSet.has(l.href.replace(/^\//, "")) }));

  let balance: number | null = null;
  let avatarUrl: string | null = null;
  const [tutCategories, rawSvcCategories] = await Promise.all([
    prisma.tutTrickCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.serviceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, iconUrl: true },
    }),
    sessionUser?.id
      ? prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { balance: true, avatarUrl: true },
        }).then((row) => {
          if (row) {
            balance   = Number(row.balance);
            avatarUrl = r2Url(row.avatarUrl);
          }
        })
      : Promise.resolve(),
  ]);
  const serviceCategories = rawSvcCategories.map((c) => ({
    name: c.name,
    iconUrl: r2Url(c.iconUrl),
  }));

  return (
    <header className="hdr-bar" role="banner">
      <div className="hdr-inner">

        {/* ── Logo (mobile only — desktop dùng logo trong Sidebar) ── */}
        <Link href="/" className="hdr-logo" aria-label="hethongmmo.vn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/djmedia-logo.gif" alt="hethongmmo.vn" />
        </Link>

        {/* ── Thu gọn/mở rộng sidebar (desktop only) ── */}
        <SidebarCollapseToggle className="hdr-collapse-btn" variant="header" />

        {/* ── Tìm kiếm (desktop only) ── */}
        <div className="hdr-search">
          <Search size={16} strokeWidth={2} className="hdr-search-icon" />
          <input type="text" placeholder="Tìm kiếm dịch vụ, khóa học, tài nguyên..." className="hdr-search-input" />
        </div>

        {/* ── Right: icons + auth + hamburger ── */}
        <div className="hdr-actions">
          <div className="hdr-desktop-icons">
            <button type="button" className="hdr-icon-btn" aria-label="Thông báo">
              <Bell size={18} strokeWidth={1.75} />
            </button>
          
          </div>
          <div className="hdr-desktop-auth">
            {sessionUser ? (
              <UserMenu user={sessionUser} balance={balance} avatarUrl={avatarUrl} />
            ) : (
              <>
                <Link href="/dang-nhap" className="hdr-btn-login">Đăng nhập</Link>
                <Link href="/dang-ky"   className="hdr-btn-cta">Đăng ký</Link>
              </>
            )}
          </div>
          <MobileMenu
            navLinks={visibleLinks}
            isLoggedIn={!!sessionUser}
            user={sessionUser}
            balance={balance}
            avatarUrl={avatarUrl}
            tutCategories={tutCategories}
            serviceCategories={serviceCategories}
          />
        </div>

      </div>
    </header>
  );
}
