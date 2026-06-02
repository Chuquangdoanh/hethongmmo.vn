import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ — hethongmmo.vn",
  description: "Điều khoản sử dụng nền tảng MMO Marketplace. Cập nhật lần cuối: 02/06/2026.",
};

const SECTIONS = [
  {
    id: "dinh-nghia",
    title: "Định nghĩa",
    items: [
      { term: "Sàn MMO", def: "Nền tảng trung gian kết nối Người bán và Người mua." },
      { term: "Người bán", def: "Cá nhân hoặc tổ chức đăng bán sản phẩm, dịch vụ số." },
      { term: "Người mua", def: "Cá nhân hoặc tổ chức mua sản phẩm trên nền tảng." },
      { term: "Sản phẩm số", def: "Tài khoản, phần mềm, source code, khóa học, dịch vụ marketing, dịch vụ mạng xã hội, tài nguyên số, website, hosting, VPS và các sản phẩm hợp pháp khác." },
    ],
    type: "definition" as const,
  },
  {
    id: "dieu-kien",
    title: "Điều kiện sử dụng",
    intro: "Người dùng phải:",
    items: [
      "Từ đủ 18 tuổi hoặc được người giám hộ hợp pháp cho phép.",
      "Cung cấp thông tin chính xác khi đăng ký.",
      "Chịu trách nhiệm bảo mật tài khoản.",
      "Không chia sẻ tài khoản cho bên thứ ba.",
    ],
    type: "list" as const,
  },
  {
    id: "nha-ban-hang",
    title: "Quy định dành cho nhà bán hàng",
    intro: "Nhà bán hàng cam kết:",
    items: [
      "Sở hữu hợp pháp sản phẩm đăng bán.",
      "Không bán sản phẩm vi phạm pháp luật Việt Nam.",
      "Không bán tài khoản bị đánh cắp.",
      "Không bán dữ liệu cá nhân trái phép.",
      "Không bán phần mềm độc hại, virus, mã độc.",
      "Không thực hiện hành vi lừa đảo.",
      "Cung cấp mô tả sản phẩm chính xác.",
      "Hỗ trợ khách hàng theo đúng cam kết.",
    ],
    type: "list" as const,
  },
  {
    id: "san-pham-cam",
    title: "Danh mục sản phẩm bị cấm",
    intro: "Cấm đăng bán:",
    items: [
      "Dữ liệu cá nhân trái phép.",
      "Tài khoản ngân hàng.",
      "Giấy tờ giả.",
      "Công cụ hack, malware, ransomware.",
      "Phần mềm tấn công mạng.",
      "Công cụ spam bất hợp pháp.",
      "Nội dung vi phạm bản quyền.",
      "Vũ khí, chất cấm.",
      "Nội dung đồi trụy.",
      "Hàng hóa bị pháp luật cấm kinh doanh.",
    ],
    type: "list" as const,
    accent: "red" as const,
  },
  {
    id: "giao-dich",
    title: "Giao dịch và thanh toán",
    items: [
      "Mọi giao dịch được thực hiện thông qua hệ thống.",
      "Sàn có quyền giữ tiền giao dịch để xác minh tranh chấp.",
      "Phí giao dịch được công bố công khai trên website.",
      "Thanh toán hoàn tất khi hệ thống xác nhận thành công.",
    ],
    type: "list" as const,
  },
  {
    id: "hoan-tien",
    title: "Hoàn tiền và tranh chấp",
    groups: [
      {
        label: "Người mua được quyền khiếu nại nếu:",
        items: ["Không nhận được sản phẩm.", "Sản phẩm không đúng mô tả.", "Sản phẩm lỗi không thể sử dụng."],
      },
      {
        label: "Sàn có quyền:",
        items: ["Tạm giữ thanh toán.", "Yêu cầu bằng chứng từ hai bên.", "Ra quyết định cuối cùng dựa trên dữ liệu giao dịch."],
      },
    ],
    type: "grouped" as const,
  },
  {
    id: "quyen-san",
    title: "Quyền của sàn",
    intro: "Chúng tôi có quyền:",
    items: [
      "Gỡ bỏ sản phẩm vi phạm.",
      "Khóa tài khoản vi phạm.",
      "Từ chối cung cấp dịch vụ.",
      "Hợp tác với cơ quan chức năng khi có yêu cầu hợp pháp.",
    ],
    type: "list" as const,
  },
  {
    id: "trach-nhiem",
    title: "Giới hạn trách nhiệm",
    intro: "Sàn đóng vai trò trung gian kết nối. Chúng tôi không chịu trách nhiệm đối với:",
    items: [
      "Thiệt hại phát sinh từ việc sử dụng sản phẩm.",
      "Thỏa thuận ngoài hệ thống.",
      "Tổn thất do lỗi từ người dùng.",
    ],
    type: "list" as const,
  },
  {
    id: "cham-dut",
    title: "Chấm dứt tài khoản",
    intro: "Tài khoản có thể bị khóa nếu:",
    items: [
      "Gian lận giao dịch.",
      "Cung cấp thông tin giả.",
      "Lạm dụng hệ thống.",
      "Vi phạm điều khoản.",
    ],
    type: "list" as const,
    accent: "red" as const,
  },
  {
    id: "khieu-nai-tranh-chap",
    title: "Khiếu nại & Tranh chấp",
    type: "list" as const,
    items: [
      "Thời gian khiếu nại: 7 ngày kể từ khi nhận sản phẩm.",
      "Khiếu nại phải có bằng chứng kèm theo.",
      "Hai bên có trách nhiệm hợp tác cung cấp thông tin.",
      "Quyết định của hệ thống trọng tài nội bộ là căn cứ xử lý cuối cùng.",
      "Trường hợp nghi ngờ gian lận, sàn có quyền tạm giữ thanh toán để xác minh.",
    ],
  },
  {
    id: "thay-doi",
    title: "Thay đổi điều khoản",
    text: "Chúng tôi có quyền cập nhật điều khoản bất kỳ lúc nào và thông báo trên nền tảng.",
    type: "text" as const,
  },
];

const TOC = SECTIONS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` }));

export default function DieuKhoanPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">Điều khoản dịch vụ</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center shrink-0">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0066ff" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">
                Điều Khoản Sử Dụng Sàn MMO
              </h1>
              <p className="text-sm text-[#64748b]">
                Cập nhật lần cuối:{" "}
                <span className="font-semibold text-[#0f172a]">02/06/2026</span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
            <p className="text-sm text-[#374151] leading-relaxed">
              Chào mừng bạn đến với nền tảng{" "}
              <span className="font-semibold text-[#0066ff]">MMO Marketplace</span>{" "}
              (&ldquo;Sàn&rdquo;, &ldquo;Chúng tôi&rdquo;). Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên nền tảng, bạn đồng ý tuân thủ toàn bộ Điều khoản sử dụng này.
            </p>
          </div>
        </div>
      </div>

      {/* ── Body: TOC sidebar + Content ── */}
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
                      className="block text-sm text-[#64748b] hover:text-[#0066ff] hover:bg-[#eff6ff] rounded-lg px-3 py-2 transition-all leading-snug"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-5">
          {SECTIONS.map((section, idx) => {
            const num = idx + 1;
            const isRed = "accent" in section && section.accent === "red";

            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden scroll-mt-6"
              >
                {/* Section header */}
                <div
                  className="flex items-center gap-3 px-6 py-4 border-b border-[#f1f5f9]"
                  style={{ background: isRed ? "#fff1f2" : "#f8fafc" }}
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                    style={
                      isRed
                        ? { background: "#fee2e2", color: "#dc2626" }
                        : { background: "#dbeafe", color: "#1d4ed8" }
                    }
                  >
                    {num}
                  </div>
                  <h2
                    className="text-base font-bold"
                    style={{ color: isRed ? "#991b1b" : "#0f172a" }}
                  >
                    {section.title}
                  </h2>
                  {isRed && (
                    <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] shrink-0">
                      Bị cấm
                    </span>
                  )}
                </div>

                {/* Section body */}
                <div className="px-6 py-5">
                  {/* Text type */}
                  {section.type === "text" && (
                    <p className="text-sm text-[#374151] leading-relaxed">{section.text}</p>
                  )}

                  {/* Definition type */}
                  {section.type === "definition" && (
                    <dl className="space-y-3">
                      {section.items.map((def) => (
                        <div key={def.term} className="flex gap-3">
                          <dt className="text-sm font-semibold text-[#0f172a] shrink-0 min-w-[110px]">
                            {def.term}:
                          </dt>
                          <dd className="text-sm text-[#374151] leading-relaxed">{def.def}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* List type */}
                  {section.type === "list" && (
                    <>
                      {"intro" in section && section.intro && (
                        <p className="text-sm text-[#374151] mb-3 font-medium">{section.intro}</p>
                      )}
                      <ul className="space-y-2">
                        {(section.items as string[]).map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                              style={
                                isRed
                                  ? { background: "#fee2e2" }
                                  : { background: "#eff6ff" }
                              }
                            >
                              {isRed ? (
                                <span style={{ color: "#dc2626", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✕</span>
                              ) : (
                                <span style={{ color: "#0066ff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                              )}
                            </div>
                            <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Grouped type */}
                  {section.type === "grouped" && (
                    <div className="space-y-5">
                      {section.groups.map((group) => (
                        <div key={group.label}>
                          <p className="text-sm font-medium text-[#374151] mb-2">{group.label}</p>
                          <ul className="space-y-2 pl-1">
                            {group.items.map((item) => (
                              <li key={item} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 bg-[#eff6ff]">
                                  <span style={{ color: "#0066ff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                                </div>
                                <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* CTA bottom */}
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-6 flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1e3a8a] mb-1">Bạn có câu hỏi về điều khoản?</p>
              <p className="text-xs text-[#64748b]">Liên hệ đội ngũ hỗ trợ để được giải đáp nhanh nhất.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href="https://t.me/BossMeta789"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-semibold hover:bg-[#0047cc] transition-colors"
              >
                Liên hệ ngay
              </a>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-lg border border-[#bfdbfe] text-[#1d4ed8] text-sm font-medium hover:bg-white transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
