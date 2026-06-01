import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";

export const NAV_LINKS = [
  { href: "/",               label: "Trang chủ", color: "linear-gradient(135deg,#0066ff,#0d3b8f)", shadow: "rgba(0,102,255,0.45)" },
  { href: "/dich-vu",        label: "Dịch vụ",   color: "linear-gradient(135deg,#7c3aed,#4c1d95)", shadow: "rgba(124,58,237,0.45)" },
  { href: "/khoa-hoc",       label: "Khóa học",  color: "linear-gradient(135deg,#059669,#064e3b)", shadow: "rgba(5,150,105,0.45)" },
  { href: "/tut-tricks",     label: "TUT MMO",   color: "linear-gradient(135deg,#dc2626,#7f1d1d)", shadow: "rgba(220,38,38,0.45)" },
  { href: "/tai-nguyen-mmo", label: "Tài Nguyên",color: "linear-gradient(135deg,#f59e0b,#92400e)", shadow: "rgba(245,158,11,0.45)" },
  { href: "/quang-cao",      label: "Quảng Cáo ADS", color: "linear-gradient(135deg,#0891b2,#164e63)", shadow: "rgba(8,145,178,0.45)" },
  
];

export default async function Header() {
  const session = await auth();
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  let balance: number | null = null;
  if (sessionUser?.id) {
    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { balance: true },
    });
    if (row) balance = Number(row.balance);
  }

  return (
    <div className="sticky top-0 z-[1000]">
      <header
        className="main-header-shell"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "8px 24px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <nav
            className="main-header-nav"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 5px 5px 14px",
              position: "relative",
              background: "#ffffff",
              borderRadius: "999px",
              border: "1.5px solid rgba(255,255,255,0.92)",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.09),0 1px 4px rgba(0,0,0,0.05),0 0 0 4px rgba(255,255,255,0.55),0 0 0 10px rgba(255,255,255,0.25),0 0 0 20px rgba(255,255,255,0.08)",
            }}
          >
            {/* Logo */}
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "800",
                fontSize: "17px",
                color: "#0f172a",
                textDecoration: "none",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/djmedia-logo.gif"
                alt="Logo"
                style={{ height: "36px", width: "auto", display: "block" }}
              />
            </Link>

            {/* Desktop nav — client component handles active state + indicator */}
            <NavLinks links={NAV_LINKS} />

            {/* Auth area */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Desktop only: UserMenu / login button */}
              <div className="hidden md:flex items-center">
                {sessionUser ? (
                  <UserMenu user={sessionUser} balance={balance} />
                ) : (
                  <Link
                    href="/dang-nhap"
                    style={{
                      background: "linear-gradient(135deg,#0066ff 0%,#0d3b8f 100%)",
                      color: "white",
                      padding: "8px 18px",
                      borderRadius: "999px",
                      textDecoration: "none",
                      fontWeight: "700",
                      fontSize: "13px",
                      boxShadow: "0 4px 12px rgba(0,102,255,0.2)",
                      whiteSpace: "nowrap",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>

              {/* Mobile hamburger — carries user info for dropdown */}
              <MobileMenu
                navLinks={NAV_LINKS}
                isLoggedIn={!!sessionUser}
                user={sessionUser}
                balance={balance}
              />
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
