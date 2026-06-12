import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import ServiceSectionClient, { type Illustration, type UserInfo } from "./_components/ServiceSectionClient";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "NETWORKS (ADB) — DNET Media Network | Hệ Thống MMO",
  description: "Hệ sinh thái NETWORK hỗ trợ kiếm tiền từ nội dung trên Facebook. Cung cấp Fanpage, Setup Payout, Hợp tác KOC — uy tín, chuyên nghiệp.",
  url: "/NetWorks",
});

const SERVICES = [
  {
    id: "fanpage-noi-dung",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    name: "Cung Cấp Fanpage Kiếm Tiền Nội Dung",
    desc: "Hỗ trợ cung cấp các dịch vụ hỗ trợ kiếm tiền từ fanpage để làm nội dung cho bạn sử dụng thu nhập mỗi ngày.",
    formTerms: "Dịch vụ Cung Cấp Fanpage dành cho Content Creator muốn bắt đầu kiếm tiền từ nội dung trên Facebook. Chúng tôi cung cấp fanpage đã đủ điều kiện bật kiếm tiền — Stars, Reels, In-Stream Ads và Dream Ads. Toàn bộ quá trình được hỗ trợ bởi đội ngũ kỹ thuật DNET Media, đảm bảo an toàn tài khoản và minh bạch doanh thu.",
  },
  {
    id: "setup-dich-vu",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    iconBg: "#fdf4ff",
    iconColor: "#9333ea",
    name: "Setup Dịch Vụ Kiếm Tiền Nội Dung",
    desc: "Hỗ trợ chuyên sâu sau bán hàng chuyên nghiệp tư vấn cụ thể sau khi sử dụng dịch vụ (dream Ads, Reels, Stars).",
    formTerms: "Dịch vụ Setup chuyên nghiệp dành cho người đã có fanpage nhưng chưa tối ưu được các nguồn thu: Dream Ads, Reels Bonus, In-Stream Stars. Đội ngũ kỹ thuật DNET Media sẽ trực tiếp tư vấn, cấu hình và hướng dẫn vận hành từ A–Z. Cam kết hỗ trợ sau setup không giới hạn thời gian.",
  },
  {
    id: "cai-dat-payout",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    name: "Cài Đặt Payout Chuyên Nghiệp",
    desc: "Tư vấn cài đặt thông tin tài khoản nhận tiền và hỗ trợ các tác kiếm tiền từ nội dung, đảm bảo an toàn tài khoản.",
    formTerms: "Dịch vụ Cài Đặt Payout hỗ trợ bạn kết nối tài khoản nhận tiền từ Facebook Creator Studio một cách an toàn và đúng quy trình. Bao gồm: xác minh danh tính, cài đặt ngưỡng thanh toán, kết nối ví/ngân hàng và theo dõi lịch sử chi trả. DNET Media đảm bảo toàn bộ dữ liệu cá nhân được bảo mật theo tiêu chuẩn cao nhất.",
  },
  {
    id: "hop-tac-koc",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    iconBg: "#fff7ed",
    iconColor: "#ea580c",
    name: "Hợp Tác Cùng KOC",
    desc: "Kết nối với mạng lưới KOC để tăng hiệu quả truyền thông, Brand uy tín và mở rộng mạng lưới kiếm tiền.",
    formTerms: "Chương trình Hợp Tác KOC dành cho Content Creator có lượng audience ổn định (từ 5.000 followers trở lên). Bạn sẽ được kết nối với các nhãn hàng, tham gia chiến dịch quảng bá và nhận hoa hồng theo kết quả thực tế. DNET Media đóng vai trò cầu nối, đảm bảo quyền lợi và minh bạch hợp đồng cho cả hai bên.",
  },
];

// Ảnh minh họa do hệ thống cung cấp — chỉ admin mới có thể thay đổi (sửa mảng này)
const ILLUSTRATIONS: Illustration[] = [
  { src: "/images/facebook_cover_professional.png", label: "Fanpage chuyên nghiệp" },
  { src: "/images/dj-media-classroom.jpg",          label: "Đội ngũ DNET Media" },
];

const TRUST_POINTS = [
  "Kinh nghiệm thực chiến trong lĩnh vực nội dung",
  "Support 24/7 cho các đối tác của Network",
  "Giải pháp thanh toán an toàn, minh bạch",
  "Mở rộng mạng lưới KOC và Brand uy tín",
];

const KOC_GALLERY = [
  { label: "IDOLS SÁNG CON TV", sub: "1.000 Followers", src: "/images/Chu%20Quang%20Doanh.png" },
  { label: "KOC Partner #2",    sub: "500K Followers",  src: "/images/Chu%20Quang%20Doanh.png" },
  { label: "KOC Partner #3",    sub: "200K Followers",  src: "/images/Chu%20Quang%20Doanh.png" },
];

export default async function NetworksPage() {
  await guardPublicPage("NetWorks");

  const session = await auth();
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  let userInfo: UserInfo | null = null;
  if (sessionUser?.id) {
    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { fullName: true, phone: true },
    });
    if (row) {
      userInfo = { name: row.fullName, phone: row.phone ?? "" };
    }
  }

  return (
    <div style={{ background: "linear-gradient(160deg,#eef2ff 0%,#f0f9ff 50%,#faf5ff 100%)", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <section style={{ padding: "72px 16px 56px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>

            {/* Badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(37,99,235,.1)", color: "#2563eb",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              padding: "5px 14px", borderRadius: 99,
              border: "1px solid rgba(37,99,235,.18)",
            }}>
              <svg width="12" height="12" fill="#2563eb" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
              DNET MEDIA NETWORK
            </span>

            <h1 style={{
              fontSize: "clamp(1.8rem,4.5vw,3rem)", fontWeight: 800,
              color: "#0f172a", lineHeight: 1.2, maxWidth: 760, margin: 0,
            }}>
              Hệ Sinh Thái{" "}
              <span style={{ color: "#2563eb" }}>NETWORK</span>{" "}
              Hỗ Trợ Kiếm Tiền<br />Từ Nội Dung Trên Facebook
            </h1>

            <p style={{ fontSize: 15, color: "#475569", maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
              Trang chính thức cung cấp dịch vụ và thông tin hỗ trợ kiếm tiền nội dung
              cho Content Creator và KOC.
            </p>

            <a
              href="https://www.facebook.com/dnetmediavn"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#1877f2", color: "#fff",
                fontSize: 14, fontWeight: 700,
                padding: "11px 28px", borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(24,119,242,.35)",
              }}
            >
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook Chính Thức DNET Media
            </a>

            {/* Hero image */}
            <div style={{ width: "100%", maxWidth: 680, marginTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/dj-media-classroom.jpg"
                alt="Đội ngũ DNET Media"
                style={{
                  width: "100%", display: "block",
                  borderRadius: 20,
                  boxShadow: "0 20px 60px rgba(30,27,75,.3)",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section style={{ padding: "0 16px 64px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#6366f1", textTransform: "uppercase", marginBottom: 8 }}>
              CHÚNG TÔI CUNG CẤP
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Giải pháp kiếm tiền toàn diện
            </h2>
          </div>

          {/* ServiceSectionClient manages the popup */}
          <ServiceSectionClient services={SERVICES} illustrations={ILLUSTRATIONS} userInfo={userInfo} />
        </div>
      </section>

      {/* ── TRUST / ABOUT ── */}
      <section style={{ padding: "0 16px 64px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            background: "#fff", borderRadius: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 24px rgba(0,0,0,.05)",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
            overflow: "hidden",
          }} className="fa-trust-grid">
            {/* Text side */}
            <div style={{ padding: "40px 40px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#6366f1", textTransform: "uppercase", marginBottom: 12 }}>
                VỀ NETWORK
              </p>
              <h2 style={{ fontSize: "clamp(1.3rem,2.5vw,1.7rem)", fontWeight: 800, color: "#0f172a", marginBottom: 24, lineHeight: 1.3 }}>
                Cam kết uy tín và bảo mật
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {TRUST_POINTS.map((pt) => (
                  <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Image side */}
            <div style={{ overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/dj-media-classroom.jpg"
                alt="Đội ngũ DNET Media"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── KOC GALLERY ── */}
      <section style={{ padding: "0 16px 64px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#6366f1", textTransform: "uppercase", marginBottom: 8 }}>
              THƯ VIỆN HÌNH ẢNH
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Đối Tác KOC tiêu biểu
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="fa-koc-grid">
            {KOC_GALLERY.map((koc) => (
              <div key={koc.label} style={{
                borderRadius: 16, aspectRatio: "4/3",
                position: "relative", overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,.18)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={koc.src}
                  alt={koc.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.7) 100%)",
                }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px", textAlign: "center" }}>
                  <p style={{ color: "#fff", fontWeight: 800, fontSize: 14, margin: "0 0 4px" }}>{koc.label}</p>
                  <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12, margin: 0 }}>{koc.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
            <div style={{ width: 24, height: 6, borderRadius: 3, background: "#6366f1" }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#cbd5e1" }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#cbd5e1" }} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "0 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            background: "#fff", borderRadius: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 24px rgba(0,0,0,.06)",
            padding: "40px 32px", textAlign: "center",
          }}>
            <h2 style={{ fontSize: "clamp(1.3rem,2.5vw,1.6rem)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
              Sẵn sàng hợp tác kiếm tiền?
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              Liên hệ với đội ngũ hỗ trợ để được tư vấn cụ thể về chương trình kiếm
              tiền nội dung và tham gia mạng lưới Network của chúng tôi.
            </p>
            <a
              href="https://www.facebook.com/dnetmediavn"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontSize: 14, fontWeight: 700,
                padding: "12px 32px", borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(99,102,241,.4)",
              }}
            >
              Liên Hệ Ngay
            </a>
          </div>
        </div>
      </section>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 768px) {
          .fa-trust-grid { grid-template-columns: 1fr !important; }
          .fa-koc-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .fa-koc-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}
