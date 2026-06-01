"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { User, CreditCard, Package, Store, LayoutDashboard } from "lucide-react";

interface UserMenuProps {
  user: AuthenticatedUser;
  balance: number | null;
}

export default function UserMenu({ user, balance }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isSeller = user.role === "SELLER" || user.role === "STAFF" || user.role === "ADMIN";
  const isAdmin  = user.role === "ADMIN"  || user.role === "STAFF";
  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();
  // Only format after mount to avoid SSR/browser Intl mismatch
  const balanceStr = mounted && balance !== null ? formatVnd(balance) : null;

  return (
    <div ref={ref} className="relative profile-dropdown" style={{ display: "inline-block" }}>
      {/* ── Profile pill (button-message design) ── */}
      <button
        id="btn-message"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-haspopup="true"
        aria-expanded={open}
        className="button-message"
        style={{
          ["--text-color" as string]: "#ffffff",
          ["--bg-color-sup" as string]: "#334155",
          ["--bg-color" as string]: "#1e293b",
          ["--bg-hover-color" as string]: "#0f172a",
          ["--online-status" as string]: "#22c55e",
          ["--font-size" as string]: "13px",
          ["--btn-transition" as string]: "all 0.2s ease-out",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, sans-serif",
          boxShadow: "0 0 2px rgba(0,0,0,.05),0 2px 8px rgba(0,0,0,.10),0 4px 16px rgba(0,0,0,.09)",
          backgroundColor: "#1e293b",
          borderRadius: "68px",
          cursor: "pointer",
          padding: hovered ? "8px 18px 8px 8px" : "5px 10px 5px 5px",
          height: hovered ? "54px" : "38px",
          border: "0",
          overflow: "hidden",
          position: "relative",
          transition: "all 0.2s ease-out",
          width: "fit-content",
        }}
      >
        {/* Avatar */}
        <div style={{
          width: hovered ? "38px" : "28px",
          height: hovered ? "38px" : "28px",
          position: "relative",
          flexShrink: 0,
          transition: "all 0.2s ease-out",
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: "11px", fontWeight: "800", lineHeight: 1 }}>
              {initials}
            </span>
          </div>
          {/* Online dot */}
          <span style={{
            position: "absolute",
            width: hovered ? "10px" : "7px",
            height: hovered ? "10px" : "7px",
            right: 0,
            bottom: 0,
            borderRadius: "50%",
            outline: `solid 2px ${hovered ? "#0f172a" : "#1e293b"}`,
            backgroundColor: "#22c55e",
            transition: "all 0.2s ease-out",
            animation: "active-status 2s ease-in-out infinite",
            zIndex: 1,
          }} />
        </div>

        {/* Text content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingLeft: "8px",
          textAlign: "initial",
          color: "#ffffff",
          overflow: "hidden",
        }}>
          {hovered ? (
            <>
              <span style={{
                fontSize: "13px",
                fontWeight: "700",
                whiteSpace: "nowrap",
                letterSpacing: "normal",
                opacity: 1,
                transform: "translateY(0)",
                transition: "all 0.2s ease-out",
                color: "#ffffff",
              }}>
                {user.fullName ?? user.email}
              </span>
              <span style={{
                fontSize: "11px",
                letterSpacing: "normal",
                opacity: 1,
                transform: "translateY(0)",
                transition: "all 0.2s ease-out",
                color: "#94a3b8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "160px",
              }}>
                {user.email}
              </span>
            </>
          ) : (
            <span style={{
              display: "flex",
              alignItems: "center",
              fontSize: "13px",
              fontWeight: "600",
              whiteSpace: "nowrap",
              color: "#ffffff",
              gap: "6px",
            }}>
              Tài khoản
              {balanceStr && (
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "11px",
                  padding: "0 7px",
                  height: "18px",
                  background: "linear-gradient(135deg,#16a34a,#15803d)",
                  borderRadius: "20px",
                  color: "white",
                  fontWeight: "700",
                }}>
                  {balanceStr}
                </span>
              )}
            </span>
          )}
        </div>
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

          <MenuItem href="/thong-tin-ca-nhan" Icon={User}          iconBg="#f1f5f9" iconColor="#475569" label="Hồ sơ"       onClick={() => setOpen(false)} />
          <MenuItem href="/nap-tien"          Icon={CreditCard}   iconBg="#dbeafe" iconColor="#2563eb" label="Nạp tiền"    onClick={() => setOpen(false)} />
          <MenuItem href="/don-hang"          Icon={Package}      iconBg="#fef3c7" iconColor="#b45309" label="Đơn hàng"   onClick={() => setOpen(false)} />

          {isSeller && (
            <MenuItem href="/ban-hang" Icon={Store} iconBg="#f0fdf4" iconColor="#16a34a" label="Bán hàng" onClick={() => setOpen(false)} />
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
  return (
    <button
      onClick={() => { onLogout(); void signOut({ callbackUrl: "/" }); }}
      className="Btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "45px",
        height: "45px",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s",
        boxShadow: "2px 2px 10px rgba(0,0,0,0.2)",
        backgroundColor: "rgb(255,65,65)",
        padding: "0",
        margin: "4px 6px",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.width = "125px";
        el.style.borderRadius = "40px";
        const text = el.querySelector<HTMLSpanElement>(".btn-text");
        const sign = el.querySelector<HTMLSpanElement>(".btn-sign");
        if (text) { text.style.opacity = "1"; text.style.width = "70%"; text.style.paddingRight = "10px"; }
        if (sign) { sign.style.width = "30%"; sign.style.paddingLeft = "20px"; }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.width = "45px";
        el.style.borderRadius = "50%";
        const text = el.querySelector<HTMLSpanElement>(".btn-text");
        const sign = el.querySelector<HTMLSpanElement>(".btn-sign");
        if (text) { text.style.opacity = "0"; text.style.width = "0%"; text.style.paddingRight = "0"; }
        if (sign) { sign.style.width = "100%"; sign.style.paddingLeft = "0"; }
      }}
    >
      <span className="btn-sign" style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s",
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </span>
      <span className="btn-text" style={{
        position: "absolute",
        right: "0%",
        width: "0%",
        opacity: 0,
        color: "white",
        fontSize: "1em",
        fontWeight: "600",
        transition: "all 0.3s",
        whiteSpace: "nowrap",
      }}>
        Đăng xuất
      </span>
    </button>
  );
}
