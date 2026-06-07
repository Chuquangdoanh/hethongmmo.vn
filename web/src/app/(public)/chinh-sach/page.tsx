import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — hethongmmo.vn",
  description: "Chính sách bảo mật và quyền riêng tư của nền tảng MMO Marketplace. Cập nhật lần cuối: 02/06/2026.",
};

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
    icon: "👤",
    label: "Thông tin tài khoản",
    items: ["Họ tên", "Email", "Số điện thoại", "Ảnh đại diện"],
  },
  {
    icon: "💳",
    label: "Thông tin giao dịch",
    items: ["Lịch sử mua bán", "Thanh toán", "Đơn hàng"],
  },
  {
    icon: "🖥️",
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
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={ACCENT.color} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
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
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={ACCENT.color} strokeWidth="2" className="shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
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
                      className="block text-sm text-[#64748b] hover:bg-[#f0fdf4] rounded-lg px-3 py-2 transition-all leading-snug"
                      style={{ ["--tw-text-opacity" as string]: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = ACCENT.color)}
                      onMouseLeave={e => (e.currentTarget.style.color = "")}
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
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={ACCENT.color} strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
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
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" className="shrink-0 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
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
                            <div
                              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                              style={{ background: ACCENT.bg }}
                            >
                              <span style={{ color: ACCENT.color, fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                            </div>
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
                              <span className="text-lg">{icon}</span>
                              <p className="text-xs font-bold text-[#065f46]">{label}</p>
                            </div>
                            <ul className="space-y-1.5">
                              {items.map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                                    style={{ background: ACCENT.bg }}
                                  >
                                    <span style={{ color: ACCENT.color, fontSize: "8px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                                  </div>
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
                              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5" style={{ background: ACCENT.bg }}>
                                <span style={{ color: ACCENT.color, fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                              </div>
                              <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" className="shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
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
                          icon: (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={ACCENT.color} strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          ),
                          label: "Email",
                          value: "support@hethongmmo.vn",
                          href: "mailto:support@hethongmmo.vn",
                        },
                        {
                          icon: (
                            <svg width="14" height="14" fill={ACCENT.color} viewBox="0 0 24 24">
                              <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                          ),
                          label: "Telegram",
                          value: "@BossMeta789",
                          href: "https://t.me/BossMeta789",
                        },
                        {
                          icon: (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={ACCENT.color} strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                          ),
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
