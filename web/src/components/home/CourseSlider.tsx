"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";

export type CourseCardData = {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  description: string | null;
  category: string;
  salePrice: number;
  originalPrice: number;
  studentCount: number;
  rating: number;
  badge: string;
};

const FALLBACK_COURSES: CourseCardData[] = [
  {
    id: "1", slug: "tiktok-seller", name: "KHÓA HỌC TIKTOK SELLER",
    thumbnail: null,
    description: "Xây kênh chuẩn tệp, làm video ra đơn, hướng dẫn Affiliate từ cơ bản đến nâng cao.",
    category: "TikTok", salePrice: 11000000, originalPrice: 15000000,
    studentCount: 0, rating: 5, badge: "HOT",
  },
  {
    id: "2", slug: "facebook-ads", name: "KHÓA HỌC FACEBOOK ADS",
    thumbnail: null,
    description: "Làm chủ kỹ thuật chạy quảng cáo, tối ưu ngân sách và dàn tài khoản Agency mạnh mẽ.",
    category: "Facebook", salePrice: 8500000, originalPrice: 12000000,
    studentCount: 0, rating: 5, badge: "HOT",
  },
  {
    id: "3", slug: "tiktok-ads", name: "KHÓA HỌC TIKTOK ADS",
    thumbnail: null,
    description: "Chiến lược quảng cáo TikTok hiệu quả, tăng tương tác và chuyển đổi khách hàng tiềm năng.",
    category: "TikTok", salePrice: 9500000, originalPrice: 13000000,
    studentCount: 0, rating: 5, badge: "NEW",
  },
];

const BADGE_COLOR: Record<string, string> = {
  HOT: "#ef4444", NEW: "#3b82f6", SALE: "#f59e0b", BESTSELLER: "#8b5cf6",
};

const EASE = "cubic-bezier(0.4,0,0.2,1)";

export default function CourseSlider({ courses }: { courses?: CourseCardData[] }) {
  const list = courses && courses.length > 0 ? courses : FALLBACK_COURSES;
  const total = list.length;
  const [cur, setCur] = useState(0);

  // Reset cursor khi list thay đổi độ dài để tránh out-of-bounds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCur(0);
  }, [total]);

  useEffect(() => {
    if (total === 0) return;
    const id = setInterval(() => setCur((c) => (c + 1) % total), 5000);
    return () => clearInterval(id);
  }, [total]);

  const move = (dir: number) => {
    if (total === 0) return;
    setCur((c) => (c + dir + total) % total);
  };

  const safeIdx = total > 0 ? cur % total : 0;
  const course = list[safeIdx];

  if (!course) return null;

  const hasSale = course.originalPrice > course.salePrice && course.originalPrice > 0;

  return (
    <section style={{ padding: "80px 0", background: "#fff", overflow: "hidden" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{ display: "flex", gap: "56px", alignItems: "center" }}
          className="slider-flex-responsive"
        >
          {/* Left info panel */}
          <div style={{ flex: "0 0 240px" }} className="anim-slide-left slider-info-col">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "rgba(0,137,123,.1)", color: "#00897b",
              padding: "5px 14px", borderRadius: "100px",
              fontSize: ".73rem", fontWeight: "700", letterSpacing: "1px",
              textTransform: "uppercase", marginBottom: "16px",
            }}>
              <GraduationCap size={14} strokeWidth={1.75} />
              Học ngay hôm nay
            </div>
            <h2 style={{
              fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: "800",
              lineHeight: "1.2", marginBottom: "14px", color: "#0f172a",
            }}>
              Khóa học<br />
              <span style={{ color: "#00897b" }}>Phổ biến</span>
            </h2>
            <p style={{ color: "#64748b", fontSize: ".95rem", lineHeight: "1.7", marginBottom: "28px" }}>
              Khám phá những khóa học chất lượng cao nhất giúp bạn làm chủ nền tảng TikTok &amp; Facebook.
            </p>

            {/* Dot navigation */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {list.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCur(i)}
                  style={{
                    width: i === cur ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: i === cur ? "#00897b" : "#e2e8f0",
                    border: "none",
                    cursor: "pointer",
                    transition: "all .3s ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Slide content */}
          <div
            style={{ flex: 1, position: "relative", overflow: "hidden", borderRadius: "24px", boxShadow: "0 24px 60px rgba(0,0,0,.12)" }}
            className="anim-slide-right"
          >
            <div style={{ transition: `transform .55s ${EASE}` }}>
              {/* Thumbnail */}
              <div style={{
                aspectRatio: "16/9",
                background: "linear-gradient(135deg,#e0f2fe 0%,#bfdbfe 50%,#ddd6fe 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "80px", position: "relative", overflow: "hidden",
              }}>
                {course.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={course.thumbnail}
                    alt={course.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                  />
                ) : (
                  <GraduationCap size={64} strokeWidth={1.25} style={{ color: "rgba(0,137,123,0.5)" }} />
                )}

                {/* Badge */}
                {course.badge && course.badge !== "NONE" && (
                  <span style={{
                    position: "absolute", top: "12px", left: "12px",
                    background: BADGE_COLOR[course.badge] ?? "#64748b",
                    color: "#fff", fontSize: ".65rem", fontWeight: "800",
                    padding: "3px 10px", borderRadius: "4px", letterSpacing: ".5px",
                  }}>
                    {course.badge}
                  </span>
                )}

                {/* Student count */}
                {course.studentCount > 0 && (
                  <span style={{
                    position: "absolute", bottom: "12px", right: "12px",
                    background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
                    color: "#fff", fontSize: ".72rem", fontWeight: "600",
                    padding: "4px 10px", borderRadius: "6px",
                    display: "inline-flex", alignItems: "center", gap: "4px",
                  }}>
                    <Users size={12} strokeWidth={1.75} />
                    {course.studentCount.toLocaleString("vi-VN")} học viên
                  </span>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: "22px 24px", background: "#fff" }}>
                {/* Category tag */}
                <span style={{
                  display: "inline-block",
                  background: "rgba(0,137,123,.08)", color: "#00897b",
                  fontSize: ".68rem", fontWeight: "700", padding: "2px 10px",
                  borderRadius: "4px", marginBottom: "10px", letterSpacing: ".5px",
                  textTransform: "uppercase",
                }}>
                  {course.category}
                </span>

                <h3 style={{
                  fontSize: "1.1rem", fontWeight: "800", marginBottom: "10px",
                  color: "#0f172a", lineHeight: "1.4",
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {course.name}
                </h3>

                {course.description && (
                  <p style={{
                    fontSize: ".9rem", color: "#64748b", margin: "0 0 16px",
                    lineHeight: "1.7",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {course.description}
                  </p>
                )}

                {/* Rating */}
                {course.rating > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "14px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < Math.round(course.rating) ? "#f59e0b" : "#e2e8f0", fontSize: ".9rem" }}>★</span>
                    ))}
                    <span style={{ fontSize: ".78rem", color: "#64748b", marginLeft: "4px" }}>
                      {course.rating.toFixed(1)}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: "800", color: "#E53E3E", fontSize: "1.3rem" }}>
                      {course.salePrice > 0 ? formatVnd(course.salePrice) : "Liên hệ"}
                    </span>
                    {hasSale && (
                      <span style={{
                        fontSize: ".85rem", color: "#94a3b8", textDecoration: "line-through",
                        marginLeft: "8px",
                      }}>
                        {formatVnd(course.originalPrice)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/khoa-hoc/${course.slug}`}
                    className="course-slider-btn"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      background: "transparent", color: "#2B6CB0",
                      border: "2px solid #2B6CB0",
                      padding: "10px 22px", borderRadius: "12px",
                      fontWeight: "700", fontSize: ".9rem", textDecoration: "none",
                      transition: "all .3s ease",
                    }}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </div>

            {/* Prev / Next arrows */}
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              transform: "translateY(-50%)",
              display: "flex", justifyContent: "space-between", padding: "0 12px",
              pointerEvents: "none",
            }}>
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => move(dir)}
                  style={{
                    width: "38px", height: "38px",
                    background: "rgba(255,255,255,.92)", border: "1.5px solid #e2e8f0",
                    borderRadius: "50%", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: ".9rem", color: "#0f172a",
                    transition: "all .25s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                    pointerEvents: "auto",
                  }}
                >
                  {dir === -1 ? "←" : "→"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .slider-flex-responsive { flex-direction: row; }
        .slider-info-col { flex: 0 0 240px !important; }
        .course-slider-btn:hover {
          background: #2B6CB0 !important;
          color: #fff !important;
          box-shadow: 0 8px 24px rgba(43,108,176,.35);
          transform: translateY(-2px);
        }
        @media (max-width: 1024px) {
          .slider-flex-responsive { gap: 32px !important; }
          .slider-info-col { flex: 0 0 208px !important; }
        }
        @media (max-width: 768px) {
          .slider-flex-responsive { flex-direction: column !important; }
          .slider-info-col { flex: unset !important; }
        }
      `}</style>
    </section>
  );
}
