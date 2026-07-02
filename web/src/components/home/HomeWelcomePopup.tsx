"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, ArrowRight, Rocket, ShieldCheck, Zap, Lock, Headphones,
  GalleryVerticalEnd, Lightbulb, Package, FolderOpen, GraduationCap,
} from "lucide-react";

// Hiển thị 1 lần / phiên truy cập — dùng sessionStorage để không lặp lại khi điều hướng nội bộ
const SESSION_KEY = "hwp_welcome_seen";
const SHOW_DELAY_MS = 600;

// ── Brand icons (size động) ───────────────────────────────────────────────────
const iconFacebook = (size: number) => (
  <svg viewBox="0 0 24 24" fill="#fff" width={size} height={size}>
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.793-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.097 24 18.1 24 12.073z" />
  </svg>
);
const iconTelegram = (size: number) => (
  <svg width={size} height={size} fill="#fff" viewBox="0 0 24 24">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
// ── Category cards (icon lấy theo sidebar) ────────────────────────────────────
interface CategoryCard {
  title: string;
  desc: string;
  accent: string;
  Icon: typeof Package;
  href: string;
}

const CARDS: CategoryCard[] = [
  { title: "DỊCH VỤ",     desc: "MXH, Ads, mở khóa",   accent: "#2563eb", Icon: GalleryVerticalEnd, href: "/dich-vu" },
  { title: "TUT & TRICK", desc: "Bí quyết thực chiến", accent: "#f59e0b", Icon: Lightbulb,          href: "/tut-tricks" },
  { title: "TÀI NGUYÊN",  desc: "Kho tài nguyên số",   accent: "#f97316", Icon: Package,            href: "/kho-tai-nguyen" },
  { title: "NGUYÊN LIỆU", desc: "Tool, tài khoản số",  accent: "#ea580c", Icon: FolderOpen,         href: "/tai-nguyen-mmo" },
  { title: "KHÓA HỌC",    desc: "Cơ bản đến nâng cao", accent: "#10b981", Icon: GraduationCap,      href: "/khoa-hoc" },
];

const TRUST_BADGES = [
  { Icon: ShieldCheck, title: "UY TÍN", sub: "Hàng đầu" },
  { Icon: Zap, title: "NHANH CHÓNG", sub: "Xử lý nhanh" },
  { Icon: Lock, title: "AN TOÀN", sub: "Bảo Mật Tuyệt Đối" },
  { Icon: Headphones, title: "HỖ TRỢ 24/7", sub: "Tận Tâm" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeWelcomePopup({ telegramHref, facebookHref }: { telegramHref?: string; facebookHref?: string }) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const openTimer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
      requestAnimationFrame(() => setShown(true));
    }, SHOW_DELAY_MS);
    return () => clearTimeout(openTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [visible]);

  function handleClose() {
    setShown(false);
    setTimeout(() => setVisible(false), 220);
  }

  if (!visible) return null;

  const contactCards = [
    facebookHref ? { title: "FANPAGE", desc: "Theo dõi ngay", bg: "#1877F2", icon: iconFacebook(18), href: facebookHref } : null,
    telegramHref ? { title: "TELEGRAM", desc: "Tham gia nhóm", bg: "#0088CC", icon: iconTelegram(18), href: telegramHref } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div
      className="hwp-overlay"
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        background: "rgba(15,23,42,.6)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        opacity: shown ? 1 : 0, transition: "opacity .22s ease",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chào mừng đến Hệ Thống MMO"
        onClick={(e) => e.stopPropagation()}
        className="hwp-dialog"
        style={{
          position: "relative", width: "100%", maxWidth: "704px",
          maxHeight: "calc(100vh - 32px)", overflowY: "auto",
          borderRadius: "24px",
          border: "1px solid #dbeafe",
          background:
            "radial-gradient(900px 380px at 50% -10%, rgba(59,130,246,.1), transparent 60%), linear-gradient(160deg,#ffffff 0%,#f6faff 55%,#eef5ff 100%)",
          boxShadow: "0 30px 80px rgba(30,64,175,.2)",
          transform: shown ? "scale(1) translateY(0)" : "scale(.96) translateY(10px)",
          opacity: shown ? 1 : 0,
          transition: "transform .3s cubic-bezier(.16,1,.3,1), opacity .3s ease",
        }}
      >
        {/* Scoped styles: cards trắng trên nền xanh + responsive + hover */}
        <style jsx>{`
          .hwp-body { padding: 0 16px 20px; }
          .hwp-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
          .hwp-contact {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 18px;
            max-width: 520px; margin-left: auto; margin-right: auto;
          }
          .hwp-card {
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; gap: 9px;
            padding: 18px 10px; border-radius: 16px; text-decoration: none;
            background: #ffffff; border: 1px solid #cbdcf5;
            box-shadow: 0 6px 18px rgba(30, 64, 175, 0.16);
            transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          }
          .hwp-card:hover { transform: translateY(-4px); border-color: #0066ff; box-shadow: 0 14px 30px rgba(0, 102, 255, 0.2); }
          .hwp-card:hover .hwp-card-title { color: #0066ff; }
          .hwp-card-title { width: 100%; text-align: center; font-size: 0.86rem; font-weight: 800; color: #000; line-height: 1.2; transition: color 0.2s ease; }
          .hwp-card-desc { width: 100%; text-align: center; font-size: 0.7rem; color: #1a1a1a; line-height: 1.3; }
          .hwp-contact-card { flex-direction: row; align-items: center; justify-content: center; text-align: left; gap: 12px; padding: 14px 18px; }
          .hwp-contact-card .hwp-card-title, .hwp-contact-card .hwp-card-desc { width: auto; text-align: left; }
          .hwp-header { padding: 52px 22px 16px; text-align: center; position: relative; }
          .hwp-trust {
            display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
            gap: 14px 10px; margin-top: 20px;
          }
          .hwp-trust-item { display: flex; align-items: center; gap: 10px; min-width: 0; }
          @media (max-width: 820px) { .hwp-cards { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 520px) {
            .hwp-cards { grid-template-columns: repeat(2, 1fr); }
            .hwp-contact { grid-template-columns: 1fr; }
            .hwp-trust { justify-content: flex-start; }
          }
        `}</style>

        {/* ── Nút đóng ── */}
        <button
          onClick={handleClose}
          aria-label="Đóng"
          style={{
            position: "absolute", top: "14px", right: "16px",
            width: "34px", height: "34px", borderRadius: "50%", border: "1px solid #bfdbfe",
            background: "#fff", color: "#1d4ed8",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 3, boxShadow: "0 2px 10px rgba(30,64,175,.15)",
            transition: "transform .2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(90deg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "rotate(0deg)"; }}
        >
          <X size={18} strokeWidth={2.6} />
        </button>

        {/* ── Header ── */}
        <div className="hwp-header">
          {/* Brand: logo GIF */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/djmedia-logo.gif" alt="DJ Media" style={{ height: "60px", width: "auto", objectFit: "contain" }} />
          </div>

          {/* Title */}
          <h2 style={{ fontSize: "clamp(1.4rem,4.5vw,2.05rem)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 14px", color: "#000", letterSpacing: ".02em" }}>
            <span style={{ color: "#94a3b8", margin: "0 12px", fontWeight: 700 }}>✦</span>
            HỖ TRỢ DỊCH VỤ
            <span style={{ color: "#94a3b8", margin: "0 12px", fontWeight: 700 }}>✦</span>
          </h2>

          {/* Pill badge */}
          <div style={{
            display: "inline-block", maxWidth: "100%",
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            border: "1px solid rgba(255,255,255,.35)",
            color: "#fff", padding: "8px 20px", borderRadius: "100px",
            fontSize: ".72rem", fontWeight: 700, letterSpacing: ".4px",
            boxShadow: "0 6px 22px rgba(0,0,0,.2)",
          }}>
            HỆ THỐNG HỖ TRỢ DỊCH VỤ MẠNG XÃ HỘI ĐẦU TIÊN TẠI VIỆT NAM
          </div>
        </div>

        {/* ── Body ── */}
        <div className="hwp-body">
          {/* 5 category cards */}
          <div className="hwp-cards">
            {CARDS.map(({ title, desc, accent, Icon, href }) => (
              <Link key={title} href={href} onClick={handleClose} className="hwp-card"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
              >
                <div style={{
                  width: "50px", height: "50px", flexShrink: 0,
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  background: `${accent}22`, color: accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div className="hwp-card-title" style={{ width: "100%", textAlign: "center" }}>{title}</div>
                <div className="hwp-card-desc" style={{ width: "100%", textAlign: "center" }}>{desc}</div>
              </Link>
            ))}
          </div>

          {/* Fanpage + Telegram — 2 card riêng, link từ CMS */}
          {contactCards.length > 0 && (
            <div className="hwp-contact">
              {contactCards.map(({ title, desc, bg, icon, href }) => (
                <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="hwp-card hwp-contact-card">
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "11px", flexShrink: 0,
                    background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 12px ${bg}55`,
                  }}>
                    {icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="hwp-card-title">{title}</div>
                    <div className="hwp-card-desc">{desc}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Trust badges — 1 hàng, trên nền xanh (chữ trắng) */}
          <div className="hwp-trust">
            {TRUST_BADGES.map(({ Icon, title, sub }) => (
              <div key={title} className="hwp-trust-item">
                <div style={{
                  width: "38px", height: "38px", borderRadius: "11px",
                  background: "rgba(0,102,255,.1)", color: "#0066ff",
                  border: "1px solid #bfdbfe",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 800, color: "#000", letterSpacing: ".3px" }}>{title}</div>
                  <div style={{ fontSize: ".66rem", color: "#1a1a1a" }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Explore button */}
          <div style={{ textAlign: "center", marginTop: "22px" }}>
            <Link
              href="/dich-vu"
              onClick={handleClose}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "10px 31px", borderRadius: "100px",
                background: "linear-gradient(135deg,#0ea5e9,#3b82f6 55%,#2563eb)",
                border: "1px solid rgba(255,255,255,.4)",
                color: "#fff", fontSize: ".67rem", fontWeight: 800, letterSpacing: ".6px",
                textDecoration: "none", boxShadow: "0 12px 30px rgba(2,14,45,.4)",
                transition: "transform .2s ease, box-shadow .2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 38px rgba(2,14,45,.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(2,14,45,.4)"; }}
            >
              <Rocket size={13} strokeWidth={2.2} />
              KHÁM PHÁ NGAY
              <ArrowRight size={13} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
