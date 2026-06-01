import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck, Zap, Headphones, CreditCard,
  Users, Activity, Clock, RotateCcw, MessageCircle,
} from "lucide-react";
import AuthRightPanel from "./AuthRightPanel";

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
  { label: "Điều khoản dịch vụ",   href: "/dieu-khoan"           },
  { label: "Chính sách bảo mật",   href: "/chinh-sach"           },
  { label: "Chính sách nhà bán hàng", href: "/chinh-sach-nha-ban-hang" },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Toàn trang dùng chung 1 màu nền */
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#EDF1FB" }}>

      {/* ══════════════════════════════════════════
          LEFT — 60% — fixed, does not scroll with right
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col"
        style={{ width: "60%", padding: "24px 48px", overflow: "hidden", flexShrink: 0, minHeight: 0 }}
      >

        {/* ── Logo circle (căn giữa) ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Link
            href="/"
          >
            <Image
              src="/images/djmedia-logo.gif"
              width={300} height={300}
              alt="DJ Media"
              unoptimized
            />
          </Link>
        </div>

        {/* ── Headline (căn giữa) ── */}
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

        {/* ── Description (căn giữa) ── */}
        <p style={{
          fontSize: 13.5, color: "#6b7280", lineHeight: 1.75,
          marginBottom: 28, textAlign: "center",
          maxWidth: 500, margin: "0 auto 28px",
        }}>
          Nền tảng công cụ MMO{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>tốt nhất</span>{" "}
          Việt Nam — tối ưu hoá, quản lý và tăng trưởng các chiến dịch{" "}
          <span style={{ color: "#0066ff", fontWeight: 600 }}>Social Media Marketing</span>.
        </p>

        {/* ── 3 Feature cards — 1 hàng ngang ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14,
        }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: "#fff", borderRadius: 14, padding: "14px 14px",
                boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid #e5e9f5",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: "#EEF4FF",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
              }}>
                <Icon size={16} style={{ color: "#0066ff" }} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: "#111827", marginBottom: 5, lineHeight: 1.35 }}>
                {title}
              </p>
              <p style={{ fontSize: 10.5, color: "#9ca3af", lineHeight: 1.55, whiteSpace: "pre-line" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Stats — 4 cột ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12,
        }}>
          {STATS.map(({ Icon, value, label }) => (
            <div
              key={value}
              style={{
                background: "#fff", borderRadius: 12, padding: "11px 10px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <Icon size={20} style={{ color: "#0066ff", flexShrink: 0 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, lineHeight: 1.35 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trust badges — 2 cột ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 24,
        }}>
          {TRUST.map(({ Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "#fff", borderRadius: 12, padding: "12px 12px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1px solid #e5e9f5",
              }}
            >
              <Icon size={17} style={{ color: "#0066ff", flexShrink: 0, marginTop: 1 }} strokeWidth={1.75} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{title}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: "1px solid #dde3f0", paddingTop: 16,
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "center", gap: "4px 0",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: "#9ca3af", width: "100%", textAlign: "center", marginBottom: 6 }}>
            © 2026. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}
                style={{ fontSize: 11, color: "#6b7280", textDecoration: "none" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════
          RIGHT — 40% — white CARD nổi
      ══════════════════════════════════════════ */}
      <AuthRightPanel>{children}</AuthRightPanel>

    </div>
  );
}
