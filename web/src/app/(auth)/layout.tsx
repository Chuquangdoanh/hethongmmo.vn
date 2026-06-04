import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck, Zap, Headphones, CreditCard,
  Users, Activity, Clock, RotateCcw, MessageCircle,
} from "lucide-react";
import AuthRightPanel from "./AuthRightPanel";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

const FEATURES = [
  { Icon: Zap,         title: "Xử Lý Tự Động",      desc: "Giao hàng tức thì\nAPI tốc độ cao"        },
  { Icon: Headphones,  title: "Hỗ Trợ 24/7",        desc: "Admin MMO\nchuyên nghiệp"                 },
  { Icon: CreditCard,  title: "Thanh Toán An Toàn", desc: "Đa dạng phương thức\nBảo mật tuyệt đối"  },
] as const;

const STATS = [
  { Icon: Users,       value: "10.000+", label: "Khách hàng tin tưởng" },
  { Icon: Activity,    value: "99.9%",   label: "Thời gian hoạt động"  },
  { Icon: ShieldCheck, value: "100%",    label: "An toàn dữ liệu"      },
  { Icon: Clock,       value: "24/7",    label: "Hỗ trợ tận tâm"       },
] as const;

const TRUST = [
  { Icon: RotateCcw,     title: "Chính sách hoàn tiền", desc: "Hoàn tiền trong 7 ngày"   },
  { Icon: MessageCircle, title: "Hỗ trợ nhanh chóng",  desc: "Phản hồi trong vài phút"  },
] as const;

const FOOTER_LINKS = [
  { label: "Điều khoản dịch vụ",      href: "/dieu-khoan"                },
  { label: "Chính sách bảo mật",      href: "/chinh-sach"                },
  { label: "Chính sách nhà bán hàng", href: "/chinh-sach-nha-ban-hang"   },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden"
      style={{ background: "#EDF1FB" }}
    >

      {/* ══════════════════════════════════════════
          MOBILE ONLY — thứ tự 1 → 2 → 3
          Logo / Tiêu đề / Mô tả (ẩn trên desktop)
      ══════════════════════════════════════════ */}
      <div
        className="lg:hidden"
        style={{
          padding: "110px 20px 20px",
          textAlign: "center",
        }}
      >
        {/* 1 — Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Link href="/">
            <Image
              src="/images/djmedia-logo.gif"
              width={220} height={160}
              alt="DJ Media"
              unoptimized
            />
          </Link>
        </div>

        {/* 2 — Tiêu đề */}
        <h1 style={{
          fontSize: 22, fontWeight: 900, color: "#111827",
          lineHeight: 1.15, margin: "0 0 10px",
        }}>
          HỆ THỐNG MMO{" "}
          <span style={{ color: "#0066ff" }}>VIỆT NAM</span>
        </h1>

        {/* 3 — Mô tả */}
        <p style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.65, margin: 0 }}>
          Nền tảng công cụ MMO{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>tốt nhất</span>{" "}
          Việt Nam — tối ưu hoá chiến dịch{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>Social Media Marketing</span>.
        </p>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP ONLY — cột trái 60%
          (ẩn trên mobile)
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col justify-center"
        style={{ width: "60%", padding: "48px 240px", overflow: "hidden", flexShrink: 0, minHeight: 0 }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Link href="/">
            <Image
              src="/images/djmedia-logo.gif"
              width={300} height={300}
              alt="DJ Media"
              unoptimized
            />
          </Link>
        </div>

        {/* Tiêu đề */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <h1 style={{
            fontSize: "clamp(30px, 3vw, 46px)", fontWeight: 900,
            color: "#111827", lineHeight: 1.08, letterSpacing: "-0.02em", margin: 0,
          }}>
            HỆ THỐNG MMO
            <br />
            <span style={{ color: "#0066ff" }}>VIỆT NAM</span>
          </h1>
        </div>

        {/* Mô tả */}
        <p style={{
          fontSize: 13.5, color: "#6b7280", lineHeight: 1.75,
          maxWidth: 500, margin: "0 auto 28px", textAlign: "center",
        }}>
          Nền tảng công cụ MMO{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>tốt nhất</span>{" "}
          Việt Nam — tối ưu hoá, quản lý và tăng trưởng các chiến dịch{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>Social Media Marketing</span>.
        </p>

        {/* Feature cards — 3 cột */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginBottom: 14 }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: "#fff", borderRadius: 12, padding: "12px 8px",
              boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid #e5e9f5",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, background: "#EEF4FF",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9,
              }}>
                <Icon size={14} style={{ color: "#0066ff" }} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 5, lineHeight: 1.35 }}>{title}</p>
              <p style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.55, whiteSpace: "pre-line" }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Stats — 4 cột */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
          {STATS.map(({ Icon, value, label }) => (
            <div key={value} style={{
              background: "#fff", borderRadius: 10, padding: "10px 6px",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Icon size={17} style={{ color: "#0066ff", flexShrink: 0 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 2, lineHeight: 1.35 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust — 2 cột */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6, marginBottom: 24 }}>
          {TRUST.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "#fff", borderRadius: 10, padding: "10px 8px",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
            }}>
              <Icon size={15} style={{ color: "#0066ff", flexShrink: 0, marginTop: 1 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: "#111827" }}>{title}</p>
                <p style={{ fontSize: 9.5, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #dde3f0", paddingTop: 16,
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "center", gap: "4px 0", flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: "#9ca3af", width: "100%", textAlign: "center", marginBottom: 6 }}>
            © 2026. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} style={{ fontSize: 11, color: "#6b7280", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FORM — thứ tự 4 trên mobile, cột phải 40% trên desktop
      ══════════════════════════════════════════ */}
      <AuthRightPanel>
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </AuthRightPanel>

      {/* ══════════════════════════════════════════
          MOBILE ONLY — thứ tự 5: Cards
          (ẩn trên desktop)
      ══════════════════════════════════════════ */}
      <div
        className="lg:hidden"
        style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* Feature cards — 1 cột trên mobile */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: "#fff", borderRadius: 12, padding: "12px 14px",
              boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid #e5e9f5",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#EEF4FF",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={16} style={{ color: "#0066ff" }} strokeWidth={1.75} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{title}</p>
                <p style={{ fontSize: 11.5, color: "#9ca3af", whiteSpace: "pre-line", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats — 2 cột trên mobile */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {STATS.map(({ Icon, value, label }) => (
            <div key={value} style={{
              background: "#fff", borderRadius: 10, padding: "12px 10px",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Icon size={20} style={{ color: "#0066ff", flexShrink: 0 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{value}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust — 2 cột trên mobile */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {TRUST.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: "#fff", borderRadius: 10, padding: "12px 10px",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <Icon size={16} style={{ color: "#0066ff", flexShrink: 0, marginTop: 2 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{title}</p>
                <p style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer mobile */}
        <div style={{ borderTop: "1px solid #dde3f0", paddingTop: 14, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>© 2026. All rights reserved.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} style={{ fontSize: 11, color: "#6b7280", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
