"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, FileText, Headphones, Users,
  ChevronDown, ChevronUp, ShoppingCart,
  Shield, CheckCircle,
} from "lucide-react";
import SafeHtml from "@/components/shared/SafeHtml";
import CourseOrderForm from "../CourseOrderForm";
import TestimonialsSection, { type TestimonialItem } from "@/components/shared/TestimonialsSection";

type Tab = "intro" | "content" | "reviews" | "faq";

export interface FaqItemPublic {
  id: string;
  question: string;
  answer: string;
  categoryId: string | null;
}

export interface FaqCategoryPublic {
  id: string;
  name: string;
  faqs: FaqItemPublic[];
}

interface Props {
  description: string | null;
  contentList: string[];
  studentCount: number;
  courseId: string;
  price: number;
  originalPrice: number;
  isOnSale: boolean;
  isLoggedIn: boolean;
  userName: string;
  commitments: string[];
  registrationProcedure: string | null;
  testimonials: TestimonialItem[];
  discountPct?: number;
  faqCategories?: FaqCategoryPublic[];
  uncategorizedFaqs?: FaqItemPublic[];
}

const BENEFITS = [
  { Icon: BookOpen,   color: "#0066ff", bg: "#dbeafe", text: "Kiến thức từ cơ bản đến nâng cao" },
  { Icon: FileText,   color: "#7c3aed", bg: "#ede9fe", text: "Tài liệu độc quyền và cập nhật liên tục" },
  { Icon: Headphones, color: "#10b981", bg: "#d1fae5", text: "Hỗ trợ 24/7 trong suốt quá trình học" },
  { Icon: Users,      color: "#f59e0b", bg: "#fef3c7", text: "Tham gia cộng đồng học viên chất lượng" },
];


const STATIC_FAQS = [
  { q: "Khóa học phù hợp với ai?",               a: "Phù hợp với người mới bắt đầu lẫn người có kinh nghiệm MMO muốn nâng cao kỹ năng kiếm tiền online." },
  { q: "Học xong có hỗ trợ không?",              a: "Có! Bạn được hỗ trợ trọn đời sau khi hoàn thành khóa học qua nhóm cộng đồng và đội ngũ giảng viên." },
  { q: "Tôi có thể học trên điện thoại không?",  a: "Hoàn toàn có thể. Nội dung được tối ưu cho cả máy tính lẫn điện thoại di động." },
  { q: "Thanh toán như thế nào?",                 a: "Thanh toán qua số dư tài khoản hoặc chuyển khoản ngân hàng trực tiếp theo hướng dẫn." },
];


/** Detect if a content item is a section/group header (stored in ALL CAPS). */
function isSectionHeader(item: string): boolean {
  const t = item.trim();
  return t.length > 3 && t === t.toUpperCase() && !t.includes("\n");
}

/** Split item into title (first line) and optional body (remaining lines). */
function parseContentItem(raw: string): { title: string; body: string | null } {
  const nl = raw.indexOf("\n");
  if (nl === -1) return { title: raw.trim(), body: null };
  const body = raw.slice(nl + 1).replace(/^\n+/, "").trimEnd();
  return { title: raw.slice(0, nl).trim(), body: body || null };
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5" style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
        <h3 className="text-base font-bold text-[#0f172a]">{children}</h3>
      </div>
      {count !== undefined && (
        <span className="text-xs font-bold text-white px-3 py-1 rounded-full shrink-0" style={{ background: "#f59e0b" }}>
          {count} phần
        </span>
      )}
    </div>
  );
}


export default function CourseDetailTabs({
  description, contentList, studentCount,
  courseId, price, originalPrice, isOnSale, isLoggedIn, userName,
  commitments, registrationProcedure, testimonials, discountPct = 0,
  faqCategories = [], uncategorizedFaqs = [],
}: Props) {
  const [tab, setTab] = useState<Tab>("intro");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    function onScrollToRegister() {
      setTab("intro");
      setTimeout(() => {
        document.getElementById("course-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
    window.addEventListener("scroll-to-course-register", onScrollToRegister);
    return () => window.removeEventListener("scroll-to-course-register", onScrollToRegister);
  }, []);

  const reviewCount = testimonials.length;

  const TABS: { id: Tab; label: string }[] = [
    { id: "intro",   label: "Giới thiệu" },
    { id: "content", label: "Nội dung đào tạo" },
    { id: "reviews", label: `Đánh giá (${reviewCount})` },
    { id: "faq",     label: "Hỏi đáp" },
  ];

  // Build content groups: split flat list into sections
  const contentGroups: { header: string | null; items: string[] }[] = [];
  for (const item of contentList) {
    if (isSectionHeader(item)) {
      contentGroups.push({ header: item, items: [] });
    } else {
      if (contentGroups.length === 0) contentGroups.push({ header: null, items: [] });
      contentGroups[contentGroups.length - 1]!.items.push(item);
    }
  }
  const hasGroups = contentGroups.some((g) => g.header !== null);

  return (
    <div>
      {/* Tab nav */}
      <div className="flex overflow-x-auto border-b border-[#e2e8f0] mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === id
                ? "border-[#f59e0b] text-[#0f172a]"
                : "border-transparent text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Giới thiệu ── */}
      {tab === "intro" && (
        <div className="space-y-6">
          {description && (
            <div>
              <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-3">
                <h3 className="text-base font-bold text-[#0f172a]">Mô tả khóa học</h3>
              </div>
              <div className="text-sm text-[#64748b] leading-relaxed prose-sm max-w-none">
                {/<[a-zA-Z]/.test(description)
                  ? <SafeHtml html={description} />
                  : <p className="whitespace-pre-line">{description}</p>
                }
              </div>
            </div>
          )}

          {/* Benefits 2×2 */}
          <div>
            <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-3">
              <h3 className="text-base font-bold text-[#0f172a]">Bạn sẽ nhận được</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BENEFITS.map(({ Icon, color, bg, text }) => (
                <div key={text} className="flex items-start gap-3 p-4 rounded-xl border border-[#e2e8f0] bg-[#fafafa]">
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={18} strokeWidth={1.75} style={{ color }} />
                  </div>
                  <span className="text-sm text-[#374151] leading-snug mt-1">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cam kết */}
          {commitments.length > 0 && (
            <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#d1fae5" }}>
                  <Shield size={14} strokeWidth={1.75} style={{ color: "#16a34a" }} />
                </div>
                <h3 className="text-sm font-bold text-[#065f46]">Cam Kết Khóa Học</h3>
              </div>
              <ul className="space-y-2">
                {commitments.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <CheckCircle size={14} strokeWidth={2} className="text-[#16a34a] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#047857] leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Thủ tục đăng ký */}
          {registrationProcedure && (
            <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#bfdbfe" }}>
                  <FileText size={14} strokeWidth={1.75} style={{ color: "#1d4ed8" }} />
                </div>
                <h3 className="text-sm font-bold text-[#1e3a8a]">Thủ Tục Đăng Ký</h3>
              </div>
              <div className="text-xs text-[#1e40af] leading-relaxed whitespace-pre-line">
                {registrationProcedure}
              </div>
            </div>
          )}

          {/* Registration form */}
          <div id="course-form" className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#dbeafe" }}>
                <ShoppingCart size={16} strokeWidth={1.75} style={{ color: "#0066ff" }} />
              </div>
              <h3 className="text-sm font-bold text-[#0f172a]">Đăng ký khóa học</h3>
            </div>
            <CourseOrderForm
              courseId={courseId}
              courseName=""
              price={price}
              originalPrice={originalPrice}
              isOnSale={isOnSale}
              isLoggedIn={isLoggedIn}
              userName={userName}
              discountPct={discountPct}
            />
          </div>
        </div>
      )}

      {/* ── Nội dung đào tạo ── */}
      {tab === "content" && (
        <div>
          <SectionTitle count={contentList.length}>Nội Dung Đào Tạo</SectionTitle>

          {contentList.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">Chưa có nội dung chi tiết.</p>
          ) : (
            <div className="space-y-2">
              {contentList.map((item, i) => {
                const { title, body } = parseContentItem(item);
                const subLines = body
                  ? body.split("\n").map((l) => l.trim()).filter(Boolean)
                  : [];
                return (
                  <div key={i} className="rounded-xl border border-[#e2e8f0] overflow-hidden">
                    {/* Section header — dòng đầu tiên */}
                    <div
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ background: "#eff6ff", borderBottom: subLines.length ? "1px solid #bfdbfe" : undefined }}
                    >
                      <div
                        className="rounded-full shrink-0 flex items-center justify-center font-bold"
                        style={{ width: "22px", height: "22px", background: "#f59e0b", color: "#fff", fontSize: "9px" }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-[#1e3a8a] flex-1">{title}</span>
                    </div>

                    {/* Sub-items — mỗi dòng tiếp theo */}
                    {subLines.length > 0 && (
                      <ul className="divide-y divide-[#f1f5f9] bg-white">
                        {subLines.map((line, j) => (
                          <li
                            key={j}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-[#f8fafc] transition-colors"
                          >
                            <div className="w-4 h-4 rounded-full border border-[#10b981] shrink-0 flex items-center justify-center">
                              <span style={{ color: "#10b981", fontSize: "8px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                            </div>
                            <span className="text-sm text-[#374151] flex-1">{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Đánh giá ── */}
      {tab === "reviews" && (
        <div>
          {testimonials.length === 0 ? (
            <p className="text-sm text-[#94a3b8] py-8 text-center">Chưa có đánh giá nào.</p>
          ) : (
            <TestimonialsSection items={testimonials} />
          )}
        </div>
      )}

      {/* ── Hỏi đáp ── */}
      {tab === "faq" && (
        <div className="space-y-6">
          {faqCategories.length === 0 && uncategorizedFaqs.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Chưa có câu hỏi thường gặp nào.</p>
          ) : (
            <>
              {/* Nhóm theo danh mục */}
              {faqCategories.map((cat) => cat.faqs.length > 0 && (
                <div key={cat.id}>
                  <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-3">
                    <h3 className="text-base font-bold text-text-dark">{cat.name}</h3>
                  </div>
                  <div className="space-y-2">
                    {cat.faqs.map((faq) => (
                      <div key={faq.id} className="border border-border rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-light transition-colors"
                        >
                          <span className="text-sm font-semibold text-text-dark">{faq.question}</span>
                          {openFaq === faq.id
                            ? <ChevronUp size={16} strokeWidth={2} className="text-text-muted shrink-0 ml-2" />
                            : <ChevronDown size={16} strokeWidth={2} className="text-text-muted shrink-0 ml-2" />}
                        </button>
                        {openFaq === faq.id && (
                          <div className="px-5 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                            <p className="text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Câu hỏi không thuộc nhóm */}
              {uncategorizedFaqs.length > 0 && (
                <div>
                  {faqCategories.length > 0 && (
                    <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-3">
                      <h3 className="text-base font-bold text-text-dark">Câu hỏi khác</h3>
                    </div>
                  )}
                  <div className="space-y-2">
                    {uncategorizedFaqs.map((faq) => (
                      <div key={faq.id} className="border border-border rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-light transition-colors"
                        >
                          <span className="text-sm font-semibold text-text-dark">{faq.question}</span>
                          {openFaq === faq.id
                            ? <ChevronUp size={16} strokeWidth={2} className="text-text-muted shrink-0 ml-2" />
                            : <ChevronDown size={16} strokeWidth={2} className="text-text-muted shrink-0 ml-2" />}
                        </button>
                        {openFaq === faq.id && (
                          <div className="px-5 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                            <p className="text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
