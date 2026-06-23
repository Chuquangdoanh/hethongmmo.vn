"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface NotifItem {
  id: string;
  title: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Toast {
  id: string;
  title: string;
  variant: "green" | "blue";
}

const TOAST_TITLES = new Set(["Đăng ký thành công !", "Đăng nhập thành công"]);

export default function ToastNotification() {
  const { status } = useSession();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const shownIds = useRef<Set<string>>(new Set());
  const prevStatus = useRef<string>(status);

  useEffect(() => {
    const wasNotAuth = prevStatus.current !== "authenticated";
    const isNowAuth  = status === "authenticated";
    prevStatus.current = status;

    if (!wasNotAuth || !isNowAuth) return;

    // Vừa authenticate (login hoặc page load với session mới)
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/user/notifications?limit=5", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: NotifItem[] };
        const now = Date.now();

        for (const n of json.data ?? []) {
          if (shownIds.current.has(n.id)) continue;
          if (n.isRead) continue;
          if (n.type !== "SYSTEM") continue;
          if (!TOAST_TITLES.has(n.title)) continue;
          // Chỉ hiện nếu notification mới tạo < 90 giây
          if (now - new Date(n.createdAt).getTime() > 90_000) continue;

          shownIds.current.add(n.id);
          const variant = n.title.includes("ký") ? "green" : "blue";
          setToasts((prev) => [...prev, { id: n.id, title: n.title, variant }]);

          // Đánh dấu đã đọc ngay
          void fetch("/api/user/notifications", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "markOne", notificationId: n.id }),
          });
        }
      } catch { /* ignore */ }
    }

    // Delay nhỏ để DB commit xong sau redirect
    const t = setTimeout(() => { void check(); }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: "76px", right: "16px",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px",
      pointerEvents: "none",
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  const isGreen = toast.variant === "green";
  const bg     = isGreen ? "#f0fdf4" : "#eff6ff";
  const border = isGreen ? "#bbf7d0" : "#bfdbfe";
  const color  = isGreen ? "#15803d" : "#1d4ed8";
  const iconBg = isGreen ? "#dcfce7" : "#dbeafe";

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      pointerEvents: "all",
      display: "flex", alignItems: "center", gap: "10px",
      background: bg, border: `1px solid ${border}`, borderRadius: "12px",
      padding: "12px 14px", minWidth: "260px", maxWidth: "320px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      transform: visible ? "translateX(0)" : "translateX(130%)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        background: iconBg, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>
        <CheckCircle size={17} style={{ color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color, margin: 0, lineHeight: 1.3 }}>
          {toast.title}
        </p>
      </div>

      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color, opacity: 0.55, padding: "2px", flexShrink: 0,
          display: "flex", alignItems: "center",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
