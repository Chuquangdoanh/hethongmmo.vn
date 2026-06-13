import Link from "next/link";
import {
  Home, ShoppingBag, GraduationCap, Megaphone, Monitor,
  Shield, Lock, RotateCcw, Settings, RefreshCw,
  BookOpen, Wrench, Users, Tag,
  Users2, ShoppingCart, Star, Headphones,
  Search, Gem, Phone, Gift, Heart,
} from "lucide-react";
import type { ReactNode } from "react";

export const metadata = { title: "Cảm ơn — Hệ Thống MMO" };

type PType = "dich-vu" | "khoa-hoc" | "quang-cao" | "networks";

const TYPE_INFO: Record<PType, {
  title: string;
  lines: string[];
  btn1: { label: string; href: string; Icon: ReactNode };
}> = {
  "dich-vu": {
    title: "GIAO DỊCH\nTHÀNH CÔNG!",
    lines: [
      "Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ tại Hệ Thống MMO.",
      "Đơn hàng của bạn đã được ghi nhận và đang được xử lý.",
      "Thông tin chi tiết đã được gửi qua Email hoặc Telegram.",
    ],
    btn1: { label: "Xem đơn hàng", href: "/don-hang", Icon: <ShoppingBag size={16} strokeWidth={2} /> },
  },
  "khoa-hoc": {
    title: "ĐĂNG KÝ\nTHÀNH CÔNG!",
    lines: [
      "Cảm ơn bạn đã đăng ký khóa học tại Hệ Thống MMO.",
      "Chúng tôi sẽ liên hệ để hướng dẫn bạn truy cập và bắt đầu học.",
      "Thông tin chi tiết đã được gửi qua Email hoặc Telegram.",
    ],
    btn1: { label: "Xem khóa học", href: "/khoa-hoc", Icon: <GraduationCap size={16} strokeWidth={2} /> },
  },
  "quang-cao": {
    title: "ĐĂNG KÝ\nTHÀNH CÔNG!",
    lines: [
      "Cảm ơn bạn đã đăng ký tư vấn dịch vụ Quảng Cáo tại Hệ Thống MMO.",
      "Chuyên viên sẽ liên hệ với bạn trong vòng 24h làm việc.",
      "Vui lòng giữ máy để nhận cuộc gọi tư vấn.",
    ],
    btn1: { label: "Xem dịch vụ ADS", href: "/quang-cao", Icon: <Megaphone size={16} strokeWidth={2} /> },
  },
  "networks": {
    title: "ĐĂNG KÝ\nTHÀNH CÔNG!",
    lines: [
      "Cảm ơn bạn đã đăng ký dịch vụ NETWORKS (ADB) tại Hệ Thống MMO.",
      "Chuyên viên sẽ liên hệ với bạn trong vòng 24h làm việc.",
      "Vui lòng giữ máy để nhận cuộc gọi tư vấn.",
    ],
    btn1: { label: "Xem NETWORKS", href: "/NetWorks", Icon: <Monitor size={16} strokeWidth={2} /> },
  },
};

const RECOMMENDED = [
  {
    title: "Mở Khóa Facebook",
    bullets: ["Khôi Phục Tài Khoản", "Bảo Hành Dài Hạn", "Tỷ Lệ Thành Công Cao"],
    href: "/dich-vu",
    bg: "#1877f2",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="52" height="52">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    title: "Facebook Ads",
    bullets: ["Tăng Chuyển Đổi", "Tối Ưu Chi Phí", "Hiệu Quả Bền Vững"],
    href: "/quang-cao",
    bg: "#f59e0b",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="52" height="52">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    title: "TikTok Ads",
    bullets: ["Tăng Đơn Hàng", "Tiếp Cận Khách Hàng", "Tăng Doanh Thu"],
    href: "/quang-cao",
    bg: "#0f172a",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="52" height="52">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  {
    title: "Khóa Học MMO",
    bullets: ["Từ Cơ Bản Đến Nâng Cao", "Học Làm - Thực Chiến", "Hỗ Trợ Trọn Đời"],
    href: "/khoa-hoc",
    bg: "#7c3aed",
    icon: <GraduationCap size={52} color="white" strokeWidth={1.5} />,
  },
];

export default async function CamOnPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const rawType = params.type ?? "dich-vu";
  const type: PType = rawType in TYPE_INFO ? (rawType as PType) : "dich-vu";
  const info = TYPE_INFO[type];

  return (
    <div className="co-page">

      <style>{`
        /* ── Animations ── */
        @keyframes camOnPopIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes camOnRingPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes camOnCheckDraw {
          0%   { stroke-dashoffset: 30; opacity: 0; }
          100% { stroke-dashoffset: 0;  opacity: 1; }
        }

        /* ── Base ── */
        .co-page   { background: #f8fafc; min-height: 100vh; }
        .co-wrap   { max-width: 1100px; margin: 0 auto; padding: 0 16px; }

        /* ── Hero ── */
        .co-hero-section { padding: 32px 16px 0; max-width: 1100px; margin: 0 auto; }
        .co-hero-box {
          background: linear-gradient(135deg,#e8f4fd 0%,#dbeafe 30%,#eff6ff 60%,#f0f9ff 100%);
          border-radius: 24px; padding: 48px 40px 56px;
          position: relative; overflow: hidden;
        }
        .co-hero-center {
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          position: relative; z-index: 1;
        }
        .co-hero-title {
          font-size: 36px; font-weight: 900; color: #1e40af;
          line-height: 1.15; margin-bottom: 16px; white-space: pre-line;
        }
        .co-hero-desc  { margin-bottom: 28px; max-width: 560px; }
        .co-hero-btns  { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

        /* ── Grids ── */
        .co-2col          { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; }
        .co-features-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .co-gifts-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .co-support-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .co-services-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .co-stats-grid    { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

        /* ── Cam kết ── */
        .co-ck-inner { display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: center; }
        .co-ck-icons { display: flex; gap: 20px; }

        /* ── Card helpers ── */
        .co-card      { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
        .co-card-p    { padding: 28px 28px 24px; }
        .co-card-p-lg { padding: 28px 32px; }

        /* ── Button ── */
        .co-btn-blue {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 24px; border-radius: 10px;
          background: #2563eb; color: #fff;
          font-size: 14px; font-weight: 700; text-decoration: none;
          box-shadow: 0 4px 14px rgba(37,99,235,.35);
        }
        .co-btn-outline {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 24px; border-radius: 10px;
          background: #fff; color: #2563eb;
          border: 1.5px solid #bfdbfe;
          font-size: 14px; font-weight: 700; text-decoration: none;
        }

        /* ═══════════════════════════════
           RESPONSIVE
        ═══════════════════════════════ */

        /* Tablet ≤ 1024px */
        @media (max-width: 1024px) {
          .co-services-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Mobile ≤ 768px */
        @media (max-width: 768px) {
          .co-hero-section { padding: 14px 12px 0; }
          .co-hero-box     { border-radius: 16px; padding: 28px 18px 36px; }
          .co-hero-title   { font-size: 24px; }
          .co-hero-desc    { margin-bottom: 20px; }
          .co-wrap         { padding: 0 12px; }

          .co-2col          { grid-template-columns: 1fr; gap: 14px; }
          .co-features-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .co-support-grid  { grid-template-columns: 1fr; gap: 10px; }
          .co-stats-grid    { grid-template-columns: repeat(2, 1fr); gap: 10px; }

          .co-ck-inner { grid-template-columns: 1fr; gap: 16px; }
          .co-ck-icons { flex-wrap: wrap; justify-content: flex-start; gap: 14px; }

          .co-card-p    { padding: 20px 16px; }
          .co-card-p-lg { padding: 20px 16px; }
        }

        /* Small mobile ≤ 480px */
        @media (max-width: 480px) {
          .co-hero-title    { font-size: 20px; }
          .co-features-grid { grid-template-columns: repeat(2, 1fr); }
          .co-gifts-grid    { grid-template-columns: 1fr; }
          .co-services-grid { grid-template-columns: 1fr 1fr; }
          .co-ck-icons      { gap: 10px; }
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="co-hero-section">
        <div className="co-hero-box">
          {/* Confetti */}
          {[
            { top: "12%", left: "6%",   color: "#22c55e", w: 8,  h: 8,  r: "50%" },
            { top: "8%",  left: "14%",  color: "#f59e0b", w: 12, h: 5,  r: 3 },
            { top: "20%", left: "4%",   color: "#ef4444", w: 6,  h: 6,  r: "50%" },
            { top: "30%", left: "10%",  color: "#8b5cf6", w: 10, h: 4,  r: 2 },
            { top: "5%",  left: "28%",  color: "#ec4899", w: 7,  h: 7,  r: "50%" },
            { top: "18%", left: "35%",  color: "#06b6d4", w: 5,  h: 10, r: 2 },
            { top: "8%",  right: "30%", color: "#f59e0b", w: 8,  h: 8,  r: "50%" },
            { top: "15%", right: "20%", color: "#22c55e", w: 11, h: 4,  r: 2 },
            { top: "25%", right: "8%",  color: "#ef4444", w: 6,  h: 6,  r: "50%" },
            { top: "6%",  right: "12%", color: "#8b5cf6", w: 9,  h: 4,  r: 3 },
            { top: "35%", right: "4%",  color: "#ec4899", w: 7,  h: 7,  r: "50%" },
            { top: "40%", left: "2%",   color: "#06b6d4", w: 6,  h: 6,  r: "50%" },
          ].map((c, i) => (
            <div key={i} style={{
              position: "absolute", top: c.top, left: c.left, right: c.right,
              width: c.w, height: c.h, borderRadius: c.r,
              background: c.color, opacity: 0.65,
            }} />
          ))}

          <div className="co-hero-center">
            {/* Animated checkmark */}
            <div style={{ position: "relative", marginBottom: 24, width: 96, height: 96 }}>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "3px solid rgba(37,99,235,.35)",
                animation: "camOnRingPulse 1.6s ease-out 0.4s infinite",
              }} />
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: "#fff", border: "4px solid #2563eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 6px rgba(37,99,235,.1), 0 8px 32px rgba(37,99,235,.18)",
                animation: "camOnPopIn 0.5s cubic-bezier(.175,.885,.32,1.275) both",
              }}>
                <svg viewBox="0 0 24 24" fill="none" width="46" height="46">
                  <circle cx="12" cy="12" r="11" fill="#2563eb" />
                  <path
                    d="M7 12.5l3.5 3.5 6.5-7"
                    stroke="#fff" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="30"
                    style={{ animation: "camOnCheckDraw .4s ease-out .4s both" }}
                  />
                </svg>
              </div>
            </div>

            <h1 className="co-hero-title">{info.title}</h1>

            <div className="co-hero-desc">
              {info.lines.map((l, i) => (
                <p key={i} style={{ fontSize: 15, color: "#374151", lineHeight: 1.8 }}>{l}</p>
              ))}
            </div>

            <div className="co-hero-btns">
              <Link href="/" className="co-btn-blue">
                <Home size={16} strokeWidth={2} />
                Về trang chủ
              </Link>
              <Link href={info.btn1.href} className="co-btn-outline">
                {info.btn1.Icon}
                {info.btn1.label}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="co-wrap">

        {/* ── CẢM ƠN + QUÀ TẶNG ── */}
        <div className="co-2col">

          {/* Left */}
          <div className="co-card co-card-p">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Heart size={16} color="#2563eb" strokeWidth={2} />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e40af", letterSpacing: "0.03em" }}>CẢM ƠN BẠN ĐÃ ĐỒNG HÀNH!</h2>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
              Hệ Thống MMO xin gửi lời cảm ơn chân thành tới Quý Khách Hàng đã lựa chọn dịch vụ của chúng tôi.
            </p>
            <div className="co-features-grid">
              {[
                { Icon: <Shield    size={18} color="#2563eb" strokeWidth={2} />, bg: "#eff6ff", label: "Hỗ trợ nhanh chóng"   },
                { Icon: <Lock      size={18} color="#7c3aed" strokeWidth={2} />, bg: "#f5f3ff", label: "Bảo mật tuyệt đối"    },
                { Icon: <RotateCcw size={18} color="#16a34a" strokeWidth={2} />, bg: "#f0fdf4", label: "Hoàn tiền chính sách" },
                { Icon: <Settings  size={18} color="#ea580c" strokeWidth={2} />, bg: "#fff7ed", label: "Hỗ trợ kỹ thuật 24/7" },
                { Icon: <RefreshCw size={18} color="#0891b2" strokeWidth={2} />, bg: "#ecfeff", label: "Cập nhật liên tục"    },
              ].map(({ Icon, bg, label }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                    {Icon}
                  </div>
                  <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4, fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="co-card co-card-p">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Gift size={16} color="#ea580c" strokeWidth={2} />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e40af" }}>QUÀ TẶNG DÀNH CHO BẠN</h2>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Cảm ơn bạn! Hãy nhận những phần quà giá trị từ chúng tôi.</p>
            <div className="co-gifts-grid">
              {[
                { Icon: <BookOpen size={18} color="#2563eb" strokeWidth={2} />, bg: "#eff6ff", title: "Tặng Ebook MMO",       desc: "Bí quyết kiếm tiền online"   },
                { Icon: <Wrench   size={18} color="#7c3aed" strokeWidth={2} />, bg: "#f5f3ff", title: "Tặng Bộ Tool Hỗ Trợ", desc: "Tool tăng tương tác, SEO..."  },
                { Icon: <Users    size={18} color="#16a34a" strokeWidth={2} />, bg: "#f0fdf4", title: "Tặng Danh Sách Group", desc: "Danh sách group chất lượng"   },
                { Icon: <Tag      size={18} color="#ea580c" strokeWidth={2} />, bg: "#fff7ed", title: "Voucher Giảm Giá 10%", desc: "Áp dụng cho đơn hàng tiếp"   },
              ].map(({ Icon, bg, title, desc }) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {Icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 11, color: "#64748b" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KÊNH HỖ TRỢ ── */}
        <div className="co-card co-card-p-lg" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e40af", textAlign: "center", letterSpacing: "0.05em", marginBottom: 4 }}>
            KÊNH HỖ TRỢ 24/7
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 22 }}>
            Chúng tôi luôn sẵn sàng hỗ trợ mọi lúc, mọi nơi
          </p>
          <div className="co-support-grid">
            <a href="https://t.me/BossMeta789" target="_blank" rel="noopener noreferrer"
              style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "20px 18px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.01 9.469c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.873.752z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0369a1" }}>Telegram</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0088cc" }}>@BossMeta789</p>
            </a>

            <a href="https://facebook.com/chuquangdoanh" target="_blank" rel="noopener noreferrer"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "20px 18px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>Fanpage</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1877f2" }}>Chu Quang Doanh</p>
            </a>

            <a href="tel:0393118789"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "20px 18px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Phone size={18} color="white" strokeWidth={2} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Hotline</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>0393.118.789</p>
            </a>
          </div>
        </div>

       

        {/* ── STATS ── */}
        <div className="co-stats-grid">
          {[
            { n: "10.000+", label: "Khách Hàng", sub: "Tin Tưởng",      color: "#2563eb", bg: "#eff6ff", Icon: <Users2      size={20} color="#2563eb" strokeWidth={2} /> },
            { n: "50.000+", label: "Đơn Hàng",   sub: "Đã Hoàn Thành", color: "#16a34a", bg: "#f0fdf4", Icon: <ShoppingCart size={20} color="#16a34a" strokeWidth={2} /> },
            { n: "98%",     label: "Khách Hàng", sub: "Hài Lòng",       color: "#f59e0b", bg: "#fffbeb", Icon: <Star         size={20} color="#f59e0b" strokeWidth={2} /> },
            { n: "24/7",    label: "Hỗ Trợ",     sub: "Tận Tâm",        color: "#7c3aed", bg: "#f5f3ff", Icon: <Headphones   size={20} color="#7c3aed" strokeWidth={2} /> },
          ].map(({ n, label, sub, color, bg, Icon }) => (
            <div key={n} style={{ background: bg, borderRadius: 16, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${color}33` }}>
                {Icon}
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CAM KẾT ── */}
        <div className="co-card co-card-p-lg" style={{ marginBottom: 32 }}>
          <div className="co-ck-inner">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={18} color="#2563eb" strokeWidth={2} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e40af" }}>CAM KẾT CỦA CHÚNG TÔI</h2>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, maxWidth: 520 }}>
                Hệ Thống MMO cam kết cung cấp dịch vụ minh bạch, bảo mật và hỗ trợ khách hàng lâu dài.
                Mọi giao dịch đều được lưu trữ và xử lý theo chính sách bảo vệ người dùng của hệ thống.
              </p>
            </div>
            <div className="co-ck-icons">
              {[
                { Icon: <Search size={22} color="#2563eb" strokeWidth={2} />, bg: "#eff6ff", label: "Minh bạch"  },
                { Icon: <Lock   size={22} color="#7c3aed" strokeWidth={2} />, bg: "#f5f3ff", label: "Bảo mật"    },
                { Icon: <Star   size={22} color="#f59e0b" strokeWidth={2} />, bg: "#fffbeb", label: "Uy tín"     },
                { Icon: <Gem    size={22} color="#0891b2" strokeWidth={2} />, bg: "#ecfeff", label: "Chất lượng" },
              ].map(({ Icon, bg, label }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                    {Icon}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
