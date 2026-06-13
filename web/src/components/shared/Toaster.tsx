"use client";

import { useEffect, useState, useCallback } from "react";

// ── Toast store (module-level, không cần React Context) ───────────────────────

export type ToastType = "success" | "warning" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
  duration: number;    // ms tự động ẩn
  retryAfter?: number; // seconds — hiện countdown nếu có
}

type Listener = (items: ToastItem[]) => void;

let _items: ToastItem[] = [];
const _subs = new Set<Listener>();
const _notify = () => _subs.forEach((fn) => fn([..._items]));

function _remove(id: string) {
  _items = _items.filter((t) => t.id !== id);
  _notify();
}

function _add(item: Omit<ToastItem, "id">): string {
  const id = Math.random().toString(36).slice(2);
  _items = [..._items, { ...item, id }];
  _notify();
  // Failsafe: dọn dẹp từ store sau duration + thời gian animation exit
  setTimeout(() => _remove(id), item.duration + 500);
  return id;
}

export const toast = {
  success: (title: string, body?: string) =>
    _add({ type: "success", title, body, duration: 3500 }),
  error: (title: string, body?: string) =>
    _add({ type: "error", title, body, duration: 5000 }),
  info: (title: string, body?: string) =>
    _add({ type: "info", title, body, duration: 3500 }),
  /**
   * @param retryAfter giây countdown — nếu truyền vào, toast tự đếm ngược và
   *   tự đóng sau đúng retryAfter giây thay vì mặc định 4s.
   */
  warn: (title: string, body?: string, retryAfter?: number) =>
    _add({
      type: "warning",
      title,
      body,
      duration: retryAfter ? retryAfter * 1000 : 4000,
      retryAfter,
    }),
};

// ── Styles per type ───────────────────────────────────────────────────────────

const STYLE: Record<ToastType, { border: string; iconBg: string; bar: string; icon: string }> = {
  success: { border: "border-emerald-300", iconBg: "bg-emerald-500", bar: "bg-emerald-400", icon: "✓" },
  warning: { border: "border-amber-300",   iconBg: "bg-amber-500",   bar: "bg-amber-400",   icon: "⏳" },
  error:   { border: "border-red-300",     iconBg: "bg-red-500",     bar: "bg-red-400",     icon: "✕" },
  info:    { border: "border-blue-300",    iconBg: "bg-blue-500",    bar: "bg-blue-400",    icon: "ℹ" },
};

// ── ToastCard ─────────────────────────────────────────────────────────────────

function ToastCard({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: () => void;
}) {
  const [entered,  setEntered]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [progress, setProgress] = useState(100);
  const [remaining, setRemaining] = useState(item.retryAfter ?? 0);

  const s = STYLE[item.type];

  // Slide-in: defer 1 frame để CSS transition hoạt động
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto exit khi hết duration
  useEffect(() => {
    const t = setTimeout(() => setExiting(true), item.duration);
    return () => clearTimeout(t);
  }, [item.duration]);

  // Sau khi exit animation xong → unmount
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onRemove, 280);
    return () => clearTimeout(t);
  }, [exiting, onRemove]);

  // Progress bar + countdown mỗi 100ms
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / item.duration) * 100));
      if (item.retryAfter) {
        setRemaining(Math.max(0, item.retryAfter - Math.floor(elapsed / 1000)));
      }
    }, 100);
    return () => clearInterval(iv);
  }, [item.duration, item.retryAfter]);

  const dismiss = useCallback(() => setExiting(true), []);

  const isVisible = entered && !exiting;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl shadow-lg border bg-white",
        s.border,
        "transition-all duration-[280ms] ease-out will-change-transform",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-3">
        {/* Icon */}
        <span
          className={[
            "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
            "text-xs font-bold text-white",
            s.iconBg,
          ].join(" ")}
        >
          {s.icon}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">
            {item.title}
            {item.retryAfter !== undefined && remaining > 0 && (
              <span className="ml-1.5 tabular-nums text-amber-600 font-bold">
                {remaining}s
              </span>
            )}
          </p>
          {item.body && (
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.body}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Đóng thông báo"
          className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-[11px] leading-none"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        className={["h-[3px] transition-none", s.bar].join(" ")}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Toaster — mount 1 lần trong root layout ───────────────────────────────────

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _subs.add(setItems);
    return () => { _subs.delete(setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ width: "min(320px, calc(100vw - 2rem))" }}
    >
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastCard item={item} onRemove={() => _remove(item.id)} />
        </div>
      ))}
    </div>
  );
}
