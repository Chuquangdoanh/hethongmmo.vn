"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, CreditCard, Package, ShieldCheck,
  Wallet, Megaphone, Info, ArrowLeft,
} from "lucide-react";

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
  meta: { unreadCount: number; total: number };
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  DEPOSIT:           <CreditCard   size={16} style={{ color: "#16a34a" }} />,
  PURCHASE:          <Package      size={16} style={{ color: "#7c3aed" }} />,
  ORDER_STATUS:      <Package      size={16} style={{ color: "#0284c7" }} />,
  SELLER_APPROVED:   <ShieldCheck  size={16} style={{ color: "#0284c7" }} />,
  WITHDRAWAL_STATUS: <Wallet       size={16} style={{ color: "#ea580c" }} />,
  PROMOTION:         <Megaphone    size={16} style={{ color: "#db2777" }} />,
  SYSTEM:            <Info         size={16} style={{ color: "#64748b" }} />,
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
  if (diff < 60)    return "vừa xong";
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function ThongBaoPage() {
  const router = useRouter();
  const [items, setItems]     = useState<NotifItem[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/user/notifications?limit=50", { credentials: "include" });
      if (res.status === 401) { router.replace("/dang-nhap"); return; }
      const json = (await res.json()) as ApiResponse;
      setItems(json.data ?? []);
      setUnread(json.meta?.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

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
    <div style={{ minHeight: "100dvh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "56px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "36px", height: "36px", borderRadius: "8px",
              border: "none", background: "#f1f5f9", cursor: "pointer",
            }}
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} color="#374151" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={18} color="#7c3aed" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Thông báo
            </span>
            {unread > 0 && (
              <span style={{
                fontSize: "10px", fontWeight: 700,
                background: "#ef4444", color: "#fff",
                borderRadius: "20px", padding: "1px 7px",
              }}>
                {unread} mới
              </span>
            )}
          </div>
        </div>

        {unread > 0 && (
          <button
            onClick={() => { void markAllRead(); }}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "12px", color: "#7c3aed", background: "none",
              border: "none", cursor: "pointer", fontWeight: 600, padding: "4px 8px",
            }}
          >
            <CheckCheck size={14} />
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {loading ? (
          <div style={{ padding: "60px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "80px 16px", textAlign: "center" }}>
            <Bell size={48} style={{ color: "#e2e8f0", margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>Chưa có thông báo nào</p>
          </div>
        ) : (
          <div style={{ background: "#fff", marginTop: "8px", borderRadius: "12px", overflow: "hidden" }}>
            {items.map((n, i) => (
              <button
                key={n.id}
                onClick={() => { if (!n.isRead) void markOne(n.id); }}
                style={{
                  display: "flex", gap: "12px", width: "100%",
                  padding: "14px 16px", textAlign: "left",
                  background: n.isRead ? "transparent" : "#fafaf9",
                  border: "none",
                  borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none",
                  cursor: n.isRead ? "default" : "pointer",
                }}
              >
                {/* Icon */}
                <div style={{
                  flexShrink: 0, width: "38px", height: "38px",
                  borderRadius: "10px", display: "flex", alignItems: "center",
                  justifyContent: "center", marginTop: "1px",
                  background: TYPE_BG[n.type] ?? "#f1f5f9",
                }}>
                  {TYPE_ICON[n.type] ?? <Info size={16} style={{ color: "#64748b" }} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "13px", fontWeight: n.isRead ? 500 : 700,
                    color: "#0f172a", marginBottom: "3px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{
                      fontSize: "12px", color: "#64748b", lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div style={{
                    flexShrink: 0, width: "8px", height: "8px",
                    borderRadius: "50%", background: "#7c3aed", marginTop: "8px",
                  }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
