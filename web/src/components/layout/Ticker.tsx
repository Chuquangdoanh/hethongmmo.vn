"use client";

import { useEffect, useRef, useState } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

const SPEED_PX_PER_S = 80;
const MAX_RETRIES    = 3;
const EST_ITEM_W     = 500; // px ước lượng mỗi item — dùng để tính số copies cần thiết

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
  const [items,   setItems]   = useState<DisplayItem[]>([]);
  const [hovered, setHovered] = useState(false);
  const [copies,  setCopies]  = useState(2);

  // DOM refs
  const trackRef = useRef<HTMLDivElement>(null); // animated element
  const copy1Ref = useRef<HTMLDivElement>(null); // first copy — measured for halfW

  // SSE refs
  const esRef      = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);

  // Animation refs — NO React state để tránh re-render làm gián đoạn animation
  const rafRef      = useRef<number | null>(null);
  const xRef        = useRef(0);
  const halfWRef    = useRef(0);
  const lastTsRef   = useRef<number | null>(null);
  const hoveredRef  = useRef(false);

  // ── SSE connection ──────────────────────────────────────────────────────────
  function connect() {
    if (esRef.current) esRef.current.close();
    const es = new EventSource("/api/ticker");
    esRef.current = es;

    es.addEventListener("ticker", (e: MessageEvent) => {
      try {
        const p = JSON.parse(e.data as string) as TickerPayload;
        setItems(buildItems(p));
        retriesRef.current = 0;
      } catch { /* ignore malformed data */ }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        setTimeout(connect, 5_000);
      }
    };
  }

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (items.length === 0) return null;

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
        background:      "linear-gradient(90deg,#052e16 0%,#14532d 18%,#166534 50%,#14532d 82%,#052e16 100%)",
        backgroundSize:  "200% 100%",
        boxShadow:       "0 2px 12px rgba(22,163,74,0.22),inset 0 1px 0 rgba(255,255,255,0.05)",
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
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "10px", height: "10px" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(74,222,128,0.4)", animation: "ticker-ring 2s ease-out infinite" }} />
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "block", boxShadow: "0 0 6px rgba(74,222,128,0.8)" }} />
        </span>
        LIVE
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
