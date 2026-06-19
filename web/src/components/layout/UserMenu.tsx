"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { User, CreditCard, Package, Store, LayoutDashboard, LogOut, TicketCheck, Bell, ShieldCheck } from "lucide-react";

interface UserMenuProps {
  user: AuthenticatedUser;
  balance: number | null;
  avatarUrl?: string | null;
}

export default function UserMenu({ user, balance, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isSeller = (user.role === "SELLER" && user.sellerStatus === "APPROVED") || user.role === "STAFF" || user.role === "ADMIN";
  const isAdmin  = user.role === "ADMIN"  || user.role === "STAFF";
  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();
  const balanceStr = mounted && balance !== null ? formatVnd(balance) : null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: open ? "#f1f5f9" : "#f8fafc",
          border: "1px solid rgba(0,0,0,0.09)",
          borderRadius: "999px",
          cursor: "pointer",
          padding: "5px 14px 5px 5px",
          height: "38px",
          transition: "background 0.15s",
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={user.fullName ?? ""} style={{
              width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover",
            }} />
          ) : (
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontSize: "11px", fontWeight: "800", lineHeight: 1 }}>
                {initials}
              </span>
            </div>
          )}
          <span style={{
            position: "absolute",
            width: "8px", height: "8px", right: 0, bottom: 0,
            borderRadius: "50%", background: "#22c55e", outline: "2px solid #f8fafc",
          }} />
        </div>

        {/* Label + balance */}
        <span style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          color: "#1e293b",
        }}>
          Tài khoản
          {balanceStr && (
            <span style={{
              fontSize: "11px",
              padding: "0 7px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg,#16a34a,#15803d)",
              borderRadius: "20px",
              color: "white",
              fontWeight: "700",
            }}>
              {balanceStr}
            </span>
          )}
        </span>
      </button>

      {/* ── Dropdown menu ── */}
      {open && (
        <div
          className="profile-menu"
          style={{
            display: "block",
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            backgroundColor: "#fff",
            minWidth: "200px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.11)",
            borderRadius: "12px",
            padding: "6px",
            zIndex: 1000,
            border: "1px solid rgba(0,0,0,0.07)",
            animation: "fadeDropdown 0.2s ease forwards",
          }}
        >
          {/* Balance header */}
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "12px",
            color: "#475569",
            fontWeight: "500",
            background: "linear-gradient(135deg,#f8faff,#eef2ff)",
            borderRadius: "8px 8px 0 0",
            margin: "-6px -6px 0 -6px",
          }}>
            Số dư tài khoản
            {balanceStr && (
              <strong style={{
                color: "#0066ff",
                fontWeight: "700",
                display: "block",
                marginTop: "2px",
                fontSize: "13px",
              }}>
                {balanceStr}
              </strong>
            )}
          </div>

          <MenuItem href="/thong-tin-ca-nhan" Icon={User}          iconBg="#f1f5f9" iconColor="#475569" label="Hồ sơ cá nhân" onClick={() => setOpen(false)} />
          <MenuItem href="/don-hang"          Icon={Package}      iconBg="#fef3c7" iconColor="#b45309" label="Đơn hàng"      onClick={() => setOpen(false)} />
          <MenuItem href="/ho-tro"             Icon={TicketCheck}  iconBg="#eff6ff" iconColor="#2563eb" label="Ticket hỗ trợ" onClick={() => setOpen(false)} />
          <MenuItem href="/thong-bao"         Icon={Bell}         iconBg="#f0fdf4" iconColor="#16a34a" label="Thông báo"     onClick={() => setOpen(false)} />
          <MenuItem href="/nap-tien"          Icon={CreditCard}   iconBg="#dbeafe" iconColor="#0891b2" label="Nạp tiền"      onClick={() => setOpen(false)} />
          <MenuItem href="/thong-tin-ca-nhan#bao-mat" Icon={ShieldCheck} iconBg="#fdf4ff" iconColor="#9333ea" label="Bảo mật" onClick={() => setOpen(false)} />

          {isSeller ? (
            <MenuItem href="/ban-hang" Icon={Store} iconBg="#f0fdf4" iconColor="#16a34a" label="Bán Hàng" onClick={() => setOpen(false)} />
          ) : (
            <MenuItem href="/thong-tin-ca-nhan#seller-register" Icon={Store} iconBg="#f5f3ff" iconColor="#7c3aed" label="Đăng Ký Bán Hàng" onClick={() => setOpen(false)} />
          )}
          {isAdmin && (
            <MenuItem href="/admin/dashboard" Icon={LayoutDashboard} iconBg="#ede9fe" iconColor="#7c3aed" label="Admin Panel" onClick={() => setOpen(false)} />
          )}

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "4px", paddingTop: "4px" }}>
            <LogoutBtn onLogout={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  Icon,
  iconBg,
  iconColor,
  label,
  onClick,
}: {
  href: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        color: "#0f172a",
        padding: "7px 10px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        fontWeight: "500",
        textDecoration: "none",
        borderRadius: "8px",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
        (e.currentTarget as HTMLElement).style.color = "#0066ff";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#0f172a";
      }}
    >
      <span style={{
        width: "30px",
        height: "30px",
        borderRadius: "8px",
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={15} strokeWidth={1.75} style={{ color: iconColor }} />
      </span>
      {label}
    </Link>
  );
}

function LogoutBtn({ onLogout }: { onLogout: () => void }) {
  async function handleLogout() {
    onLogout();
    try {
      await fetch("/api/auth/logout", { credentials: "include", method: "POST" });
    } catch {
      // proceed with signOut even if denylist call fails
    }
    void signOut({ callbackUrl: "/" });
  }

  return (
    <button
      onClick={() => { void handleLogout(); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "7px 10px",
        background: "#fef2f2",
        color: "#dc2626",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{
        width: "30px",
        height: "30px",
        borderRadius: "8px",
        background: "#fee2e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <LogOut size={15} strokeWidth={2} style={{ color: "#dc2626" }} />
      </span>
      Đăng xuất
    </button>
  );
}
