"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

export interface Service {
  id: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  name: string;
  desc: string;
  formTerms: string;
}

export interface Illustration {
  src: string;
  label: string;
}

export interface UserInfo {
  name: string;
  phone: string;
}

interface Props {
  services: Service[];
  illustrations: Illustration[];
  userInfo: UserInfo | null;
}

type ServiceType = "MUA_PAGE" | "CAP_PAGE";
type Status = "idle" | "loading" | "success" | "error";

export default function ServiceSectionClient({ services, illustrations, userInfo }: Props) {
  const router = useRouter();
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [serviceType, setServiceType]     = useState<ServiceType>("MUA_PAGE");
  const [status, setStatus]               = useState<Status>("idle");
  const [errorMsg, setErrorMsg]           = useState("");

  function openForm(svc: Service) {
    setActiveService(svc);
    setServiceType("MUA_PAGE");
    setStatus("idle");
    setErrorMsg("");
  }

  function closeForm() {
    if (status === "loading") return;
    setActiveService(null);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeService || !userInfo) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/networks/register", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        userInfo.name,
          phone:       userInfo.phone,
          serviceType,
          serviceName: activeService.name,
          description: activeService.formTerms,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? "Gửi đăng ký thất bại. Vui lòng thử lại.");
        setStatus("error");
        return;
      }
      router.push("/cam-on?type=networks");
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
      setStatus("error");
    }
  }

  /* ── Shared read-only field style ── */
  const readonlyField: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "9px 12px", fontSize: 14, color: "#374151",
    background: "#f8fafc", userSelect: "none",
    cursor: "default",
  };

  return (
    <>
      {/* ── Service cards — 4 cột ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="fa-service-grid">
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
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,.1)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.04)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
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
                {svc.name}
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, margin: 0 }}>{svc.desc}</p>
            </div>
            <button
              onClick={() => openForm(svc)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 12, fontWeight: 700, color: "#2563eb", marginTop: "auto",
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
            width: "100%", maxWidth: 520, maxHeight: "90vh",
            overflowY: "auto", padding: "32px 28px",
          }}>

            {/* ── SUCCESS ── */}
            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
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
                  Đăng ký thành công!
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
                  Chúng tôi đã nhận được thông tin và sẽ liên hệ bạn sớm nhất.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <a
                    href="https://t.me/BossMeta789"
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#0088cc", color: "#fff",
                      fontSize: 13, fontWeight: 700,
                      padding: "9px 20px", borderRadius: 8, textDecoration: "none",
                    }}
                  >
                    Nhắn tin Telegram
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
                {/* Close */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
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
                  Bạn cần đăng nhập để đăng ký dịch vụ. Thông tin họ tên và số điện thoại
                  sẽ được lấy tự động từ tài khoản của bạn.
                </p>
                <Link
                  href="/dang-nhap"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    padding: "11px 28px", borderRadius: 10, textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(99,102,241,.35)",
                  }}
                >
                  Đăng nhập ngay
                </Link>
              </div>

            ) : (
              /* ── FORM (đã đăng nhập) ── */
              <form onSubmit={(e) => { void handleSubmit(e); }}>

                {/* Modal header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      ĐĂNG KÝ DỊCH VỤ
                    </p>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.4, maxWidth: 360 }}>
                      {activeService.name}
                    </h3>
                  </div>
                  <button
                    type="button" onClick={closeForm}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: "1px solid #e2e8f0", background: "#f8fafc",
                      cursor: "pointer", color: "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Thông tin tài khoản — read only */}
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 18,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, color: "#6366f1",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    marginBottom: 12,
                  }}>
                    Thông tin tài khoản
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Họ tên */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>Họ và tên</p>
                      <div style={readonlyField}>{userInfo.name || "—"}</div>
                    </div>
                    {/* Số điện thoại */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>Số điện thoại</p>
                      <div style={readonlyField}>{userInfo.phone || "—"}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
                    Thông tin lấy từ tài khoản của bạn. Để thay đổi, vui lòng cập nhật trong hồ sơ cá nhân.
                  </p>
                </div>

                {/* Loại đăng ký */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                    Loại đăng ký <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {(
                      [
                        { value: "MUA_PAGE" as const, label: "Mua page",  desc: "Nhận fanpage từ hệ thống để kiếm tiền nội dung." },
                        { value: "CAP_PAGE"  as const, label: "Cấp page",  desc: "Cung cấp fanpage của bạn vào hệ thống Network." },
                      ]
                    ).map(({ value, label, desc }) => {
                      const selected = serviceType === value;
                      return (
                        <button
                          key={value} type="button"
                          onClick={() => setServiceType(value)}
                          style={{
                            border: selected ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
                            borderRadius: 10, padding: "12px 14px",
                            background: selected ? "#eef2ff" : "#fff",
                            cursor: "pointer", textAlign: "left",
                            transition: "all .15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <div style={{
                              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                              border: selected ? "5px solid #6366f1" : "2px solid #cbd5e1",
                            }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: selected ? "#4338ca" : "#374151" }}>
                              {label}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mô tả dịch vụ — do admin thêm, read only */}
                <div style={{ marginBottom: serviceType === "CAP_PAGE" && illustrations.length > 0 ? 16 : 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      Mô tả dịch vụ
                    </label>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      background: "#eff6ff", color: "#2563eb",
                      padding: "2px 8px", borderRadius: 99,
                      border: "1px solid #bfdbfe",
                    }}>
                      CHỈ XEM
                    </span>
                  </div>
                  <div style={{
                    background: "#f8fafc", border: "1.5px solid #e2e8f0",
                    borderRadius: 8, padding: "12px 14px",
                    fontSize: 13, color: "#374151", lineHeight: 1.7,
                    userSelect: "none",
                  }}>
                    {activeService.formTerms}
                  </div>
                </div>

                {/* Ảnh minh họa — chỉ xem, chỉ hiện khi Cấp page */}
                {serviceType === "CAP_PAGE" && illustrations.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                        Ảnh minh hoạ
                      </label>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                        background: "#eff6ff", color: "#2563eb",
                        padding: "2px 8px", borderRadius: 99,
                        border: "1px solid #bfdbfe",
                      }}>
                        CHỈ XEM
                      </span>
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: illustrations.length === 1 ? "1fr" : "repeat(2,1fr)",
                      gap: 10,
                    }}>
                      {illustrations.map((img) => (
                        <div
                          key={img.src}
                          style={{ borderRadius: 10, overflow: "hidden", border: "1.5px solid #e2e8f0", position: "relative", userSelect: "none" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.src} alt={img.label} draggable={false}
                            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", pointerEvents: "none" }}
                          />
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "linear-gradient(transparent,rgba(0,0,0,.65))",
                            padding: "16px 10px 8px",
                          }}>
                            <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0 }}>{img.label}</p>
                          </div>
                          <div
                            style={{ position: "absolute", inset: 0, cursor: "default" }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {status === "error" && (
                  <div style={{
                    background: "#fff1f2", border: "1px solid #fecdd3",
                    borderRadius: 8, padding: "10px 14px",
                    fontSize: 13, color: "#dc2626", marginBottom: 16,
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
                    background: status === "loading" ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", border: "none",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700,
                    padding: "12px 0", borderRadius: 10,
                    boxShadow: "0 4px 16px rgba(99,102,241,.35)",
                  }}
                >
                  {status === "loading" ? "Đang gửi..." : "Gửi đăng ký"}
                </button>

              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .fa-service-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 500px) {
          .fa-service-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
