import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getCachedPageVisibility } from "@/lib/services/public-page-config.service";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { r2Url } from "@/lib/utils/image-url";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";
import "./header.css";

export const NAV_LINKS = [
  { href: "/",               label: "Trang chủ",     color: "#0066ff", shadow: "rgba(0,102,255,0.45)" },
  { href: "/dich-vu",        label: "Dịch vụ",       color: "#7c3aed", shadow: "rgba(124,58,237,0.45)" },
  { href: "/khoa-hoc",       label: "Khóa học",      color: "#059669", shadow: "rgba(5,150,105,0.45)" },
  { href: "/tut-tricks",     label: "TUT MMO",       color: "#dc2626", shadow: "rgba(220,38,38,0.45)" },
  { href: "/tai-nguyen-mmo", label: "Tài Nguyên",    color: "#f59e0b", shadow: "rgba(245,158,11,0.45)" },
  { href: "/quang-cao",      label: "Quảng Cáo ADS", color: "#0891b2", shadow: "rgba(8,145,178,0.45)" },
  { href: "/NetWorks",   label: "NETWORKS (ADB)",   color: "#dc2626", shadow: "rgba(220,38,38,0.45)" },
];

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
  if (sessionUser?.id) {
    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { balance: true, avatarUrl: true },
    });
    if (row) {
      balance   = Number(row.balance);
      avatarUrl = r2Url(row.avatarUrl);
    }
  }

  return (
    <header className="hdr-bar" role="banner">
      <div className="hdr-inner">

        {/* ── Logo ── */}
        <Link href="/" className="hdr-logo" aria-label="hethongmmo.vn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/djmedia-logo.gif" alt="hethongmmo.vn" />
        </Link>

        {/* ── Desktop navigation (center) ── */}
        <NavLinks links={visibleLinks} />

        {/* ── Right: auth + hamburger ── */}
        <div className="hdr-actions">
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
          />
        </div>

      </div>
    </header>
  );
}
