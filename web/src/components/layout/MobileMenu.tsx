"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import {
  User, CreditCard, Package, Store, LayoutDashboard,
  Home, Wrench, GraduationCap, Lightbulb, FolderOpen, Megaphone,
  Banknote, LogOut,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  color?: string;
  shadow?: string;
}

interface MobileMenuProps {
  navLinks: NavLink[];
  isLoggedIn: boolean;
  user?: AuthenticatedUser;
  balance?: number | null;
}

// Icon + color box for each nav href
const NAV_ICON_MAP: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  "/":               { Icon: Home,          color: "#0066ff", bg: "#dbeafe" },
  "/dich-vu":        { Icon: Wrench,        color: "#7c3aed", bg: "#ede9fe" },
  "/khoa-hoc":       { Icon: GraduationCap, color: "#059669", bg: "#d1fae5" },
  "/tut-tricks":     { Icon: Lightbulb,     color: "#dc2626", bg: "#fee2e2" },
  "/tai-nguyen-mmo": { Icon: FolderOpen,    color: "#d97706", bg: "#fef3c7" },
  "/quang-cao":      { Icon: Megaphone,     color: "#0891b2", bg: "#e0f2fe" },
};

export default function MobileMenu({ navLinks, isLoggedIn, user, balance }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Prevent body scroll + restore on close
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, -parseInt(scrollY || "0", 10));
    };
  }, [open]);

  const initials  = user ? (user.fullName || user.email).slice(0, 2).toUpperCase() : "";
  const balanceStr = mounted && balance != null ? formatVnd(balance) : null;
  const isSeller  = (user?.role === "SELLER" && user?.sellerStatus === "APPROVED") || user?.role === "STAFF" || user?.role === "ADMIN";
  const isAdmin   = user?.role === "ADMIN"  || user?.role === "STAFF";

  const quickLinks: { href: string; Icon: React.ElementType; iconBg: string; iconColor: string; label: string }[] = [
    { href: "/thong-tin-ca-nhan", Icon: User,            iconBg: "#f1f5f9", iconColor: "#475569", label: "Hồ sơ" },
    { href: "/nap-tien",          Icon: CreditCard,      iconBg: "#dbeafe", iconColor: "#2563eb", label: "Nạp tiền" },
    { href: "/don-hang",          Icon: Package,         iconBg: "#fef3c7", iconColor: "#b45309", label: "Đơn hàng" },
    ...(isSeller ? [{ href: "/ban-hang",        Icon: Store,           iconBg: "#f0fdf4", iconColor: "#16a34a", label: "Bán hàng" }]    : []),
    ...(isAdmin  ? [{ href: "/admin/dashboard", Icon: LayoutDashboard, iconBg: "#ede9fe", iconColor: "#7c3aed", label: "Admin" }]        : []),
  ];

  return (
    <div className="md:hidden">
      {/* ── Hamburger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          cursor: "pointer",
          background: open ? "#1e293b" : "#f1f5f9",
          border: "none",
          padding: "9px 11px",
          borderRadius: "12px",
          transition: "background 0.25s ease",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: "20px",
              height: "2px",
              background: open ? "#ffffff" : "#0f172a",
              borderRadius: "2px",
              display: "block",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              transform:
                open && i === 0 ? "translateY(7px) rotate(45deg)"  :
                open && i === 2 ? "translateY(-7px) rotate(-45deg)" :
                "none",
              opacity: open && i === 1 ? 0 : 1,
            }}
          />
        ))}
      </button>

      {/* ── Backdrop overlay ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 998,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* ── Dropdown card ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            left: "12px",
            right: "12px",
            zIndex: 999,
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1.5px rgba(255,255,255,0.8)",
            overflow: "hidden",
            maxHeight: "calc(100dvh - 90px)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            animation: "slideDownCard 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards",
          }}
        >
          {/* ── User profile header ── */}
          {isLoggedIn && user && (
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a3460 100%)", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {/* Avatar */}
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)", position: "relative",
                }}>
                  <span style={{ color: "white", fontSize: "15px", fontWeight: "800", lineHeight: 1 }}>
                    {initials}
                  </span>
                  <span style={{
                    position: "absolute", width: "11px", height: "11px",
                    right: 0, bottom: 0, borderRadius: "50%",
                    background: "#22c55e", border: "2px solid #0f172a",
                    animation: "active-status 2s ease-in-out infinite",
                  }} />
                </div>

                {/* Name + email + balance */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: "white", fontWeight: "700", fontSize: "15px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.fullName ?? user.email}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                    {user.email}
                  </div>
                  {balanceStr && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "8px",
                      background: "linear-gradient(135deg,#16a34a,#15803d)",
                      borderRadius: "20px", padding: "4px 12px",
                      fontSize: "12px", fontWeight: "700", color: "white",
                    }}>
                      <Banknote size={12} strokeWidth={2} />
                      {balanceStr}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Quick action grid ── */}
          {isLoggedIn && quickLinks.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "12px 12px 4px" }}>
              {quickLinks.map(({ href, Icon, iconBg, iconColor, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "12px",
                    background: "#f8fafc", color: "#0f172a",
                    fontWeight: "600", fontSize: "13px",
                    textDecoration: "none", transition: "background 0.15s",
                    border: "1px solid #f1f5f9",
                  }}
                  onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.background = "#e2e8f0"; }}
                  onTouchEnd={(e)   => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e2e8f0"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                >
                  {/* Colored icon box — matches UserMenu style */}
                  <span style={{
                    width: "30px", height: "30px", borderRadius: "8px",
                    background: iconBg, display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.75} style={{ color: iconColor }} />
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* ── Divider ── */}
          <div style={{ height: "1px", background: "#f1f5f9", margin: isLoggedIn ? "8px 12px" : "8px 12px 4px" }} />

          {/* ── Nav links ── */}
          <div style={{ padding: "4px 10px 6px" }}>
            <p style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 6px 6px" }}>
              Điều hướng
            </p>
            {navLinks.map(({ href, label }) => {
              const meta = NAV_ICON_MAP[href];
              const NavIcon = meta?.Icon;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "9px 10px", borderRadius: "12px",
                    color: "#0f172a", fontWeight: "600", fontSize: "14px",
                    textDecoration: "none", transition: "background 0.15s", marginBottom: "2px",
                  }}
                  onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
                  onTouchEnd={(e)   => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Colored icon box */}
                  <span style={{
                    width: "32px", height: "32px", borderRadius: "9px",
                    background: meta?.bg ?? "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {NavIcon && <NavIcon size={16} strokeWidth={1.75} style={{ color: meta?.color ?? "#0066ff" }} />}
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* ── Auth buttons (guest) ── */}
          {!isLoggedIn && (
            <div style={{ padding: "4px 12px 16px", display: "flex", gap: "8px" }}>
              <Link
                href="/dang-nhap"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: "14px",
                  fontWeight: "700", fontSize: "14px", textAlign: "center",
                  textDecoration: "none", background: "#f1f5f9", color: "#0f172a",
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/dang-ky"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: "14px",
                  fontWeight: "700", fontSize: "14px", textAlign: "center",
                  textDecoration: "none",
                  background: "linear-gradient(135deg,#0066ff 0%,#0d3b8f 100%)",
                  color: "#ffffff", boxShadow: "0 4px 12px rgba(0,102,255,0.35)",
                }}
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* ── Logout (logged in) ── */}
          {isLoggedIn && (
            <div style={{ padding: "0 12px 16px" }}>
              <button
                onClick={() => { setOpen(false); void signOut({ callbackUrl: "/" }); }}
                style={{
                  width: "100%", padding: "13px", borderRadius: "14px",
                  fontWeight: "700", fontSize: "14px", border: "none", cursor: "pointer",
                  background: "#fef2f2", color: "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
              >
                <LogOut size={15} strokeWidth={2.5} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
