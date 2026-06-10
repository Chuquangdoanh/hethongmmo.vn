"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, KeyRound, BarChart3, TrendingUp, Music2, Flame, Users, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";

export interface UserInfo {
  name: string;
  phone: string;
}

interface AdService {
  id: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
}

type TabKey = "facebook" | "tiktok";
type Status = "idle" | "loading" | "success" | "error";

interface FormState {
  fanpageStatus:       string;
  hasContent:          string;
  adsExperience:       string;
  productCategory:     string;
  productCategoryOther: string;
  budget:              string;
}

const INIT: FormState = {
  fanpageStatus:        "",
  hasContent:           "",
  adsExperience:        "",
  productCategory:      "",
  productCategoryOther: "",
  budget:               "",
};

const FB_SERVICES: AdService[] = [
  {
    id: "fb-ads",
    icon: <Target size={26} strokeWidth={1.75} />,
    iconBg: "#eff6ff", iconColor: "#2563eb",
    title: "Chạy Quảng Cáo Facebook",
    desc: "Setup chiến dịch bán hàng, cam kết đơn hàng. Tối ưu chuyển đổi, tìm khách hàng mới cho sản phẩm của bạn.",
  },
  {
    id: "fb-rent",
    icon: <KeyRound size={26} strokeWidth={1.75} />,
    iconBg: "#fdf4ff", iconColor: "#9333ea",
    title: "Cho Thuê Tài Khoản Quảng Cáo",
    desc: "Tài khoản chuyên độ, tiên nhận đang. Scale ads bền vững với tài khoản agency chính hãng.",
  },
  {
    id: "fb-resources",
    icon: <BarChart3 size={26} strokeWidth={1.75} />,
    iconBg: "#f0fdf4", iconColor: "#16a34a",
    title: "Cung Cấp Dịch Vụ Chăm Sóc Fanpage",
    desc: "Chăm sóc fanpage chạy quảng cáo hiệu quả, nhận diện fanpage tốt hơn. Tăng tương tác, xây dựng cộng đồng khách hàng trung thành.",
  },
  {
    id: "fb-optimize",
    icon: <TrendingUp size={26} strokeWidth={1.75} />,
    iconBg: "#fff7ed", iconColor: "#ea580c",
    title: "Tối Ưu Chi Phí Quảng Cáo",
    desc: "Phù hợp chạy đủ ngân sách nhỏ. Giảm thiểu phí, tăng ROI tối đa cho mọi chiến dịch.",
  },
];

const TT_SERVICES: AdService[] = [
  {
    id: "tt-ads",
    icon: <Music2 size={26} strokeWidth={1.75} />,
    iconBg: "#fdf2f8", iconColor: "#db2777",
    title: "Chạy Quảng Cáo TikTok",
    desc: "Tối ưu chiến dịch TikTok Ads, tiếp cận Gen Z và người dùng trẻ, tăng nhận diện thương hiệu.",
  },
  {
    id: "tt-spark",
    icon: <Flame size={26} strokeWidth={1.75} />,
    iconBg: "#fff7ed", iconColor: "#f97316",
    title: "TikTok Spark Ads",
    desc: "Boost video TikTok hữu cơ thành quảng cáo, tăng tương tác tự nhiên và hiệu quả chuyển đổi.",
  },
  {
    id: "tt-creator",
    icon: <Users size={26} strokeWidth={1.75} />,
    iconBg: "#f0fdf4", iconColor: "#16a34a",
    title: "TikTok Creator & Affiliate",
    desc: "Kết nối với creator, triển khai affiliate marketing trên TikTok Shop hiệu quả.",
  },
  {
    id: "tt-roi",
    icon: <BarChart3 size={26} strokeWidth={1.75} />,
    iconBg: "#eff6ff", iconColor: "#2563eb",
    title: "Tối Ưu TikTok ROI",
    desc: "Phân tích dữ liệu, tối ưu chiến dịch theo từng giai đoạn, đảm bảo ROI tối đa.",
  },
];

const BENEFITS = [
  "Cập nhật SEO",
  "Thiết kế Graphic",
  "Kịch bản tư vấn",
  "Tối ưu tìm kiếm",
];

interface Props {
  userInfo: UserInfo | null;
}

/* ── Shared read-only field style ── */
const roField: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "9px 12px", fontSize: 14, color: "#374151",
  background: "#f8fafc", userSelect: "none", cursor: "default",
};

/* ── 2-option toggle ── */
function Toggle({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              border: value === opt.value ? "2px solid #0066ff" : "1.5px solid #e2e8f0",
              borderRadius: 8, padding: "8px 10px",
              background: value === opt.value ? "#eff6ff" : "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: value === opt.value ? "#1d4ed8" : "#374151",
              transition: "all .15s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdServiceTabs({ userInfo }: Props) {
  const router = useRouter();
  const [tab, setTab]                         = useState<TabKey>("facebook");
  const [activeService, setActiveService]     = useState<AdService | null>(null);
  const [form, setForm]                       = useState<FormState>(INIT);
  const [status, setStatus]                   = useState<Status>("idle");
  const [errorMsg, setErrorMsg]               = useState("");

  const services = tab === "facebook" ? FB_SERVICES : TT_SERVICES;

  function openForm(svc: AdService) {
    setActiveService(svc);
    setForm(INIT);
    setStatus("idle");
    setErrorMsg("");
  }

  function closeForm() {
    if (status === "loading") return;
    setActiveService(null);
    setStatus("idle");
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeService || !userInfo) return;

    // Validate all required fields
    if (!form.fanpageStatus || !form.hasContent || !form.adsExperience ||
        !form.productCategory || !form.budget) {
      setErrorMsg("Vui lòng điền đầy đủ tất cả thông tin bắt buộc.");
      setStatus("error");
      return;
    }

    const productCategory =
      form.productCategory === "khac"
        ? form.productCategoryOther.trim() || "Khác"
        : form.productCategory;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/quang-cao/register", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:            userInfo.name,
          phone:           userInfo.phone,
          serviceName:     activeService.title,
          serviceTab:      tab,
          fanpageStatus:   form.fanpageStatus,
          hasContent:      form.hasContent,
          adsExperience:   form.adsExperience,
          productCategory,
          budget:          form.budget,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? "Gửi đăng ký thất bại. Vui lòng thử lại.");
        setStatus("error");
        return;
      }
      router.push("/cam-on?type=quang-cao");
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
      setStatus("error");
    }
  }

  const PRODUCT_CATS = [
    { value: "do-gia-dung", label: "Đồ gia dụng" },
    { value: "thoi-trang",  label: "Thời trang"  },
    { value: "dong-y",      label: "Đông y"       },
    { value: "my-pham",     label: "Mỹ phẩm"      },
    { value: "khac",        label: "Khác"          },
  ];

  const BUDGETS = [
    { value: "10-50m",    label: "10 – 50M"    },
    { value: "50-100m",   label: "50 – 100M"   },
    { value: "100-300m",  label: "100 – 300M"  },
    { value: "300-500m",  label: "300 – 500M"  },
    { value: "tren-500tr",label: "Trên 500M"   },
  ];

  return (
    <>
      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
        {(["facebook", "tiktok"] as TabKey[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 20px", borderRadius: 99,
                border: active ? "2px solid transparent" : "2px solid #e2e8f0",
                background: active ? (t === "facebook" ? "#f59e0b" : "#0f172a") : "#fff",
                color: active ? "#fff" : "#64748b",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                boxShadow: active ? "0 4px 12px rgba(0,0,0,.15)" : "none",
                transition: "all .2s",
              }}
            >
              {t === "facebook" ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              )}
              {t === "facebook" ? "Facebook Ads" : "TikTok Ads"}
            </button>
          );
        })}
      </div>

      {/* ── Service cards — 4 cột ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="qc-service-grid">
        {services.map((svc) => (
          <div
            key={svc.id}
            style={{
              background: "#fff", borderRadius: 16,
              border: "1px solid #e2e8f0", padding: "28px 20px 22px",
              boxShadow: "0 2px 12px rgba(0,0,0,.04)",
              display: "flex", flexDirection: "column", gap: 14,
              transition: "box-shadow .2s, transform .2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,.10)";
              (e.currentTarget as HTMLDivElement).style.transform  = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.04)";
              (e.currentTarget as HTMLDivElement).style.transform  = "translateY(0)";
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: svc.iconBg, color: svc.iconColor,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {svc.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8, lineHeight: 1.4 }}>
                {svc.title}
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, margin: 0 }}>{svc.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => openForm(svc)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 12, fontWeight: 700, color: "#0066ff", marginTop: "auto",
              }}
            >
              SỬ DỤNG DỊCH VỤ
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* ── MODAL ── */}
      {activeService && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(15,23,42,.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div style={{
            background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,.25)",
            width: "100%", maxWidth: 520, maxHeight: "92vh",
            overflowY: "auto", padding: "28px 26px",
          }}>

            {/* ── SUCCESS ── */}
            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", background: "#dcfce7",
                  margin: "0 auto 20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                  Đặt hàng thành công!
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
                  Chúng tôi đã nhận được thông tin và sẽ liên hệ tư vấn sớm nhất.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <a
                    href="https://m.me/chuquangdoanh"
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#1877f2", color: "#fff",
                      fontSize: 13, fontWeight: 700,
                      padding: "9px 20px", borderRadius: 8, textDecoration: "none",
                    }}
                  >
                    Chat Facebook
                  </a>
                  <button
                    onClick={closeForm}
                    style={{
                      background: "#f1f5f9", color: "#374151", border: "none",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      padding: "9px 20px", borderRadius: 8,
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>

            ) : !userInfo ? (
              /* ── CHƯA ĐĂNG NHẬP ── */
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <button
                    type="button" onClick={closeForm}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: "1px solid #e2e8f0", background: "#f8fafc",
                      cursor: "pointer", color: "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "#fef3c7", margin: "0 auto 16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                  Vui lòng đăng nhập
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
                  Bạn cần đăng nhập để đặt hàng dịch vụ. Thông tin họ tên và số điện thoại
                  sẽ được lấy tự động từ tài khoản của bạn.
                </p>
                <Link
                  href="/dang-nhap"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#0066ff",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    padding: "11px 28px", borderRadius: 10, textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(0,102,255,.35)",
                  }}
                >
                  Đăng nhập ngay
                </Link>
              </div>

            ) : (
              /* ── FORM ── */
              <form onSubmit={(e) => { void handleSubmit(e); }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#0066ff", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                      ĐĂNG KÝ DỊCH VỤ
                    </p>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.4, maxWidth: 360 }}>
                      {activeService.title}
                    </h3>
                  </div>
                  <button
                    type="button" onClick={closeForm}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: "1px solid #e2e8f0", background: "#f8fafc",
                      cursor: "pointer", color: "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Thông tin tài khoản — read-only */}
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 12, padding: "13px 15px", marginBottom: 16,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#0066ff", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                    Thông tin tài khoản
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>
                        HỌ VÀ TÊN <span style={{ color: "#dc2626" }}>*</span>
                      </p>
                      <div style={roField}>{userInfo.name || "—"}</div>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>
                        SỐ ĐIỆN THOẠI <span style={{ color: "#dc2626" }}>*</span>
                      </p>
                      <div style={roField}>{userInfo.phone || "—"}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, marginBottom: 0 }}>
                    Lấy từ tài khoản của bạn. Cập nhật trong hồ sơ cá nhân để thay đổi.
                  </p>
                </div>

                {/* Trạng thái Fanpage */}
                <Toggle
                  label="Trạng thái Fanpage - Tiktok"
                  options={[{ value: "none", label: "Chưa có" }, { value: "has", label: "Đã có" }]}
                  value={form.fanpageStatus}
                  onChange={(v) => setField("fanpageStatus", v)}
                />

                {/* Content Hình Ảnh */}
                <Toggle
                  label=" Content Video - Hình Ảnh"
                  options={[{ value: "none", label: "Chưa có" }, { value: "has", label: "Đã có" }]}
                  value={form.hasContent}
                  onChange={(v) => setField("hasContent", v)}
                />

                {/* Kinh nghiệm chạy Ads */}
                <Toggle
                  label="Kinh nghiệm chạy Ads"
                  options={[{ value: "never", label: "Chưa từng" }, { value: "has", label: "Đã từng" }]}
                  value={form.adsExperience}
                  onChange={(v) => setField("adsExperience", v)}
                />

                {/* Ngành hàng */}
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Bạn cần chạy sản phẩm ngành hàng gì?
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {PRODUCT_CATS.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setField("productCategory", cat.value)}
                        style={{
                          border: form.productCategory === cat.value ? "2px solid #0066ff" : "1.5px solid #e2e8f0",
                          borderRadius: 99, padding: "6px 14px",
                          background: form.productCategory === cat.value ? "#eff6ff" : "#fff",
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                          color: form.productCategory === cat.value ? "#1d4ed8" : "#374151",
                          transition: "all .15s",
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {form.productCategory === "khac" && (
                    <input
                      type="text"
                      value={form.productCategoryOther}
                      onChange={(e) => setField("productCategoryOther", e.target.value)}
                      placeholder="Nhập tên ngành hàng khác..."
                      suppressHydrationWarning
                      style={{
                        display: "block", width: "100%", boxSizing: "border-box",
                        marginTop: 8, border: "1.5px solid #e2e8f0", borderRadius: 8,
                        padding: "8px 12px", fontSize: 13, outline: "none",
                      }}
                    />
                  )}
                </div>

                {/* Ngân sách */}
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Ngân sách mong muốn chạy / 1 tháng
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {BUDGETS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setField("budget", b.value)}
                        style={{
                          border: form.budget === b.value ? "2px solid #0066ff" : "1.5px solid #e2e8f0",
                          borderRadius: 99, padding: "6px 14px",
                          background: form.budget === b.value ? "#eff6ff" : "#fff",
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                          color: form.budget === b.value ? "#1d4ed8" : "#374151",
                          transition: "all .15s",
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info box */}
                <div style={{
                  background: "#f0f7ff", border: "1.5px solid #bfdbfe",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 16,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8", marginBottom: 10 }}>
                    Phí dịch vụ ưu đãi:{" "}
                    <span style={{ color: "#f97316" }}>3% – 5%</span>
                  </p>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8, lineHeight: 1.5 }}>
                    Áp dụng tốt nhất cho đại lý và khách hàng thuê tài khoản Agency.
                  </p>
                  <div style={{ borderTop: "1px solid #bfdbfe", paddingTop: 10, marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>
                      Gói Tối Ưu Fanpage
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 0" }}>
                      {BENEFITS.map((b) => (
                        <div key={b} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle size={12} strokeWidth={2} style={{ color: "#16a34a", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: "#374151" }}>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Giá dịch vụ:</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0066ff" }}>LIÊN HỆ</span>
                  </div>
                </div>

                {/* Error */}
                {status === "error" && (
                  <div style={{
                    background: "#fff1f2", border: "1px solid #fecdd3",
                    borderRadius: 8, padding: "10px 14px",
                    fontSize: 13, color: "#dc2626", marginBottom: 14,
                  }}>
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    width: "100%",
                    background: status === "loading" ? "#93c5fd" : "#0066ff",
                    color: "#fff", border: "none",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700,
                    padding: "12px 0", borderRadius: 10,
                    boxShadow: "0 4px 16px rgba(0,102,255,.35)",
                    transition: "background .15s",
                  }}
                >
                  {status === "loading" ? "Đang gửi..." : "Đặt hàng ngay"}
                </button>

              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .qc-service-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 500px) {
          .qc-service-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
