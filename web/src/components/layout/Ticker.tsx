"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const SPEED_PX_PER_S  = 80;
const EST_ITEM_W      = 500; // px ước lượng mỗi item — dùng để tính số copies cần thiết
const RETRY_BASE_MS   = 3_000;
const RETRY_MAX_MS    = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TickerText    { id: string; text: string; displayOrder: number; }
interface TickerPayload { texts: TickerText[]; ts: number; }
interface DisplayItem   { key: string; content: string; }

function buildItems(p: TickerPayload): DisplayItem[] {
  return p.texts.map(t => ({ key: `t-${t.id}`, content: t.text }));
}

// ─── Item span ────────────────────────────────────────────────────────────────

function ItemSpan({ item }: { item: DisplayItem }) {
  return (
    <span
      style={{
        display:    "inline-flex",
        alignItems: "center",
        gap:        "8px",
        padding:    "0 60px",
        fontSize:   "12.5px",
        fontWeight: 500,
        color:      "#e7fef3",
        lineHeight: 1,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {/* Diamond separator */}
      <span
        aria-hidden
        style={{
          width: "6px", height: "6px",
          borderRadius: "1px",
          background: "#86efac",
          transform:  "rotate(45deg)",
          opacity:    0.75,
          flexShrink: 0,
          display:    "inline-block",
        }}
      />
      {item.content}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Ticker() {
  const [items,       setItems]       = useState<DisplayItem[]>([]);
  const [hovered,     setHovered]     = useState(false);
  const [copies,      setCopies]      = useState(2);
  const [connecting,  setConnecting]  = useState(true);

  // DOM refs
  const trackRef = useRef<HTMLDivElement>(null); // animated element
  const copy1Ref = useRef<HTMLDivElement>(null); // first copy — measured for halfW

  // SSE refs
  const esRef       = useRef<EventSource | null>(null);
  const retryRef    = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  // Animation refs — NO React state để tránh re-render làm gián đoạn animation
  const rafRef      = useRef<number | null>(null);
  const xRef        = useRef(0);
  const halfWRef    = useRef(0);
  const lastTsRef   = useRef<number | null>(null);
  const hoveredRef  = useRef(false);

  // ── SSE connection — retry vô hạn với exponential backoff ──────────────────
  const connectRef = useRef<() => void>(() => { /* init */ });
  connectRef.current = function connect() {
    if (destroyedRef.current) return;
    if (esRef.current) esRef.current.close();
    setConnecting(true);

    const es = new EventSource("/api/ticker");
    esRef.current = es;

    es.addEventListener("ticker", (e: MessageEvent) => {
      try {
        const p = JSON.parse(e.data as string) as TickerPayload;
        setItems(buildItems(p));
        setConnecting(false);
        retryRef.current = 0; // reset backoff on success
      } catch { /* ignore malformed data */ }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (destroyedRef.current) return;
      // Exponential backoff: 3s → 6s → 12s → max 30s, retry forever
      const delay = Math.min(RETRY_BASE_MS * 2 ** retryRef.current, RETRY_MAX_MS);
      retryRef.current += 1;
      timerRef.current = setTimeout(() => connectRef.current(), delay);
    };
  };

  useEffect(() => {
    destroyedRef.current = false;
    connectRef.current();
    return () => {
      destroyedRef.current = true;
      esRef.current?.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Sync hovered → ref để animation frame đọc không cần re-render
  useEffect(() => { hoveredRef.current = hovered; }, [hovered]);

  // Tính copies sau khi mount để tránh window.innerWidth trong render (SSR safe)
  useEffect(() => {
    if (items.length === 0) return;
    const vw = window.innerWidth;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCopies(Math.max(2, Math.ceil(vw / Math.max(1, items.length * EST_ITEM_W)) + 1));
  }, [items]);

  // ── JS RAF animation (thay CSS @keyframes — tránh mọi vấn đề CSS specificity) ─
  useEffect(() => {
    if (!trackRef.current || !copy1Ref.current || items.length === 0) return;

    const track = trackRef.current;
    const copy1 = copy1Ref.current;

    // Dừng animation cũ
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Reset vị trí
    xRef.current     = 0;
    lastTsRef.current = null;
    track.style.transform = "translateX(0px)";

    // Đo sau khi browser hoàn thành layout
    const measureId = requestAnimationFrame(() => {
      const halfW = copy1.offsetWidth; // chiều rộng MỘT copy = khoảng cần scroll để loop
      if (halfW <= 0) return;
      halfWRef.current = halfW;

      function frame(ts: number) {
        if (lastTsRef.current === null) lastTsRef.current = ts;
        const dt = ts - lastTsRef.current;
        lastTsRef.current = ts;

        if (!hoveredRef.current) {
          xRef.current -= SPEED_PX_PER_S * (dt / 1000);
          // Khi đã scroll hết 1 copy, reset về đầu — seamless vì copy2 giống hệt copy1
          if (xRef.current <= -halfWRef.current) {
            xRef.current += halfWRef.current;
          }
          track.style.transform = `translateX(${xRef.current}px)`;
        }

        rafRef.current = requestAnimationFrame(frame);
      }

      rafRef.current = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(measureId);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items]);

  // Ẩn hoàn toàn chỉ khi chưa có dữ liệu lần đầu và đang kết nối
  if (items.length === 0 && connecting) return null;

  const half = Array.from({ length: copies }, () => items).flat();

  return (
    <div
      role="marquee"
      aria-label="Thông báo trực tiếp"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:        "relative",
        display:         "flex",
        alignItems:      "center",
        height:          "40px",
        width:           "100%",
        overflow:        "hidden",
        background:      "linear-gradient(90deg,#15803d 0%,#16a34a 18%,#22c55e 50%,#16a34a 82%,#15803d 100%)",
        backgroundSize:  "200% 100%",
        boxShadow:       "0 2px 10px rgba(34,197,94,0.18),inset 0 1px 0 rgba(255,255,255,0.08)",
        fontFamily:      "'Inter','Segoe UI',sans-serif",
        userSelect:      "none",
        animation:       "noti-bar-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both,noti-bar-shift 14s ease infinite",
      }}
    >
      {/* ── LIVE badge ── */}
      <div
        style={{
          flexShrink:    0,
          height:        "100%",
          display:       "flex",
          alignItems:    "center",
          gap:           "7px",
          padding:       "0 16px",
          background:    "rgba(0,0,0,0.28)",
          borderRight:   "1px solid rgba(255,255,255,0.10)",
          color:         "#fff",
          fontSize:      "10px",
          fontWeight:    800,
          letterSpacing: "2.2px",
          textTransform: "uppercase",
          whiteSpace:    "nowrap",
        }}
      >
        <Megaphone size={14} strokeWidth={2} style={{ color: "#4ade80", flexShrink: 0 }} />
      </div>

      {/* ── Scrolling area ── */}
      <div
        style={{
          flex:        1,
          overflow:    "hidden",
          height:      "100%",
          display:     "flex",
          alignItems:  "center",
          minWidth:    0,
          WebkitMaskImage: "linear-gradient(to right,transparent 0%,#000 44px,#000 calc(100% - 44px),transparent 100%)",
          maskImage:       "linear-gradient(to right,transparent 0%,#000 44px,#000 calc(100% - 44px),transparent 100%)",
        }}
      >
        {/* trackRef được JS RAF dịch chuyển trực tiếp qua style.transform */}
        <div ref={trackRef} style={{ display: "flex", flexShrink: 0, willChange: "transform" }}>

          {/* Copy 1 — đo offsetWidth để lấy halfW */}
          <div ref={copy1Ref} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {half.map((item, i) => <ItemSpan key={`a-${item.key}-${i}`} item={item} />)}
          </div>

          {/* Copy 2 — giống hệt copy 1, tạo seamless loop */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {half.map((item, i) => <ItemSpan key={`b-${item.key}-${i}`} item={item} />)}
          </div>

        </div>
      </div>

      {/* Tooltip pause khi hover */}
      {hovered && (
        <div
          aria-hidden
          style={{
            position:      "absolute",
            right:         "10px",
            top:           "50%",
            transform:     "translateY(-50%)",
            background:    "rgba(0,0,0,0.55)",
            backdropFilter:"blur(8px)",
            color:         "rgba(255,255,255,0.65)",
            fontSize:      "10px",
            padding:       "2px 8px",
            borderRadius:  "4px",
            letterSpacing: "0.4px",
            pointerEvents: "none",
            whiteSpace:    "nowrap",
          }}
        >
          ⏸ Tạm dừng
        </div>
      )}
    </div>
  );
}
