"use client";

import { useState, useEffect, useRef } from "react";

// ─── CẤU HÌNH LIÊN LẠC ────────────────────────────────────────────────────────
// Thêm / xoá / sửa link tại đây
const CONTACT_ITEMS = [
  {
    id: "facebook",
    title: "Facebook Support",
    subtitle: "Fanpage hỗ trợ 24/7",
    href: "https://facebook.com/chuquangdoanh",
    bg: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.793-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.097 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "zalo",
    title: "Zalo Community",
    subtitle: "Kết nối cộng đồng Zalo",
    href: "https://zalo.me/0000000000",
    bg: "#0068FF",
    icon: (
      <svg viewBox="0 0 48 48" fill="currentColor" width={22} height={22}>
        <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm6 28h-2.5v-7c0-1.1-.9-2-2-2s-2 .9-2 2v7H21V19h2.5v1.1c.8-.7 1.85-1.1 3-1.1 2.49 0 4.5 2.01 4.5 4.5V32zm-12 0h-2.5V19H18v13zm-1.25-15.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    title: "TikTok Channel",
    subtitle: "Video & Livestream",
    href: "https://tiktok.com/@chuquangdoanh",
    bg: "#010101",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z" />
      </svg>
    ),
  },
  {
    id: "Telegram",
    title: "Telegram Group",
    subtitle: "Kết nối với cộng đồng",
    href: "https://t.me/chuquangdoanh",
    bg: "#0088CC",
    icon: (
     <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>

    ),
  },
];
// ──────────────────────────────────────────────────────────────────────────────

export default function StickyContactMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div
        ref={menuRef}
        className="scm-wrapper"
        style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          userSelect: "none",
        }}
      >
        {/* ── CARD MỞ ── */}
        {open && (
          <div
            className="scm-card"
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 40px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08)",
              padding: "12px 12px 0",
              minWidth: 268,
              overflow: "hidden",
            }}
          >
            {/* Danh sách */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {CONTACT_ITEMS.map((item, idx) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`scm-item-link scm-row`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 6px",
                    borderRadius: 12,
                    textDecoration: "none",
                    transition: "background .15s",
                    animationDelay: `${idx * 50}ms`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f5f5f7")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Icon */}
                  <div
                    className="scm-item-icon"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: item.bg,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "transform .18s ease",
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Text */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="scm-item-text-title"
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111",
                        lineHeight: 1.3,
                        transition: "color .15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Nút đóng */}
            <div style={{ padding: "12px 0 14px" }}>
              <button
                onClick={() => setOpen(false)}
                className="scm-close-btn"
                style={{
                  width: "100%",
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  padding: "11px 0",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "background .15s",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  width={15}
                  height={15}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                ĐÓNG MENU
              </button>
            </div>
          </div>
        )}

        {/* ── NÚT MỞ (khi đóng) ── */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="scm-trigger"
            aria-label="Mở menu liên hệ"
            style={{
              background: "linear-gradient(135deg,#1A1A1A 0%,#1A1A1A 50%)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "12px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              boxShadow: "0 4px 20px rgba(99,102,241,.45)",
              transition: "transform .2s ease, box-shadow .2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {/* Headset icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={18}
              height={18}
            >
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
            </svg>
            Liên hệ hỗ trợ
          </button>
        )}
      </div>
  );
}
