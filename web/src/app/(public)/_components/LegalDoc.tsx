import Link from "next/link";
import { FileText, ScrollText } from "lucide-react";

// Section types dùng chung cho các trang tài liệu pháp lý mới (Seller/User public).
// Thiết kế đồng bộ với trang Điều khoản dịch vụ hiện có (accent xanh #0066ff).
export type LegalSection =
  | { id: string; title: string; type: "text"; text: string; accent?: "red" }
  | { id: string; title: string; type: "list"; intro?: string; items: string[]; accent?: "red" }
  | { id: string; title: string; type: "grouped"; groups: { label: string; items: string[]; accent?: "red" }[] }
  | { id: string; title: string; type: "definition"; items: { term: string; def: string }[] };

type LegalDocProps = {
  breadcrumb: string;
  title: string;
  subtitle: string;
  intro: string;
  sections: LegalSection[];
  telegramHref: string;
};

// Cam kết pháp lý — tự động thêm cuối mọi tài liệu pháp lý (yêu cầu Phần 5).
const LEGAL_COMMITMENT: LegalSection = {
  id: "cam-ket-phap-ly",
  title: "Cam kết pháp lý",
  type: "list",
  intro: "Cam kết chung áp dụng cho toàn bộ nội dung trên nền tảng:",
  items: [
    "Website chỉ cho phép đăng tải, mua bán, trao đổi các sản phẩm, dịch vụ và tài nguyên hợp pháp.",
    "Mọi sản phẩm phải tuân thủ pháp luật Việt Nam, điều ước quốc tế mà Việt Nam là thành viên và không vi phạm quyền của bất kỳ tổ chức, cá nhân nào.",
    "Website có quyền từ chối, ẩn, khóa hoặc gỡ bỏ bất kỳ nội dung nào có dấu hiệu vi phạm pháp luật Việt Nam, pháp luật quốc tế, quyền sở hữu trí tuệ, quyền riêng tư hoặc quy định của các nhà cung cấp dịch vụ bên thứ ba.",
  ],
};

export default function LegalDoc({ breadcrumb, title, subtitle, intro, sections, telegramHref }: LegalDocProps) {
  const allSections: LegalSection[] = [...sections, LEGAL_COMMITMENT];
  const toc = allSections.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` }));

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">{breadcrumb}</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center shrink-0">
              <ScrollText size={28} strokeWidth={1.5} style={{ color: "#0066ff" }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">{title}</h1>
              <p className="text-sm text-[#64748b]">{subtitle}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
            <p className="text-sm text-[#374151] leading-relaxed">{intro}</p>
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
                {toc.map(({ id, label }) => (
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
          {allSections.map((section, idx) => {
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
                  <h2 className="text-base font-bold" style={{ color: isRed ? "#991b1b" : "#0f172a" }}>
                    {section.title}
                  </h2>
                  {isRed && (
                    <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] shrink-0">
                      Nghiêm cấm
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
                      {section.intro && (
                        <p className="text-sm text-[#374151] mb-3 font-medium">{section.intro}</p>
                      )}
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                              style={isRed ? { background: "#fee2e2" } : { background: "#eff6ff" }}
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
                      {section.groups.map((group) => {
                        const groupRed = group.accent === "red";
                        return (
                          <div key={group.label}>
                            <p className="text-sm font-medium text-[#374151] mb-2">{group.label}</p>
                            <ul className="space-y-2 pl-1">
                              {group.items.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                  <div
                                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                                    style={groupRed ? { background: "#fee2e2" } : { background: "#eff6ff" }}
                                  >
                                    {groupRed ? (
                                      <span style={{ color: "#dc2626", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✕</span>
                                    ) : (
                                      <span style={{ color: "#0066ff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* CTA bottom */}
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-6 flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="flex-1 flex items-start gap-3">
              <FileText size={20} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: "#0066ff" }} />
              <div>
                <p className="text-sm font-semibold text-[#1e3a8a] mb-1">Bạn có câu hỏi về chính sách này?</p>
                <p className="text-xs text-[#64748b]">Liên hệ đội ngũ hỗ trợ để được giải đáp nhanh nhất.</p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href={telegramHref}
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
