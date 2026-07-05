"use client";

import Link from "next/link";
import {
  Phone, Mail, MapPin, Clock, ChevronRight, ArrowUp,
  Shield, Lock, RefreshCw, Headphones, Award, Rocket,
} from "lucide-react";

interface NavLink { href: string; label: string }

interface FooterData {
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaBtn1Text?: string;
  ctaBtn1Href?: string;
  ctaBtn2Text?: string;
  ctaBtn2Href?: string;
  brandDesc?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialYoutube?: string;
  socialTelegram?: string;
  socialZalo?: string;
  stat1Value?: string; stat1Label?: string;
  stat2Value?: string; stat2Label?: string;
  stat3Value?: string; stat3Label?: string;
  serviceLinks?: NavLink[];
  supportLinks?: NavLink[];
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  contactHours?: string;
  contactTelegramHref?: string;
  contactTelegramLabel?: string;
  contactTelegramSub?: string;
  copyrightText?: string;
  bctHref?: string;
}

const TRUST_BADGES = [
  { Icon: Shield,     color: "#0066ff", bg: "#eff6ff", title: "Bảo mật tuyệt đối",  sub: "Dữ liệu thông tin người dùng"  },
  { Icon: Lock,       color: "#0066ff", bg: "#eff6ff", title: "Thanh toán an toàn", sub: "Nhiều phương thức thanh toán"  },
  { Icon: RefreshCw,  color: "#0066ff", bg: "#eff6ff", title: "Hoàn tiền 100%",     sub: "Nếu không hài lòng"           },
  { Icon: Headphones, color: "#0066ff", bg: "#eff6ff", title: "Hỗ trợ 24/7",        sub: "Đội ngũ luôn sẵn sàng"        },
  { Icon: Award,      color: "#0066ff", bg: "#eff6ff", title: "Uy tín hàng đầu",    sub: "Cộng đồng MMO lớn mạnh"       },
];

const DEFAULT_SERVICES: NavLink[] = [
  { href: "/dich-vu",        label: "Dịch vụ MXH" },
  { href: "/khoa-hoc",       label: "Khóa học MMO" },
  { href: "/tai-nguyen-mmo", label: "Tài nguyên MMO" },
  { href: "/quang-cao",      label: "Quảng cáo" },
  { href: "/tut-tricks",     label: "Tut/Tools MMO" },
];

const DEFAULT_SUPPORT: NavLink[] = [
  { href: "/",                        label: "Trang chủ" },
  { href: "/dieu-khoan",              label: "Điều khoản dịch vụ" },
  { href: "/chinh-sach",              label: "Chính sách bảo mật" },
  { href: "/chinh-sach-nha-ban-hang", label: "Chính sách nhà bán hàng" },
];

const LEGAL: NavLink[] = [
  { href: "/dieu-khoan",              label: "Điều khoản dịch vụ" },
  { href: "/chinh-sach",              label: "Chính sách bảo mật" },
  { href: "/chinh-sach-nha-ban-hang", label: "Chính sách nhà bán hàng" },
  { href: "/dieu-khoan-chinh-sach",   label: "Điều khoản & Chính sách" },
];

export default function FooterClient({ data }: { data: Record<string, unknown> }) {
  const d = data as FooterData;

  const serviceLinks: NavLink[] = Array.isArray(d.serviceLinks) ? d.serviceLinks : DEFAULT_SERVICES;
  const supportLinks: NavLink[] = Array.isArray(d.supportLinks) ? d.supportLinks : DEFAULT_SUPPORT;

  return (
    <footer className="bg-white border-t border-[#e2e8f0]">

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-6 pt-10">
        <div
          className="relative rounded-2xl overflow-hidden px-8 py-7 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: "linear-gradient(120deg,#071428 0%,#0d2050 50%,#0a1f4a 100%)" }}
        >
          <div className="absolute right-0 top-0 h-full w-56 pointer-events-none opacity-20">
            <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" preserveAspectRatio="none">
              <polyline points="10,100 50,70 90,82 120,45 150,58 180,25 200,15" stroke="#60a5fa" strokeWidth="2" fill="none" />
              <polygon points="10,100 50,70 90,82 120,45 150,58 180,25 200,15 200,120 10,120" fill="rgba(96,165,250,0.08)" />
              <circle cx="120" cy="45" r="4" fill="#60a5fa" opacity="0.6" />
              <circle cx="180" cy="25" r="4" fill="#60a5fa" opacity="0.6" />
            </svg>
          </div>
          <div
            className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse,rgba(0,102,255,0.12),transparent 70%)" }}
          />

          <div className="flex items-center gap-5 flex-1 relative z-10">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(96,165,250,0.35)" }}
            >
              <Rocket size={26} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight mb-1">
                {d.ctaTitle ?? "Sẵn sàng phát triển hệ thống MMO của bạn?"}
              </h3>
              <p className="text-blue-200/75 text-sm">
                {d.ctaSubtitle ?? "Tham gia hệ sinh thái đào tạo, dịch vụ MXH và marketplace uy tín."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10 flex-wrap justify-center">
            <Link
              href={d.ctaBtn1Href ?? "/dich-vu"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {d.ctaBtn1Text ?? "Khám phá dịch vụ"} <ChevronRight size={14} />
            </Link>
            <Link
              href={d.ctaBtn2Href ?? "https://facebook.com/hethongmmovn/"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors whitespace-nowrap"
              style={{ border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <Headphones size={14} /> {d.ctaBtn2Text ?? "Nhận tư vấn"}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">

          {/* Col 1 — Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <img
                src="/images/djmedia-logo.gif"
                alt="Logo"
                style={{ height: "50px", width: "auto", display: "block" }}
              />
            </Link>
            <p className="text-sm text-[#64748b] leading-relaxed mb-6 max-w-[260px]">
              {d.brandDesc ?? "Nền tảng MMO số 1 Việt Nam — dịch vụ MXH, khóa học, tài nguyên và marketplace an toàn, uy tín, chất lượng."}
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-7">
              <SocialIcon href={d.socialFacebook ?? "https://www.facebook.com/Chu.Quang.Doanh.Media88/"} label="Facebook" bg="#1877f2">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </SocialIcon>
              <SocialIcon href={d.socialTiktok ?? "https://www.tiktok.com/@chuquangdoanhmmo"} label="TikTok" bg="#010101">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z" /></svg>
              </SocialIcon>
              <SocialIcon href={d.socialYoutube ?? "https://www.youtube.com/@ChuQuangDoanh"} label="YouTube" bg="#ff0000">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>
              </SocialIcon>
              <SocialIcon href={d.socialTelegram ?? "https://t.me/BossMeta789"} label="Telegram" bg="#0088cc">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              </SocialIcon>
              <SocialIcon href={d.socialZalo ?? "https://zalo.me/0393118789"} label="Zalo" bg="#0068ff">
                <span className="text-[12px] font-black leading-none">Z</span>
              </SocialIcon>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0066ff" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
                  value: d.stat1Value ?? "10.000+", label: d.stat1Label ?? "Học viên tin tưởng",
                },
                {
                  icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0066ff" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
                  value: d.stat2Value ?? "100%", label: d.stat2Label ?? "An toàn, bảo mật",
                },
                {
                  icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0066ff" strokeWidth="1.5"><path d="M3 18v-6a9 9 0 0118 0v6" /><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" /></svg>,
                  value: d.stat3Value ?? "24/7", label: d.stat3Label ?? "Hỗ trợ tận tâm",
                },
              ].map(({ icon, value, label }) => (
                <div key={label} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2 py-3 text-center">
                  <div className="flex justify-center mb-1.5">{icon}</div>
                  <p className="text-sm font-bold text-[#0f172a]">{value}</p>
                  <p className="text-[10px] text-[#64748b] leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 — Dịch vụ */}
          <div>
            <ColHeader>Dịch vụ</ColHeader>
            <ul className="space-y-0.5">
              {serviceLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between py-2 px-3 rounded-lg text-sm text-[#374151] hover:bg-[#eff6ff] hover:text-[#0066ff] transition-all group"
                  >
                    <span>{label}</span>
                    <ChevronRight size={13} className="text-[#cbd5e1] group-hover:text-[#0066ff] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Hỗ trợ */}
          <div>
            <ColHeader>Hỗ trợ</ColHeader>
            <ul className="space-y-0.5">
              {supportLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block py-2 px-3 rounded-lg text-sm text-[#374151] hover:bg-[#eff6ff] hover:text-[#0066ff] transition-all"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Liên hệ */}
          <div>
            <ColHeader>Liên hệ</ColHeader>
            <ul className="space-y-3 mb-5">
              {([
                { Icon: Phone,  text: d.contactPhone   ?? "0393.118.789",              href: `tel:${(d.contactPhone ?? "0393118789").replace(/\./g, "")}` },
                { Icon: Mail,   text: d.contactEmail   ?? "chudoanhofficial@gmail.com", href: `mailto:${d.contactEmail ?? "chudoanhofficial@gmail.com"}` },
                { Icon: MapPin, text: d.contactAddress ?? "Hà Nội, Việt Nam",           href: "https://maps.app.goo.gl/r8LGBR7K41xUwLmo6" },
                { Icon: Clock,  text: d.contactHours   ?? "Thứ 2 - Chủ nhật: 8:00 - 23:00", href: null },
              ] as const).map(({ Icon, text, href }) => {
                const inner = (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={13} className="text-[#0066ff]" />
                    </div>
                    <span className="text-sm text-[#374151] break-all leading-snug pt-1">{text}</span>
                  </div>
                );
                return (
                  <li key={text}>
                    {href ? <a href={href} className="hover:text-[#0066ff] transition-colors block">{inner}</a> : inner}
                  </li>
                );
              })}
            </ul>

            <a
              href={d.contactTelegramHref ?? "https://t.me/BossMeta789"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] hover:border-[#0066ff] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0088cc] flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0f172a] group-hover:text-[#0066ff] transition-colors leading-snug">
                  {d.contactTelegramLabel ?? "Hỗ trợ nhanh qua Telegram"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
                  <span className="text-[11px] text-[#64748b]">{d.contactTelegramSub ?? "Phản hồi trong vài phút"}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-[#94a3b8] group-hover:text-[#0066ff] transition-colors shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Trust badges ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-6 pb-10">
        <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-6 py-5">
          <div className="flex flex-wrap gap-y-4 gap-x-0 lg:flex-nowrap">
            {TRUST_BADGES.map(({ Icon, color, bg, title, sub }, i) => (
              <div
                key={title}
                className={`flex items-center gap-3 flex-1 min-w-[160px] ${i > 0 ? "lg:border-l lg:border-[#e2e8f0] lg:pl-6" : ""}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f172a] leading-snug">{title}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────── */}
      <div className="border-t border-[#e2e8f0] bg-[#f8fafc]">
        <div className="mx-auto max-w-[1200px] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: BCT seal + copyright */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            {d.bctHref ? (
              <a
                href={d.bctHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Đã đăng ký Bộ Công Thương"
                className="shrink-0 hover:opacity-80 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/B%E1%BB%99%20C%C3%B4ng%20Th%C6%B0%C6%A1ng.png"
                  alt="Đã đăng ký Bộ Công Thương"
                  style={{ height: 40, width: "auto", display: "block" }}
                />
              </a>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/images/B%E1%BB%99%20C%C3%B4ng%20Th%C6%B0%C6%A1ng.png"
                alt="Đã đăng ký Bộ Công Thương"
                style={{ height: 40, width: "auto", display: "block" }}
                className="shrink-0"
              />
            )}
            <span className="text-xs text-[#94a3b8]">
              {d.copyrightText ? (
                d.copyrightText
              ) : (
                <>© 2026 <span className="font-semibold text-[#64748b]">hethongmmo.vn</span>. Tất cả quyền được bảo lưu.</>
              )}
            </span>
          </div>
          {/* Right: legal links + scroll-to-top */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-0 text-xs text-[#64748b]">
              {LEGAL.map(({ href, label }, i) => (
                <span key={href} className="flex items-center">
                  <Link href={href} className="hover:text-[#0066ff] transition-colors px-2">{label}</Link>
                  {i < LEGAL.length - 1 && <span className="text-[#e2e8f0]">|</span>}
                </span>
              ))}
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 rounded-full bg-[#0066ff] hover:bg-[#0052cc] flex items-center justify-center text-white transition-colors shrink-0"
              aria-label="Lên đầu trang"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-widest mb-2">{children}</h4>
      <div className="w-8 h-0.5 rounded-full bg-[#0066ff]" />
    </div>
  );
}

function SocialIcon({
  href, label, bg, children,
}: {
  href: string; label: string; bg: string; children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
      style={{ backgroundColor: bg }}
    >
      {children}
    </a>
  );
}
