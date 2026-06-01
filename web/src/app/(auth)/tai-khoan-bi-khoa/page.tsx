import type { Metadata } from "next";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

export const metadata: Metadata = {
  title: "Tài khoản bị khóa — HETHONGMMO.VN",
};

const LEFT_FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "BẢO MẬT\nTUYỆT ĐỐI",
    desc: "Thông tin được bảo vệ an toàn",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    title: "HỖ TRỢ 24/7",
    desc: "Đội ngũ luôn sẵn sàng hỗ trợ bạn",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: "HỆ THỐNG\nUY TÍN",
    desc: "Đảm bảo trải nghiệm ổn định và tin cậy",
  },
];

const RIGHT_FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: "AN TOÀN\nTHÔNG TIN",
    desc: "Cam kết bảo mật tuyệt đối",
    gold: true,
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
    ),
    title: "HỖ TRỢ\nNHANH CHÓNG",
    desc: "Giải đáp mọi thắc mắc một cách nhanh nhất",
    gold: true,
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
    ),
    title: "DỊCH VỤ\nCHUYÊN NGHIỆP",
    desc: "Mang đến giải pháp tối ưu cho doanh nghiệp của bạn",
    gold: true,
  },
];

export default function TaiKhoanBiKhoaPage() {
  return (
    <div style={{
      position: "fixed", inset: 0, overflowY: "auto",
      background: "linear-gradient(160deg, #0d2b7a 0%, #1048c8 45%, #1565c0 100%)",
      zIndex: 9999,
    }}>

      {/* ── Background decorations ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* World map faint overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {/* Glowing orbs */}
        <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-100px", right: "-80px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(100,160,255,.12) 0%, transparent 70%)" }} />
        {/* Corner plus signs */}
        <span style={{ position: "absolute", top: "40px", right: "120px", color: "rgba(255,255,255,.3)", fontSize: "1.5rem", fontWeight: "300" }}>+</span>
        <span style={{ position: "absolute", top: "80px", left: "80px", color: "rgba(255,255,255,.2)", fontSize: "1.2rem", fontWeight: "300" }}>+</span>
        <span style={{ position: "absolute", bottom: "160px", left: "60px", color: "rgba(255,255,255,.2)", fontSize: "1.2rem", fontWeight: "300" }}>+</span>
        {/* Scattered circles */}
        <div style={{ position: "absolute", top: "15%", left: "12%", width: "8px", height: "8px", borderRadius: "50%", background: "rgba(255,220,80,.4)" }} />
        <div style={{ position: "absolute", top: "30%", right: "10%", width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,220,80,.3)" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "18%", width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,.3)" }} />
        <div style={{ position: "absolute", bottom: "40%", right: "14%", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(255,220,80,.3)" }} />
      </div>

      {/* ── Content ── */}
      <div style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        position: "relative", zIndex: 1,
        gap: "32px",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{
              width: "44px", height: "44px",
              background: "linear-gradient(135deg, #1877f2, #0a52cc)",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,.25)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ fontSize: "1.5rem", fontWeight: "800", color: "#fff", letterSpacing: "-.5px" }}>
              <span style={{ color: "#fbbf24" }}>HETHONGMMO.VN</span>
            </span>
          </div>
          <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.65)", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "600" }}>
            Nền tảng hỗ trợ kinh doanh online
          </p>
        </div>

        {/* ── 3-column layout ── */}
        <div style={{ display: "flex", gap: "40px", alignItems: "center", width: "100%", maxWidth: "1100px" }} className="banned-flex">

          {/* Left features */}
          <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", gap: "28px" }} className="banned-side-col">
            {LEFT_FEATURES.map((f) => (
              <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{
                  width: "48px", height: "48px", flexShrink: 0,
                  borderRadius: "50%",
                  background: "rgba(24,119,242,.55)",
                  border: "2px solid rgba(100,160,255,.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,.2)",
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: ".75rem", fontWeight: "800", color: "#fff", lineHeight: "1.4", whiteSpace: "pre-line", marginBottom: "3px" }}>{f.title}</p>
                  <p style={{ fontSize: ".68rem", color: "rgba(255,255,255,.65)", lineHeight: "1.4" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Center card */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "44px 40px 36px",
              boxShadow: "0 24px 80px rgba(0,0,0,.25)",
              textAlign: "center",
              maxWidth: "460px",
              margin: "0 auto",
            }}>
              {/* Lock icon */}
              <div style={{ display: "inline-flex", position: "relative", marginBottom: "20px" }}>
                <div style={{
                  width: "88px", height: "88px", borderRadius: "50%",
                  border: "3px solid #1877f2",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(24,119,242,.05)",
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                {/* Red slash */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    width: "80px", height: "3px",
                    background: "#ef4444",
                    transform: "rotate(-45deg)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px rgba(239,68,68,.5)",
                  }} />
                </div>
              </div>

              <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                Tài khoản bị <span style={{ color: "#f97316" }}>khóa</span>
              </h1>

              <p style={{ fontSize: ".92rem", color: "#64748b", lineHeight: "1.75", marginBottom: "28px", maxWidth: "340px", margin: "0 auto 28px" }}>
                Tài khoản của bạn đã bị tạm khóa do vi phạm điều khoản sử dụng.
                Vui lòng liên hệ hỗ trợ để biết thêm chi tiết và yêu cầu mở khóa.
              </p>

              {/* CTA button */}
              <Link
                href="https://www.facebook.com/Chu.Quang.Doanh.Media88/"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  background: "linear-gradient(135deg, #1877f2, #0a52cc)",
                  color: "#fff", padding: "13px 32px", borderRadius: "10px",
                  fontWeight: "700", fontSize: ".95rem", textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(24,119,242,.35)",
                  marginBottom: "16px",
                  transition: "all .25s ease",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
                Liên hệ hỗ trợ
              </Link>

              <p style={{ fontSize: ".8rem", color: "#94a3b8", marginBottom: "16px" }}>
                Hoặc gửi email tới{" "}
                <a href="mailto:hethongmmo@gmail.com" style={{ color: "#1877f2", textDecoration: "none", fontWeight: "600" }}>
                  hethongmmo@gmail.com
                </a>
              </p>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <SignOutButton />
              </div>
            </div>
          </div>

          {/* Right features */}
          <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", gap: "28px" }} className="banned-side-col">
            {RIGHT_FEATURES.map((f) => (
              <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{
                  width: "48px", height: "48px", flexShrink: 0,
                  borderRadius: "50%",
                  background: "rgba(245,158,11,.45)",
                  border: "2px solid rgba(251,191,36,.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,.2)",
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: ".75rem", fontWeight: "800", color: "#fff", lineHeight: "1.4", whiteSpace: "pre-line", marginBottom: "3px" }}>{f.title}</p>
                  <p style={{ fontSize: ".68rem", color: "rgba(255,255,255,.65)", lineHeight: "1.4" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom shield */}
        <div style={{ opacity: .7 }}>
          <div style={{
            width: "64px", height: "64px",
            background: "linear-gradient(135deg, #1877f2, #0a52cc)",
            borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>

      </div>

      <style>{`
        .banned-flex { flex-direction: row; }
        .banned-side-col { display: flex !important; }
        @media (max-width: 900px) {
          .banned-flex { flex-direction: column !important; align-items: center !important; }
          .banned-side-col {
            flex-direction: row !important;
            flex-wrap: wrap;
            justify-content: center;
            flex: unset !important;
            width: 100%;
            max-width: 480px;
            gap: 16px !important;
          }
        }
        @media (max-width: 600px) {
          .banned-side-col { display: none !important; }
        }
      `}</style>
    </div>
  );
}
