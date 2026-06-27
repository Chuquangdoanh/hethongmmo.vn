import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { buildMeta } from "@/lib/utils/seo";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import {
  ExternalLink, Send, Headphones, Zap, ShieldCheck,
  Users, FileText, AlertTriangle, CheckCircle,
} from "lucide-react";

export const metadata: Metadata = buildMeta({
  title: "Giới Thiệu | Hệ Thống MMO — DJ Media",
  description: "Tìm hiểu về hethongmmo.vn — nền tảng dịch vụ mạng xã hội, khóa học MMO và tài nguyên số #1 Việt Nam. Kết nối cộng đồng Telegram, fanpage Facebook, hỗ trợ 24/7.",
  url: "/gioi-thieu",
  image: "/images/hethong.png",
});

const VALUES = [
  {
    Icon: ShieldCheck,
    color: "#059669",
    bg: "#d1fae5",
    title: "An toàn & Đáng tin",
    desc: "Mọi giao dịch đều được bảo mật và ghi lại minh bạch. Hệ thống escrow bảo vệ quyền lợi người mua.",
  },
  {
    Icon: Zap,
    color: "#f59e0b",
    bg: "#fef3c7",
    title: "Xử lý tức thì 24/7",
    desc: "Hệ thống tự động hoạt động liên tục — đặt hàng lúc nào cũng được, giao hàng ngay lập tức.",
  },
  {
    Icon: CheckCircle,
    color: "#0066ff",
    bg: "#dbeafe",
    title: "Giá cả cạnh tranh",
    desc: "Cam kết giá thấp nhất thị trường, hoàn tiền nếu không đáp ứng được yêu cầu.",
  },
  {
    Icon: Headphones,
    color: "#7c3aed",
    bg: "#ede9fe",
    title: "Hỗ trợ tận tâm",
    desc: "Đội ngũ hỗ trợ trực tiếp qua Telegram, Zalo, Facebook — phản hồi trong vòng 30 phút.",
  },
];

const POLICIES = [
  {
    Icon: FileText,
    color: "#1d4ed8",
    bg: "#dbeafe",
    title: "Quy định hỗ trợ & bảo hành",
    items: [
      "Hỗ trợ bảo hành trong vòng 24 giờ kể từ khi đơn hàng được bàn giao thành công.",
      "Sai mật khẩu, sai thông tin đăng nhập hoặc mail lỗi — được hỗ trợ ngay.",
      "Link BM lỗi hoặc sản phẩm không đúng mô tả — được xử lý ưu tiên.",
      "Đơn hàng khiếu nại hợp lệ do Seller và đội ngũ hỗ trợ xử lý trong ngày.",
    ],
  },
  {
    Icon: ShieldCheck,
    color: "#059669",
    bg: "#d1fae5",
    title: "Cam kết của Hệ Thống MMO",
    items: [
      "Bảo vệ quyền lợi của người mua và nhà bán hàng.",
      "Hỗ trợ xử lý tranh chấp minh bạch, công bằng.",
      "Ưu tiên giải quyết nhanh các đơn hàng có khiếu nại hợp lệ.",
      "Xây dựng môi trường giao dịch MMO an toàn, uy tín và bền vững.",
      "Nói không với lừa đảo, gian lận và các hành vi ảnh hưởng đến cộng đồng.",
    ],
  },
  {
    Icon: AlertTriangle,
    color: "#d97706",
    bg: "#fef3c7",
    title: "Lưu ý quan trọng",
    items: [
      "Chỉ tiếp nhận khiếu nại trong vòng 24 giờ kể từ thời điểm mua hàng.",
      "Sau 24 giờ, hệ thống mặc định đơn hàng đã được kiểm tra và sử dụng ổn định.",
      "Người mua có trách nhiệm kiểm tra đầy đủ thông tin sản phẩm ngay sau khi nhận.",
      "Không chịu trách nhiệm nếu người mua tự thay đổi thông tin tài khoản.",
      "Không hỗ trợ trường hợp chuyển giao, chia sẻ hoặc bán lại tài khoản cho bên thứ ba.",
    ],
  },
];

export default async function GioiThieuPage() {
  await guardPublicPage("gioi-thieu");
  const contactCms = await getSiteContent<{ quickButtons?: { id: string; label: string; href: string }[] }>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);
  const telegramHref = contactCms.quickButtons?.find((b) => b.id === "telegram")?.href ?? "https://web.telegram.org/k/#@hethongmmovn";

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-12">

      {/* ── HERO ── */}
      <div className="text-center mb-14">
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(0,102,255,.07)", border: "1px solid rgba(0,102,255,.18)",
          color: "#0066ff", padding: "5px 16px", borderRadius: "100px",
          fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.4px",
          textTransform: "uppercase", marginBottom: "16px",
        }}>
          DJ Media Agency — Từ 2019
        </div>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: "900",
          color: "#0f172a", lineHeight: "1.2", marginBottom: "16px",
          letterSpacing: "-0.03em",
        }}>
          Về{" "}
          <span style={{ color: "#0066ff" }}>hethongmmo.vn</span>
        </h1>
        <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: "1.75", maxWidth: "640px", margin: "0 auto" }}>
          Nền tảng cung cấp dịch vụ MMO toàn diện tại Việt Nam — từ dịch vụ tăng tương tác mạng xã hội,
          khóa học, tài liệu tut/tricks cho đến marketplace tài nguyên số an toàn.
        </p>
      </div>

      {/* ── SỨ MỆNH ── */}
      <div style={{
        borderRadius: "20px", border: "1px solid #e2e8f0", background: "#fff",
        padding: "40px 32px", marginBottom: "48px", textAlign: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,.05)",
      }}>
        <p style={{ fontSize: ".72rem", color: "#0066ff", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.4px", marginBottom: "12px" }}>
          Sứ mệnh
        </p>
        <blockquote style={{ fontSize: "1.15rem", fontWeight: "700", color: "#0f172a", lineHeight: "1.65", margin: 0 }}>
          &ldquo;Làm cho việc kiếm tiền online trở nên dễ dàng, minh bạch và đáng tin cậy cho mọi người Việt Nam.&rdquo;
        </blockquote>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "48px" }} className="stats-grid-responsive">
        {[
          { value: "2019", label: "Năm thành lập" },
          { value: "59K+", label: "Khách hàng" },
          { value: "363K+", label: "Đơn hoàn thành" },
          { value: "99.9%", label: "Tỷ lệ thành công" },
        ].map(({ value, label }) => (
          <div key={label} style={{
            borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff",
            padding: "20px 16px", textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,.04)",
          }}>
            <p style={{ fontSize: "1.6rem", fontWeight: "900", color: "#0066ff", lineHeight: 1, marginBottom: "6px" }}>{value}</p>
            <p style={{ fontSize: ".72rem", color: "#64748b", fontWeight: "500" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── GIÁ TRỊ CỐT LÕI ── */}
      <div style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", marginBottom: "24px", textAlign: "center" }}>
          Giá trị cốt lõi
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }} className="grid-2-responsive">
          {VALUES.map(({ Icon, color, bg, title, desc }) => (
            <div key={title} style={{
              borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff",
              padding: "24px", display: "flex", gap: "16px", alignItems: "flex-start",
            }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.75} style={{ color }} />
              </div>
              <div>
                <h3 style={{ fontSize: ".92rem", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>{title}</h3>
                <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: "1.6", margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CỘNG ĐỒNG & KÊNH LIÊN LẠC ── */}
      <div style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", marginBottom: "6px", textAlign: "center" }}>
          Cộng đồng & Liên lạc
        </h2>
        <p style={{ textAlign: "center", fontSize: ".88rem", color: "#64748b", marginBottom: "24px" }}>
          Kết nối với chúng tôi qua các kênh chính thức
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }} className="grid-2-responsive">

          {/* Telegram */}
          <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Send size={17} strokeWidth={1.75} style={{ color: "#0891b2" }} />
              </div>
              <h3 style={{ fontSize: ".92rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Nhóm Telegram</h3>
            </div>
            <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: "1.6", marginBottom: "12px" }}>
              Cộng đồng Update Biến Chuyển Meta — chia sẻ tài nguyên và xu hướng MMO, Facebook Ads mới nhất.
            </p>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: ".8rem", fontWeight: "600", color: "#0891b2", textDecoration: "none" }}
            >
              t.me/hethongmmovn <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>

          {/* Chăm sóc khách hàng */}
          <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Headphones size={17} strokeWidth={1.75} style={{ color: "#7c3aed" }} />
              </div>
              <h3 style={{ fontSize: ".92rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Chăm sóc khách hàng</h3>
            </div>
            <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: "1.6", marginBottom: "8px" }}>
              HỆ THỐNG MMO — Telegram:
            </p>
            <p style={{ fontSize: ".95rem", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>@BossMeta789</p>
            <p style={{ fontSize: ".78rem", fontWeight: "600", color: "#059669" }}>Hỗ trợ 24/7 mọi ngày</p>
          </div>

          {/* Cộng đồng MMO */}
          <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users size={17} strokeWidth={1.75} style={{ color: "#059669" }} />
              </div>
              <h3 style={{ fontSize: ".92rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Cộng Đồng MMO</h3>
            </div>
            <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
              Nơi giao lưu, chia sẻ kiến thức, tài nguyên và cập nhật các xu hướng mới nhất về MMO, Facebook Ads, Marketing và kiếm tiền online.
            </p>
          </div>

          {/* Fanpage */}
          <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {/* Facebook "f" logo */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </div>
              <h3 style={{ fontSize: ".92rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Kênh Fanpage Chính Thức</h3>
            </div>
            <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: "1.6", marginBottom: "12px" }}>
              Cập nhật tin tức, khuyến mãi và thông tin mới nhất từ DJ Media.
            </p>
            <a
              href="https://www.facebook.com/hethongmmo.vn/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: ".8rem", fontWeight: "600", color: "#1877F2", textDecoration: "none" }}
            >
              facebook.com/hethongmmo.vn <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "32px", flexWrap: "wrap",
          background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
          padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)",
        }}>
          {[
            { Icon: Zap,         color: "#f59e0b", bg: "#fef3c7", text: "Giao hàng tự động" },
            { Icon: ShieldCheck, color: "#059669", bg: "#d1fae5", text: "Bảo mật 100%"      },
            { Icon: Headphones,  color: "#7c3aed", bg: "#ede9fe", text: "Hỗ trợ 24/7"       },
          ].map(({ Icon, color, bg, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} strokeWidth={1.75} style={{ color }} />
              </div>
              <span style={{ fontSize: ".88rem", fontWeight: "600", color: "#374151" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHÍNH SÁCH & CAM KẾT ── */}
      <div style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", marginBottom: "6px", textAlign: "center" }}>
          Chính sách & Cam kết
        </h2>
        <p style={{ textAlign: "center", fontSize: ".88rem", color: "#64748b", marginBottom: "24px" }}>
          Quy định rõ ràng — bảo vệ cả người mua và nhà bán hàng
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {POLICIES.map(({ Icon, color, bg, title, items }) => (
            <div key={title} style={{
              borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff",
              padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.75} style={{ color }} />
                </div>
                <h3 style={{ fontSize: ".95rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>{title}</h3>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, marginTop: "6px", flexShrink: 0 }} />
                    <span style={{ fontSize: ".85rem", color: "#374151", lineHeight: "1.6" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── ĐỘI NGŨ ── */}
      <div style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", marginBottom: "24px", textAlign: "center" }}>
          Đội ngũ sáng lập
        </h2>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "linear-gradient(135deg, #0066ff, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", margin: "0 auto 12px",
              boxShadow: "0 8px 24px rgba(0,102,255,.25)",
            }}>
              👨‍💼
            </div>
            <p style={{ fontSize: ".95rem", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>Chu Quang Doanh</p>
            <p style={{ fontSize: ".8rem", color: "#64748b" }}>Founder &amp; CEO</p>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{
        textAlign: "center", borderRadius: "20px",
        background: "linear-gradient(135deg, rgba(0,64,179,.95) 0%, rgba(0,90,230,.95) 100%)",
        padding: "40px 32px", boxShadow: "0 16px 40px rgba(0,64,179,.3)",
      }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff", marginBottom: "10px" }}>
          Sẵn sàng bắt đầu?
        </h2>
        <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.75)", marginBottom: "24px", lineHeight: "1.6" }}>
          Đăng ký miễn phí và khám phá hàng trăm dịch vụ ngay hôm nay.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href="/dang-ky"
            style={{
              padding: "12px 28px", borderRadius: "10px", background: "#fff",
              color: "#0066ff", fontSize: ".9rem", fontWeight: "700",
              textDecoration: "none", display: "inline-block",
            }}
          >
            Đăng ký ngay
          </Link>
          <Link
            href="/lien-he"
            style={{
              padding: "12px 28px", borderRadius: "10px",
              border: "1.5px solid rgba(255,255,255,.4)",
              color: "#fff", fontSize: ".9rem", fontWeight: "600",
              textDecoration: "none", display: "inline-block",
            }}
          >
            Liên hệ chúng tôi
          </Link>
        </div>
      </div>

    </div>
  );
}
