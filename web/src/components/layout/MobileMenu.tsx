"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import {
  X, Store, LayoutDashboard,
  Banknote, LogOut,
} from "lucide-react";
import { NAV_ICONS } from "./nav-links";

interface NavLink {
  href: string;
  label: string;
  color?: string;
  shadow?: string;
  isFeatured?: boolean;
}

interface Props {
  navLinks: NavLink[];
  isLoggedIn: boolean;
  user?: AuthenticatedUser;
  balance?: number | null;
  avatarUrl?: string | null;
}

export default function MobileMenu({ navLinks, isLoggedIn, user, balance, avatarUrl }: Props) {
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname              = usePathname();
  const navigatingRef         = useRef(false);
  const transitioningRef      = useRef(false);

  // Chặn spam-click trong lúc overlay/drawer đang transition (350ms)
  // — tránh backdrop-filter bị toggle dồn dập gây kẹt lớp blur trên mobile WebKit
  const toggleOpen = () => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setOpen((o) => !o);
    setTimeout(() => { transitioningRef.current = false; }, 350);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock — dùng CSS class để tránh visual jump khi mở/đóng
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty("--menu-scroll-y", `-${scrollY}px`);
    document.body.classList.add("menu-open");
    return () => {
      document.body.classList.remove("menu-open");
      document.documentElement.style.removeProperty("--menu-scroll-y");
      // Nếu đang navigate sang trang mới, ScrollRestorer sẽ xử lý scroll-to-top
      // Chỉ khôi phục vị trí cũ khi đóng menu mà không chuyển trang (overlay/Escape/X)
      if (!navigatingRef.current) {
        window.scrollTo(0, scrollY);
      }
      navigatingRef.current = false;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open]);

  const close = () => setOpen(false);
  // Đóng menu khi click link điều hướng — đánh dấu để không khôi phục scroll cũ
  const closeWithNav = () => { navigatingRef.current = true; setOpen(false); };

  const initials   = user ? (user.fullName || user.email).slice(0, 2).toUpperCase() : "";
  const balanceStr = mounted && balance != null ? formatVnd(balance) : null;
  const isSeller   = (user?.role === "SELLER" && user?.sellerStatus === "APPROVED") || user?.role === "STAFF" || user?.role === "ADMIN";
  const isAdmin    = user?.role === "ADMIN" || user?.role === "STAFF";

  const quickLinks: { href: string; Icon: React.ElementType; bg: string; color: string; label: string }[] = [
    ...(isSeller ? [{ href: "/ban-hang",        Icon: Store,           bg: "#f0fdf4", color: "#16a34a", label: "Bán hàng" }]    : []),
    ...(!isSeller ? [{ href: "/thong-tin-ca-nhan#seller-register", Icon: Store, bg: "#f5f3ff", color: "#7c3aed", label: "Đăng ký bán hàng" }] : []),
    ...(isAdmin  ? [{ href: "/admin/dashboard", Icon: LayoutDashboard, bg: "#ede9fe", color: "#7c3aed", label: "Admin" }]        : []),
  ];

  return (
    <>
      {/* ── Hamburger ── */}
      <button
        className={`hdr-hamburger${open ? " open" : ""}`}
        onClick={toggleOpen}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        aria-controls="hdr-mobile-drawer"
      >
        <span />
        <span />
        <span />
      </button>

      {/* ── Overlay ── */}
      <div
        className={`hdr-drawer-overlay${open ? " open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <div
        id="hdr-mobile-drawer"
        className={`hdr-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        {/* Head */}
        <div className="hdr-drawer-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/djmedia-logo.gif" alt="hethongmmo.vn" style={{ height: 28 }} />
          <button className="hdr-drawer-close" onClick={close} aria-label="Đóng menu">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* User info — clickable → thông tin cá nhân */}
        {isLoggedIn && user && (
          <div className="hdr-drawer-user">
            <Link href="/thong-tin-ca-nhan" prefetch={false} className="hdr-drawer-user-card hdr-drawer-user-card--link" onClick={closeWithNav}>
              <div className="hdr-drawer-avatar">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={user?.fullName ?? ""} className="hdr-avatar-img" />
                ) : (
                  <span className="hdr-initials">{initials}</span>
                )}
                <span className="hdr-dot" />
              </div>
              <div className="hdr-drawer-user-info">
                <div className="hdr-drawer-user-name">{user.fullName ?? user.email}</div>
                <div className="hdr-drawer-user-email">{user.email}</div>
                {balanceStr && (
                  <div className="hdr-drawer-balance">
                    <Banknote size={10} strokeWidth={2} />
                    {balanceStr}
                  </div>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Quick actions */}
        {isLoggedIn && quickLinks.length > 0 && (
          <div className="hdr-drawer-quick">
            {quickLinks.map(({ href, Icon, bg, color, label }) => (
              <Link key={href} href={href} prefetch={false} className="hdr-drawer-quick-btn" onClick={closeWithNav}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} strokeWidth={1.75} style={{ color }} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Nav links */}
        <div className="hdr-drawer-nav">
          <p className="hdr-drawer-nav-label">Điều hướng</p>
          {navLinks.map(({ href, label, isFeatured }) => {
            const meta     = NAV_ICONS[href];
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`hdr-drawer-nav-link${isActive ? " hdr-active" : ""}`}
                onClick={closeWithNav}
              >
                {meta && (
                  <span className="hdr-drawer-nav-icon" style={{ background: meta.bg }}>
                    <meta.Icon size={16} strokeWidth={1.75} style={{ color: meta.color }} />
                  </span>
                )}
                <span style={{ flex: 1 }}>{label}</span>
                {isFeatured && (
                  <span style={{ fontSize: 11, color: "#f97316", fontWeight: 700 }}>🔥</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="hdr-drawer-foot">
          {isLoggedIn ? (
            <button
              className="hdr-drawer-foot-btn hdr-foot-logout"
              onClick={() => { close(); void signOut({ callbackUrl: "/" }); }}
            >
              <LogOut size={14} strokeWidth={2.5} />
              Đăng xuất
            </button>
          ) : (
            <>
              <Link href="/dang-nhap" prefetch={false} className="hdr-drawer-foot-btn hdr-foot-login" onClick={closeWithNav}>
                Đăng nhập
              </Link>
              <Link href="/dang-ky" prefetch={false} className="hdr-drawer-foot-btn hdr-foot-register" onClick={closeWithNav}>
                Đăng ký miễn phí
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
