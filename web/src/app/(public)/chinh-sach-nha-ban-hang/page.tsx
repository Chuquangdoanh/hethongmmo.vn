import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { Store, Zap, ShieldCheck, CheckCircle2, XCircle, Info } from "lucide-react";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "Chính Sách Nhà Bán Hàng | hethongmmo.vn",
  description: "Chính sách dành cho nhà bán hàng trên nền tảng MMO Marketplace hethongmmo.vn — quy định, quyền lợi và trách nhiệm.",
  url: "/chinh-sach-nha-ban-hang",
  image: "/images/hethong.png",
});

type SectionType =
  | { type: "list"; intro?: string; items: string[]; accent?: "red" }
  | { type: "text"; text: string }
  | { type: "grouped"; groups: { label: string; items: string[]; accent?: "red" }[] }
  | { type: "violation"; levels: { name: string; desc: string; color: string; bg: string }[] }
  | { type: "fee"; intro: string; items: string[]; note: string };

const SECTIONS: ({ id: string; title: string } & SectionType)[] = [
  {
    id: "dieu-kien",
    title: "Điều kiện mở gian hàng",
    type: "list",
    intro: "Nhà bán hàng cần:",
    items: [
      "Có tài khoản đã xác minh.",
      "Cung cấp thông tin liên hệ chính xác.",
      "Đồng ý với các quy định của nền tảng.",
    ],
  },
  {
    id: "dang-san-pham",
    title: "Đăng sản phẩm",
    type: "grouped",
    groups: [
      {
        label: "Thông tin sản phẩm phải bao gồm:",
        items: [
          "Tên sản phẩm.",
          "Mô tả chi tiết.",
          "Giá bán.",
          "Hình ảnh minh họa.",
          "Điều kiện sử dụng.",
        ],
      },
      {
        label: "Nghiêm cấm:",
        items: [
          "Thông tin sai sự thật.",
          "Hình ảnh gây hiểu nhầm.",
          "Spam từ khóa.",
        ],
        accent: "red",
      },
    ],
  },
  {
    id: "chat-luong",
    title: "Chất lượng dịch vụ",
    type: "list",
    intro: "Nhà bán hàng phải:",
    items: [
      "Giao sản phẩm đúng cam kết.",
      "Hỗ trợ khách hàng.",
      "Xử lý bảo hành nếu có cam kết bảo hành.",
    ],
  },
  {
    id: "xu-ly-vi-pham",
    title: "Xử lý vi phạm",
    type: "violation",
    levels: [
      { name: "Cảnh báo",         desc: "Áp dụng với lỗi nhẹ.",                               color: "#d97706", bg: "#fef3c7" },
      { name: "Ẩn sản phẩm",      desc: "Áp dụng với sản phẩm vi phạm.",                       color: "#ea580c", bg: "#ffedd5" },
      { name: "Đóng băng doanh thu", desc: "Áp dụng khi có tranh chấp.",                       color: "#dc2626", bg: "#fee2e2" },
      { name: "Khóa tài khoản",   desc: "Áp dụng với hành vi gian lận hoặc tái phạm nhiều lần.", color: "#7c3aed", bg: "#ede9fe" },
    ],
  },
  {
    id: "phi-nen-tang",
    title: "Phí nền tảng",
    type: "fee",
    intro: "Sàn có thể thu:",
    items: [
      "Phí giao dịch.",
      "Phí rút tiền.",
      "Phí quảng cáo.",
      "Phí dịch vụ bổ sung.",
    ],
    note: "Mức phí được công bố công khai trên website.",
  },
  {
    id: "danh-gia",
    title: "Chính sách đánh giá",
    type: "grouped",
    groups: [
      {
        label: "Người mua có thể:",
        items: ["Đánh giá sản phẩm.", "Chấm điểm dịch vụ."],
      },
      {
        label: "Nghiêm cấm:",
        items: ["Mua bán đánh giá.", "Đánh giá giả mạo."],
        accent: "red",
      },
    ],
  },
  {
    id: "chong-gian-lan",
    title: "Chính sách chống gian lận",
    type: "list",
    intro: "Nghiêm cấm:",
    items: [
      "Tự mua sản phẩm để tăng doanh số.",
      "Tạo tài khoản ảo.",
      "Thao túng hệ thống.",
      "Rửa tiền.",
      "Lừa đảo khách hàng.",
    ],
    accent: "red",
  },
  {
    id: "hoan-tien",
    title: "Chính sách hoàn tiền",
    type: "grouped" as const,
    groups: [
      {
        label: "Người mua được hoàn tiền khi:",
        items: [
          "Không nhận được sản phẩm.",
          "Sản phẩm không hoạt động.",
          "Người bán không bàn giao theo cam kết.",
        ],
      },
      {
        label: "Không hoàn tiền khi:",
        items: [
          "Người mua đổi ý.",
          "Người mua vi phạm điều khoản sử dụng.",
          "Lỗi phát sinh từ thiết bị hoặc môi trường sử dụng của người mua.",
        ],
        accent: "red" as const,
      },
    ],
  },
];

const TOC = SECTIONS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` }));

export default async function ChinhSachNhaBanHangPage() {
  await guardPublicPage("chinh-sach-nha-ban-hang");
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">Chính sách nhà bán hàng</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#fef3c7] flex items-center justify-center shrink-0">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">
                Chính Sách Dành Cho Nhà Bán Hàng
              </h1>
              <p className="text-sm text-[#64748b]">
                Áp dụng cho tất cả nhà bán hàng trên nền tảng{" "}
                <span className="font-semibold text-[#0066ff]">hethongmmo.vn</span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#f1f5f9] grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Store size={18} strokeWidth={1.75} className="text-[#d97706]" />, title: "Gian hàng minh bạch", desc: "Thông tin sản phẩm rõ ràng, chính xác." },
              { icon: <Zap size={18} strokeWidth={1.75} className="text-[#d97706]" />, title: "Xử lý nhanh", desc: "Giao hàng và hỗ trợ đúng cam kết." },
              { icon: <ShieldCheck size={18} strokeWidth={1.75} className="text-[#d97706]" />, title: "Chống gian lận", desc: "Hệ thống phát hiện vi phạm tự động." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0f172a]">{title}</p>
                  <p className="text-xs text-[#64748b] leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
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

          {/* Quick CTA */}
          <div className="mt-4 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
            <p className="text-xs font-semibold text-[#92400e] mb-1">Muốn trở thành nhà bán?</p>
            <p className="text-xs text-[#78350f] leading-snug mb-3">Liên hệ để được hướng dẫn mở gian hàng.</p>
            <a
              href="https://t.me/BossMeta789"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs font-semibold py-2 rounded-lg bg-[#d97706] text-white hover:bg-[#b45309] transition-colors"
            >
              Liên hệ ngay
            </a>
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
                        : { background: "#fef3c7", color: "#d97706" }
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
                      Nghiêm cấm
                    </span>
                  )}
                </div>

                {/* Section body */}
                <div className="px-6 py-5">

                  {/* Text */}
                  {section.type === "text" && (
                    <p className="text-sm text-[#374151] leading-relaxed">{section.text}</p>
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
                            {isRed
                              ? <XCircle size={17} strokeWidth={2} className="shrink-0 mt-0.5 text-[#dc2626]" />
                              : <CheckCircle2 size={17} strokeWidth={2} className="shrink-0 mt-0.5 text-[#d97706]" />
                            }
                            <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Grouped */}
                  {section.type === "grouped" && (
                    <div className="space-y-5">
                      {section.groups.map((group) => {
                        const groupRed = group.accent === "red";
                        return (
                          <div key={group.label}>
                            <p className="text-sm font-medium text-[#374151] mb-2">{group.label}</p>
                            <ul className="space-y-2">
                              {group.items.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                  {groupRed
                                    ? <XCircle size={17} strokeWidth={2} className="shrink-0 mt-0.5 text-[#dc2626]" />
                                    : <CheckCircle2 size={17} strokeWidth={2} className="shrink-0 mt-0.5 text-[#d97706]" />
                                  }
                                  <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Violation levels */}
                  {section.type === "violation" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.levels.map(({ name, desc, color, bg }, i) => (
                        <div
                          key={name}
                          className="flex items-start gap-3 p-4 rounded-xl border"
                          style={{ background: bg, borderColor: color + "33" }}
                        >
                          <div
                            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: color }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold mb-0.5" style={{ color }}>{name}</p>
                            <p className="text-xs text-[#374151] leading-snug">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fee */}
                  {section.type === "fee" && (
                    <>
                      <p className="text-sm font-medium text-[#374151] mb-3">{section.intro}</p>
                      <ul className="space-y-2 mb-4">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <CheckCircle2 size={17} strokeWidth={2} className="shrink-0 mt-0.5 text-[#d97706]" />
                            <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                        <Info size={14} strokeWidth={2} className="shrink-0 text-primary" />
                        <p className="text-xs text-[#374151]">{section.note}</p>
                      </div>
                    </>
                  )}
                </div>
              </section>
            );
          })}

          {/* CTA bottom */}
          <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-6 flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#92400e] mb-1">Câu hỏi về chính sách bán hàng?</p>
              <p className="text-xs text-[#78350f]">Đội ngũ hỗ trợ sẵn sàng giải đáp mọi thắc mắc.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href="https://t.me/BossMeta789"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-[#d97706] text-white text-sm font-semibold hover:bg-[#b45309] transition-colors"
              >
                Liên hệ ngay
              </a>
              <Link
                href="/dieu-khoan"
                className="px-5 py-2.5 rounded-lg border border-[#fde68a] text-[#92400e] text-sm font-medium hover:bg-white transition-colors"
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
