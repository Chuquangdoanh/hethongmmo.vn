"use client";

import { useState } from "react";
import {
  BookOpen, FileText, Headphones, Users,
  ChevronDown, ChevronUp, ShoppingCart,
  Shield, CheckCircle,
} from "lucide-react";
import SafeHtml from "@/components/shared/SafeHtml";
import CourseOrderForm from "../CourseOrderForm";

type Tab = "intro" | "content" | "reviews" | "faq";
type ReviewFilter = "newest" | "best" | 1 | 2 | 3 | 4 | 5;

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
}

const BENEFITS = [
  { Icon: BookOpen,   color: "#0066ff", bg: "#dbeafe", text: "Kiến thức từ cơ bản đến nâng cao" },
  { Icon: FileText,   color: "#7c3aed", bg: "#ede9fe", text: "Tài liệu độc quyền và cập nhật liên tục" },
  { Icon: Headphones, color: "#10b981", bg: "#d1fae5", text: "Hỗ trợ 24/7 trong suốt quá trình học" },
  { Icon: Users,      color: "#f59e0b", bg: "#fef3c7", text: "Tham gia cộng đồng học viên chất lượng" },
];

const COURSE_COMMITMENTS = [
  "Chất lượng giảng dạy được đảm bảo bởi đội ngũ chuyên gia",
  "Hoàn tiền 100% nếu không hài lòng trong 7 ngày",
  "Hỗ trợ học viên trọn đời sau khi hoàn thành khóa học",
];

const STATIC_REVIEWS = [
  { name: "Nguyễn Quốc Hùng", initials: "NQH", color: "#0066ff", rating: 5, date: "01/05/2026", text: "Đội ngũ dạy rất nhiệt tình. Hỏa đắm nội học cực học hàng cần thể mọi hỗ trợ được support." },
  { name: "Phạm Viết Uy",     initials: "PVU", color: "#10b981", rating: 5, date: "28/04/2026", text: "Mình nghĩ lĩnh công ty chuyển tiếp công nghệ đều Media học được nhiều kiến thức, chuyên sâu về Facebook và Tik Tok, cũng đã kiếm được 1 tỷ. Cảm ơn đội ngũ Đẳng nhiều." },
  { name: "Lê Thảo Linh",    initials: "LTL", color: "#7c3aed", rating: 5, date: "20/04/2026", text: "Tôi đang quan tâm đến khóa học này của bạn." },
  { name: "Nguyễn Ngọc Mỹ",  initials: "NNM", color: "#f59e0b", rating: 5, date: "15/04/2026", text: "Quá tuyệt vời, học xong tôi tự tin về kỹ năng và kiếm tiền từ Facebook và Tik Tok, áp dụng cho công việc tại Thẩm Mỹ Viện hiện tại." },
];

const STATIC_FAQS = [
  { q: "Khóa học phù hợp với ai?",               a: "Phù hợp với người mới bắt đầu lẫn người có kinh nghiệm MMO muốn nâng cao kỹ năng kiếm tiền online." },
  { q: "Học xong có hỗ trợ không?",              a: "Có! Bạn được hỗ trợ trọn đời sau khi hoàn thành khóa học qua nhóm cộng đồng và đội ngũ giảng viên." },
  { q: "Tôi có thể học trên điện thoại không?",  a: "Hoàn toàn có thể. Nội dung được tối ưu cho cả máy tính lẫn điện thoại di động." },
  { q: "Thanh toán như thế nào?",                 a: "Thanh toán qua số dư tài khoản hoặc chuyển khoản ngân hàng trực tiếp theo hướng dẫn." },
];

const REVIEW_FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: "newest", label: "Mới nhất" },
  { id: "best",   label: "Có ích nhất" },
  { id: 5,        label: "5 ★" },
  { id: 4,        label: "4 ★" },
  { id: 3,        label: "3 ★" },
];

/** Detect if a content item is a section/group header (stored in ALL CAPS). */
function isSectionHeader(item: string): boolean {
  const t = item.trim();
  return t.length > 3 && t === t.toUpperCase();
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5" style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }}>
        <h3 className="text-base font-bold text-[#0f172a]">{children}</h3>
      </div>
      {count !== undefined && (
        <span className="text-xs font-bold text-white px-3 py-1 rounded-full shrink-0" style={{ background: "#f59e0b" }}>
          {count} nội dung
        </span>
      )}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={`text-xs ${s <= rating ? "text-[#f59e0b]" : "text-[#d1d5db]"}`}>★</span>
      ))}
    </div>
  );
}

export default function CourseDetailTabs({
  description, contentList, studentCount,
  courseId, price, originalPrice, isOnSale, isLoggedIn, userName,
}: Props) {
  const [tab, setTab] = useState<Tab>("intro");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("newest");

  const TABS: { id: Tab; label: string }[] = [
    { id: "intro",   label: "Giới thiệu" },
    { id: "content", label: "Nội dung đào tạo" },
    { id: "reviews", label: `Đánh giá (${Math.max(studentCount, STATIC_REVIEWS.length)})` },
    { id: "faq",     label: "Hỏi đáp" },
  ];

  const visibleReviews = reviewFilter === "newest" || reviewFilter === "best"
    ? STATIC_REVIEWS
    : STATIC_REVIEWS.filter((r) => r.rating === reviewFilter);

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
                <SafeHtml html={description} />
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
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#d1fae5" }}>
                <Shield size={14} strokeWidth={1.75} style={{ color: "#16a34a" }} />
              </div>
              <h3 className="text-sm font-bold text-[#065f46]">Cam Kết Khóa Học</h3>
            </div>
            <ul className="space-y-2">
              {COURSE_COMMITMENTS.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <CheckCircle size={14} strokeWidth={2} className="text-[#16a34a] shrink-0 mt-0.5" />
                  <span className="text-xs text-[#047857] leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>

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
            />
          </div>
        </div>
      )}

      {/* ── Nội dung đào tạo ── */}
      {tab === "content" && (
        <div>
          <SectionTitle count={contentList.length}>Nội dung đào tạo</SectionTitle>

          {contentList.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">Chưa có nội dung chi tiết.</p>
          ) : hasGroups ? (
            /* Grouped view — with section headers */
            <div className="space-y-4">
              {contentGroups.map((group, gi) => (
                <div key={gi}>
                  {/* Section header */}
                  {group.header && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2"
                      style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "#f59e0b" }}
                      >
                        {gi + 1}
                      </div>
                      <span className="text-sm font-bold text-[#92400e]">{group.header}</span>
                    </div>
                  )}
                  {/* Items under this section */}
                  {group.items.length > 0 && (
                    <ul className="space-y-1 pl-2">
                      {group.items.map((item, ii) => (
                        <li
                          key={ii}
                          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white border border-[#f1f5f9] hover:border-[#e2e8f0] hover:bg-[#fafafa] transition-colors"
                        >
                          <div
                            className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                            style={{ background: "#fff7ed" }}
                          >
                            <span style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 700 }}>✓</span>
                          </div>
                          <span className="text-sm text-[#374151] leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Flat view — no headers detected */
            <ul className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-xl overflow-hidden">
              {contentList.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-5 py-4 bg-white hover:bg-[#f8fafc] transition-colors group"
                >
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={
                      i === 0
                        ? { background: "#0066ff", color: "#fff" }
                        : { background: "#fff7ed", color: "#ea580c", border: "1.5px solid #fed7aa" }
                    }
                  >
                    {i + 1}
                  </div>
                  <span className="flex-1 text-sm text-[#374151]">{item}</span>
                  {i === 0 && (
                    <span
                      className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full"
                      style={{ color: "#10b981", background: "#d1fae5" }}
                    >
                      Đã mở khóa
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Đánh giá ── */}
      {tab === "reviews" && (
        <div>
          <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-4">
            <h3 className="text-base font-bold text-[#0f172a]">Đánh giá trải nghiệm khách hàng</h3>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {REVIEW_FILTERS.map(({ id, label }) => (
              <button
                key={String(id)}
                onClick={() => setReviewFilter(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  reviewFilter === id
                    ? "text-white"
                    : "text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
                style={
                  reviewFilter === id
                    ? { background: "#f59e0b" }
                    : { background: "#f1f5f9" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {visibleReviews.length === 0 ? (
            <p className="text-sm text-[#94a3b8] py-8 text-center">Chưa có đánh giá cho bộ lọc này.</p>
          ) : (
            <div className="space-y-4">
              {visibleReviews.map((r) => (
                <div key={r.name} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: r.color }}
                      >
                        {r.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">{r.name}</p>
                        <StarRow rating={r.rating} />
                      </div>
                    </div>
                    <span className="text-[11px] text-[#94a3b8] shrink-0 ml-2">{r.date}</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed pl-[52px]">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Hỏi đáp ── */}
      {tab === "faq" && (
        <div>
          <div style={{ borderLeft: "4px solid #f59e0b", paddingLeft: "12px" }} className="mb-4">
            <h3 className="text-base font-bold text-[#0f172a]">Câu hỏi thường gặp</h3>
          </div>
          <div className="space-y-2">
            {STATIC_FAQS.map((faq, i) => (
              <div key={i} className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-[#f8fafc] transition-colors"
                >
                  <span className="text-sm font-semibold text-[#0f172a]">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} strokeWidth={2} className="text-[#64748b] shrink-0 ml-2" />
                    : <ChevronDown size={16} strokeWidth={2} className="text-[#64748b] shrink-0 ml-2" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                    <p className="text-sm text-[#64748b] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
