import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import {
  ShieldCheck, Info, Settings2, Mail, Send, MapPin, CheckCircle2,
  UserRound, CreditCard, Monitor,
} from "lucide-react";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "Chính Sách Bảo Mật | hethongmmo.vn",
  description: "Chính sách bảo mật và quyền riêng tư của nền tảng MMO Marketplace hethongmmo.vn. Cập nhật lần cuối: 02/06/2026.",
  url: "/chinh-sach",
});

type SectionType =
  | { type: "list"; intro?: string; items: string[] }
  | { type: "text"; text: string }
  | { type: "data-collected" }
  | { type: "cookie" }
  | { type: "contact" };

const SECTIONS: ({ id: string; title: string } & SectionType)[] = [
  { id: "du-lieu-thu-thap",  title: "Dữ liệu được thu thập",     type: "data-collected" },
  {
    id: "muc-dich",
    title: "Mục đích sử dụng dữ liệu",
    type: "list",
    intro: "Dữ liệu được sử dụng để:",
    items: [
      "Cung cấp dịch vụ.",
      "Xử lý thanh toán.",
      "Hỗ trợ khách hàng.",
      "Phòng chống gian lận.",
      "Cải thiện hệ thống.",
      "Tuân thủ yêu cầu pháp luật.",
    ],
  },
  {
    id: "chia-se",
    title: "Chia sẻ dữ liệu",
    type: "list",
    intro: "Chúng tôi chỉ chia sẻ dữ liệu khi:",
    items: [
      "Có sự đồng ý của người dùng.",
      "Theo yêu cầu của cơ quan nhà nước có thẩm quyền.",
      "Phục vụ hoạt động thanh toán hoặc vận hành hệ thống.",
    ],
  },
  {
    id: "bao-mat",
    title: "Bảo mật thông tin",
    type: "list",
    intro: "Chúng tôi áp dụng:",
    items: [
      "Mã hóa dữ liệu.",
      "Xác thực nhiều lớp.",
      "Tường lửa bảo mật.",
      "Kiểm soát truy cập nội bộ.",
      "Giám sát an ninh hệ thống 24/7.",
    ],
  },
  {
    id: "quyen-nguoi-dung",
    title: "Quyền của người dùng",
    type: "list",
    intro: "Người dùng có quyền:",
    items: [
      "Xem dữ liệu cá nhân.",
      "Chỉnh sửa thông tin.",
      "Yêu cầu xóa dữ liệu.",
      "Rút lại sự đồng ý xử lý dữ liệu.",
      "Khiếu nại về việc sử dụng dữ liệu cá nhân.",
    ],
  },
  { id: "cookie",       title: "Cookie",               type: "cookie" },
  {
    id: "luu-tru",
    title: "Thời gian lưu trữ",
    type: "list",
    intro: "Thông tin được lưu trữ:",
    items: [
      "Trong thời gian tài khoản còn hoạt động.",
      "Theo thời hạn pháp luật yêu cầu.",
      "Cho đến khi người dùng yêu cầu xóa hợp lệ.",
    ],
  },
  {
    id: "tre-em",
    title: "Bảo vệ trẻ em",
    type: "text",
    text: "Người dưới 16 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ khi sử dụng dịch vụ.",
  },
  {
    id: "chong-lua-dao",
    title: "Chính sách chống lừa đảo",
    type: "list",
    intro: "Các biện pháp phòng chống lừa đảo chúng tôi áp dụng:",
    items: [
      "Xác minh danh tính người bán.",
      "Kiểm tra giao dịch bất thường.",
      "Giới hạn rút tiền đối với tài khoản mới.",
      "Lưu nhật ký giao dịch để xử lý tranh chấp.",
      "Hợp tác với cơ quan chức năng khi phát hiện dấu hiệu vi phạm pháp luật.",
    ],
  },
  { id: "lien-he",     title: "Liên hệ",               type: "contact" },
  {
    id: "cap-nhat",
    title: "Cập nhật chính sách",
    type: "text",
    text: "Chúng tôi có thể cập nhật Chính sách bảo mật bất kỳ lúc nào. Phiên bản mới nhất sẽ được công bố trên website và có hiệu lực kể từ ngày đăng tải.",
  },
];

const TOC = SECTIONS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` }));

const DATA_GROUPS = [
  {
    icon: <UserRound size={18} strokeWidth={1.75} style={{ color: "#059669" }} />,
    label: "Thông tin tài khoản",
    items: ["Họ tên", "Email", "Số điện thoại", "Ảnh đại diện"],
  },
  {
    icon: <CreditCard size={18} strokeWidth={1.75} style={{ color: "#059669" }} />,
    label: "Thông tin giao dịch",
    items: ["Lịch sử mua bán", "Thanh toán", "Đơn hàng"],
  },
  {
    icon: <Monitor size={18} strokeWidth={1.75} style={{ color: "#059669" }} />,
    label: "Dữ liệu kỹ thuật",
    items: ["Địa chỉ IP", "Cookie", "Thiết bị truy cập", "Nhật ký hoạt động"],
  },
];

const COOKIE_PURPOSES = [
  "Duy trì phiên đăng nhập.",
  "Cá nhân hóa trải nghiệm.",
  "Phân tích hành vi sử dụng.",
];

// Accent: green/teal for security theme
const ACCENT = { color: "#059669", bg: "#d1fae5", light: "#f0fdf4", border: "#a7f3d0" };

export default async function ChinhSachBaoMatPage() {
  await guardPublicPage("chinh-sach");
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">Chính sách bảo mật</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ACCENT.bg }}>
              <ShieldCheck size={28} strokeWidth={1.5} style={{ color: ACCENT.color }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">
                Chính Sách Bảo Mật
              </h1>
              <p className="text-sm text-[#64748b]">
                Cập nhật lần cuối:{" "}
                <span className="font-semibold text-[#0f172a]">02/06/2026</span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: ACCENT.light, borderColor: ACCENT.border }}>
              <Info size={18} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: ACCENT.color }} />
              <p className="text-sm text-[#065f46] leading-relaxed">
                Chúng tôi cam kết bảo vệ dữ liệu cá nhân của người dùng theo quy định pháp luật Việt Nam, bao gồm{" "}
                <span className="font-semibold">Nghị định 13/2023/NĐ-CP</span>{" "}
                về bảo vệ dữ liệu cá nhân.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-6 w-full lg:w-64 shrink-0">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <p className="text-xs font-bold text-[#0f172a] uppercase tracking-widest mb-4">Mục lục</p>
            <nav>
              <ol className="space-y-1">
                {TOC.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block text-sm text-[#64748b] hover:text-[#059669] hover:bg-[#f0fdf4] rounded-lg px-3 py-2 transition-all leading-snug"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* GDPR badge */}
          <div className="mt-4 rounded-xl border p-4 text-center" style={{ background: ACCENT.light, borderColor: ACCENT.border }}>
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: ACCENT.bg }}>
              <ShieldCheck size={20} strokeWidth={1.75} style={{ color: ACCENT.color }} />
            </div>
            <p className="text-xs font-bold text-[#065f46] mb-0.5">Tuân thủ pháp luật</p>
            <p className="text-[11px] text-[#047857]">Nghị định 13/2023/NĐ-CP</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-5">
          {SECTIONS.map((section, idx) => {
            const num = idx + 1;

            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden scroll-mt-6"
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]">
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ background: ACCENT.bg, color: ACCENT.color }}
                  >
                    {num}
                  </div>
                  <h2 className="text-base font-bold text-[#0f172a]">{section.title}</h2>
                </div>

                {/* Body */}
                <div className="px-6 py-5">

                  {/* Text */}
                  {section.type === "text" && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc]">
                      <Info size={16} strokeWidth={2} className="shrink-0 mt-0.5 text-text-muted" />
                      <p className="text-sm text-[#374151] leading-relaxed">{section.text}</p>
                    </div>
                  )}

                  {/* List */}
                  {section.type === "list" && (
                    <>
                      {section.intro && (
                        <p className="text-sm text-[#374151] mb-3 font-medium">{section.intro}</p>
                      )}
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <CheckCircle2 size={17} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: ACCENT.color }} />
                            <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Data collected */}
                  {section.type === "data-collected" && (
                    <>
                      <p className="text-sm text-[#374151] mb-4 font-medium">Chúng tôi có thể thu thập:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {DATA_GROUPS.map(({ icon, label, items }) => (
                          <div
                            key={label}
                            className="rounded-xl border p-4"
                            style={{ background: ACCENT.light, borderColor: ACCENT.border }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT.bg }}>
                                {icon}
                              </div>
                              <p className="text-xs font-bold text-[#065f46]">{label}</p>
                            </div>
                            <ul className="space-y-1.5">
                              {items.map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                  <CheckCircle2 size={13} strokeWidth={2.5} className="shrink-0" style={{ color: ACCENT.color }} />
                                  <span className="text-xs text-[#374151]">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Cookie */}
                  {section.type === "cookie" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-[#374151] mb-3">Website sử dụng Cookie nhằm:</p>
                        <ul className="space-y-2">
                          {COOKIE_PURPOSES.map((item) => (
                            <li key={item} className="flex items-start gap-3">
                              <CheckCircle2 size={17} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: ACCENT.color }} />
                              <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-light border border-border">
                        <Settings2 size={16} strokeWidth={2} className="shrink-0 text-text-muted" />
                        <p className="text-xs text-[#374151]">Người dùng có thể tắt Cookie trong cài đặt trình duyệt.</p>
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  {section.type === "contact" && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-[#374151] mb-4">Bộ phận pháp lý &amp; bảo mật</p>
                      {[
                        {
                          icon: <Mail size={14} strokeWidth={2} style={{ color: ACCENT.color }} />,
                          label: "Email",
                          value: "support@hethongmmo.vn",
                          href: "mailto:support@hethongmmo.vn",
                        },
                        {
                          icon: <Send size={14} strokeWidth={2} style={{ color: ACCENT.color }} />,
                          label: "Telegram",
                          value: "@BossMeta789",
                          href: "https://t.me/BossMeta789",
                        },
                        {
                          icon: <MapPin size={14} strokeWidth={2} style={{ color: ACCENT.color }} />,
                          label: "Địa chỉ",
                          value: "Hà Nội, Việt Nam",
                          href: null,
                        },
                      ].map(({ icon, label, value, href }) => (
                        <div key={label} className="flex items-center gap-4 p-3.5 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] hover:border-[#a7f3d0] transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT.bg }}>
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide font-semibold">{label}</p>
                            {href ? (
                              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                                className="text-sm font-medium transition-colors" style={{ color: ACCENT.color }}>
                                {value}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-[#374151]">{value}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* CTA bottom */}
          <div
            className="rounded-xl border p-6 flex flex-col sm:flex-row items-center gap-4 mt-6"
            style={{ background: ACCENT.light, borderColor: ACCENT.border }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#065f46] mb-1">Câu hỏi về quyền riêng tư?</p>
              <p className="text-xs text-[#047857]">Liên hệ bộ phận pháp lý để được hỗ trợ về dữ liệu cá nhân.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href="mailto:support@hethongmmo.vn"
                className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors"
                style={{ background: ACCENT.color }}
              >
                Gửi email
              </a>
              <Link
                href="/dieu-khoan"
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                style={{ borderColor: ACCENT.border, color: "#065f46" }}
              >
                Điều khoản dịch vụ
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
