import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Phone, Zap, ShieldCheck, Star } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import AdServiceTabs from "./_components/AdServiceTabs";
import { guardPublicPage } from "@/lib/utils/public-page-guard";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "Dịch Vụ Quảng Cáo Facebook & TikTok Ads | Hệ Thống MMO",
  description: "Dịch vụ chạy quảng cáo Facebook, TikTok Ads chuyên nghiệp. Tối ưu ngân sách, tăng ROI. Kinh nghiệm 5 năm, quản lý 50B+ ngân sách.",
  url: "/quang-cao",
  image: "/images/dj-media-classroom.jpg",
});

const WHY_CHOOSE = [
  "Kinh nghiệm thực chiến 5 năm",
  "Cam kết hiệu quả tối ưu theo CPA/ROI",
  "Chi phí dịch vụ cạnh tranh nhất thị trường",
  "Hỗ trợ 1-1, xử lý sự cố tức thì 24/7",
];

const STATS = [
  { value: "50B+", label: "NGÂN SÁCH ĐÃ QUẢN LÝ" },
  { value: "1.200+", label: "CHIẾN DỊCH THÀNH CÔNG" },
  { value: "350%", label: "LỢI NHUẬN TRUNG BÌNH" },
];

const STEPS = [
  {
    num: "01",
    title: "SETUP Chạy Quảng Cáo",
    sub: "NHANH CHÓNG",
    Icon: Zap,
    color: "#0066ff",
    bg: "rgba(0,102,255,0.1)",
  },
  {
    num: "02",
    title: "Đội Ngũ Nhân Sự Support",
    sub: "24/7",
    Icon: ShieldCheck,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
  },
  {
    num: "03",
    title: "Tối Ưu Hiệu Quả",
    sub: "THEO TỪNG THỜI ĐIỂM",
    Icon: Star,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
];


export default async function QuangCaoAdsPage() {
  await guardPublicPage("quang-cao");

  const session = await auth();
  const sessionUser = session?.user as AuthenticatedUser | undefined;

  let userInfo: { name: string; phone: string } | null = null;
  if (sessionUser?.id) {
    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { fullName: true, phone: true },
    });
    if (row) userInfo = { name: row.fullName, phone: row.phone ?? "" };
  }

  return (
    <>
      <style>{`
        .qc-btn-orange { display:inline-flex; align-items:center; gap:8px; padding:12px 26px; background:#f97316; color:#fff; border:2px solid #f97316; border-radius:10px; font-weight:700; font-size:.9rem; text-decoration:none; transition:all .22s; cursor:pointer; }
        .qc-btn-orange:hover { background:#ea6a00; border-color:#ea6a00; transform:translateY(-2px); box-shadow:0 8px 24px rgba(249,115,22,.38); }
        .qc-btn-orange:active { transform:translateY(0); }
        .qc-btn-green { display:inline-flex; align-items:center; gap:8px; padding:12px 26px; background:#16a34a; color:#fff; border:2px solid #16a34a; border-radius:10px; font-weight:700; font-size:.9rem; text-decoration:none; transition:all .22s; cursor:pointer; }
        .qc-btn-green:hover { background:#15803d; border-color:#15803d; transform:translateY(-2px); box-shadow:0 8px 24px rgba(22,163,74,.38); }
        .qc-btn-green:active { transform:translateY(0); }
        .qc-btn-blue { display:inline-flex; align-items:center; gap:8px; padding:13px 32px; background:#0066ff; color:#fff; border:2px solid #0066ff; border-radius:10px; font-weight:700; font-size:.95rem; text-decoration:none; transition:all .22s; cursor:pointer; }
        .qc-btn-blue:hover { background:#0052cc; border-color:#0052cc; transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,102,255,.38); }
        .qc-btn-blue:active { transform:translateY(0); }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e8f4fd 50%, #f0f9ff 100%)",
          padding: "60px 24px 56px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Tăng Trưởng Doanh Thu Với{" "}
                <span style={{ color: "#0066ff" }}>Quảng Cáo Facebook</span>{" "}
                Chuyên Nghiệp
              </h1>
              <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
                Chúng tôi giúp bạn tối ưu hóa ngân sách, tiếp cận đúng khách hàng mục tiêu
                và tối đa hóa tỷ lệ chuyển đổi.
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <a href="https://www.facebook.com/hethongmmo.vn/" target="_blank" rel="noopener noreferrer" className="qc-btn-orange">
                  Tư vấn miễn phí
                </a>
                <a href="tel:0828118789" className="qc-btn-green">
                  <Phone size={16} strokeWidth={2} />
                  Hotline: 0828.118.789
                </a>
              </div>
            </div>

            {/* Right — hero image */}
            <div className="hidden lg:flex items-center justify-center">
              <div
                style={{
                  width: 440,
                  height: 300,
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0,102,255,0.18)",
                  position: "relative",
                  background: "#e2e8f0",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hethongmmo.png"
                  alt="Đội ngũ hethongmmo.vn"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0066ff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Dịch Vụ
            </p>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Dịch vụ Quảng Cáo
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 10, maxWidth: 560, margin: "10px auto 0" }}>
              Chạy quảng cáo Facebook · TikTok Ads — tối ưu hiệu quả mang lại cho đối tác
              và là sự tin cậy của các doanh nghiệp trên toàn quốc trong nhiều năm marketing trên nền tảng số.
            </p>
          </div>

          <AdServiceTabs userInfo={userInfo} />
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
                Lý do chọn chúng tôi
              </p>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>
                Chất lượng tạo nên uy tín
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {WHY_CHOOSE.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle size={18} strokeWidth={2} style={{ color: "#16a34a", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.9rem", color: "#374151", fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — stats box */}
            <div
              style={{
                borderRadius: 20,
                background: "#f1f5f9",
                padding: "36px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 28,
              }}
            >
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <p style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1, marginBottom: 4 }}>
                    {value}
                  </p>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "64px 24px",
          background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fff7ed 100%)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              ★ Quy trình làm việc
            </p>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Quy trình triển khai chuyên nghiệp
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ num, title, sub, Icon, color, bg }) => (
              <div
                key={num}
                style={{
                  borderRadius: 18,
                  background: "#fff",
                  padding: "32px 28px",
                  position: "relative",
                  border: "1.5px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                }}
              >
                <p
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 24,
                    fontSize: "3.5rem",
                    fontWeight: 900,
                    color: "rgba(0,0,0,0.05)",
                    lineHeight: 1,
                  }}
                >
                  {num}
                </p>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Icon size={24} strokeWidth={1.75} style={{ color }} />
                </div>
                <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color, letterSpacing: "0.06em" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", background: "#fff" }}>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
            borderRadius: 24,
            background: "linear-gradient(135deg, #f0f4ff 0%, #e8f4fd 100%)",
            padding: "52px 40px",
            border: "1.5px solid rgba(0,102,255,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            Sẵn sàng để bứt phá{" "}
            <span style={{ color: "#0066ff" }}>doanh số ngay hôm nay?</span>
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 540, margin: "16px auto 32px" }}>
            Đừng để đối thủ vượt mặt. Liên hệ với đội ngũ chuyên gia của chúng tôi để nhận
            lộ trình quảng cáo tối ưu nhất.
          </p>
          <a href="https://www.facebook.com/hethongmmo.vn/" target="_blank" rel="noopener noreferrer" className="qc-btn-blue">
            Tư vấn miễn phí
          </a>
        </div>
      </section>

    </>
  );
}
