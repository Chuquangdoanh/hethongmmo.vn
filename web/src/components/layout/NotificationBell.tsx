"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, CreditCard, Package, ShieldCheck, Wallet, Megaphone, Info } from "lucide-react";

interface NotifItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface ApiResponse {
  data: NotifItem[];
  meta: { unreadCount: number };
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  DEPOSIT:           <CreditCard   size={14} style={{ color: "#16a34a" }} />,
  PURCHASE:          <Package      size={14} style={{ color: "#7c3aed" }} />,
  ORDER_STATUS:      <Package      size={14} style={{ color: "#0284c7" }} />,
  SELLER_APPROVED:   <ShieldCheck  size={14} style={{ color: "#0284c7" }} />,
  WITHDRAWAL_STATUS: <Wallet       size={14} style={{ color: "#ea580c" }} />,
  PROMOTION:         <Megaphone    size={14} style={{ color: "#db2777" }} />,
  SYSTEM:            <Info         size={14} style={{ color: "#64748b" }} />,
};

const TYPE_BG: Record<string, string> = {
  DEPOSIT:           "#dcfce7",
  PURCHASE:          "#f5f3ff",
  ORDER_STATUS:      "#e0f2fe",
  SELLER_APPROVED:   "#e0f2fe",
  WITHDRAWAL_STATUS: "#fff7ed",
  PROMOTION:         "#fdf2f8",
  SYSTEM:            "#f1f5f9",
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [items, setItems]         = useState<NotifItem[]>([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const dropRef                   = useRef<HTMLDivElement>(null);

  // Fetch unread count (poll mỗi 30s)
  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/api/user/notifications?limit=1", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as ApiResponse;
        setUnread(json.meta?.unreadCount ?? 0);
      } catch { /* network error — bỏ qua */ }
    }

    void fetchCount();
    const id = setInterval(() => { void fetchCount(); }, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleToggle() {
    if (open) { setOpen(false); return; }

    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/user/notifications?limit=15", { credentials: "include" });
      const json = (await res.json()) as ApiResponse;
      setItems(json.data ?? []);
      setUnread(json.meta?.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/user/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAll" }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await fetch("/api/user/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markOne", notificationId: id }),
    });
  }

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => { void handleToggle(); }}
        className="hdr-icon-btn"
        aria-label="Thông báo"
        style={{ position: "relative" }}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "2px", right: "2px",
            minWidth: "16px", height: "16px",
            background: "#ef4444", color: "#fff",
            fontSize: "9px", fontWeight: 700,
            borderRadius: "999px", padding: "0 3px",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1, outline: "2px solid #fff",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "340px", background: "#fff",
          border: "1px solid #e2e8f0", borderRadius: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 1100, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Thông báo {unread > 0 && (
                <span style={{
                  marginLeft: "6px", fontSize: "10px", fontWeight: 700,
                  background: "#ef4444", color: "#fff",
                  borderRadius: "20px", padding: "1px 6px",
                }}>
                  {unread} mới
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={() => { void markAllRead(); }}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  fontSize: "11px", color: "#7c3aed", background: "none",
                  border: "none", cursor: "pointer", fontWeight: 600,
                }}
              >
                <CheckCheck size={13} /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <Bell size={28} style={{ color: "#e2e8f0", margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có thông báo nào</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) void markOne(n.id); }}
                  style={{
                    display: "flex", gap: "10px", width: "100%",
                    padding: "12px 16px", textAlign: "left",
                    background: n.isRead ? "transparent" : "#fafaf9",
                    border: "none", borderBottom: "1px solid #f8fafc",
                    cursor: n.isRead ? "default" : "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!n.isRead) (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.isRead ? "transparent" : "#fafaf9"; }}
                >
                  {/* Icon */}
                  <div style={{
                    flexShrink: 0, width: "30px", height: "30px",
                    borderRadius: "8px", display: "flex", alignItems: "center",
                    justifyContent: "center", marginTop: "1px",
                    background: TYPE_BG[n.type] ?? "#f1f5f9",
                  }}>
                    {TYPE_ICON[n.type] ?? <Info size={14} style={{ color: "#64748b" }} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "12px", fontWeight: n.isRead ? 500 : 700,
                      color: "#0f172a", marginBottom: "2px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{
                        fontSize: "11px", color: "#64748b", lineHeight: 1.4,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div style={{
                      flexShrink: 0, width: "7px", height: "7px",
                      borderRadius: "50%", background: "#7c3aed", marginTop: "6px",
                    }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
