// ISR: homepage không có auth() → cache 60s, rebuild khi có traffic sau khi stale
export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "Hệ Thống MMO | DJ MEDIA — Dịch Vụ Mạng Xã Hội #1 Việt Nam",
  description: "Nền tảng MMO hàng đầu Việt Nam — mở khóa Facebook, TikTok Ads, khóa học Digital Marketing, tài nguyên số. Hỗ trợ 24/7, uy tín từ 2019.",
  url: "/",
  image: "/images/doinguctydjmedia.jpg",
});
import { prisma } from "@/lib/db/prisma";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import { getAllSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import HeroScrollObserver from "@/components/home/HeroScrollObserver";
import HomeDriftObserver from "@/components/home/HomeDriftObserver";
import CourseSlider from "@/components/home/CourseSlider";
import FaqAccordion from "@/components/home/FaqAccordion";
import {
  GraduationCap, Unlock, BookOpen, ShoppingBag, Megaphone,
  ShieldCheck, Zap, Headphones, Flame, Lock,
  ShoppingCart, ArrowRight, Search,
  Phone, Trophy, FolderOpen, Calendar, Clock, Shield, Package,
  CheckCircle, HelpCircle, Briefcase, Users, Music2,
  Newspaper, ExternalLink, Quote, Star,
} from "lucide-react";

/* ─── Static data ─── */
const CATEGORY_ICONS = [
  { label: "Khóa Học",                    href: "/khoa-hoc",                        Icon: GraduationCap },
  { label: "Mở Khóa Tài Khoản Facebook", href: "/tai-nguyen-mmo?category=Facebook", Icon: Unlock        },
  { label: "TUT MMO",                     href: "/tut-tricks",                      Icon: BookOpen      },
  { label: "Tài nguyên MMO",              href: "/tai-nguyen-mmo",                  Icon: ShoppingBag   },
  { label: "Chạy Quảng Cáo",             href: "/dich-vu",                         Icon: Megaphone     },
];

const STATS = [
  { value: "59.639+",  count: 59639,  suffix: "+", label: "Khách hàng" },
  { value: "363.921+", count: 363921, suffix: "+", label: "Đơn giao dịch" },
  { value: "7.926+",   count: 7926,   suffix: "+", label: "Học viên" },
  { value: "99.9%",    count: 99.9,   suffix: "%", label: "Tỉ lệ hài lòng" },
  { value: "24/7",     count: null,   suffix: "",  label: "Hỗ trợ" },
];

const POPULAR_SERVICES = [
  { title: "Chạy TikTok Ads",     desc: "Chiến dịch quảng cáo TikTok chuẩn target, hiệu quả cao",                    href: "/dich-vu",        emoji: "🎯" },
  { title: "Chạy Facebook Ads",   desc: "Quảng cáo Facebook hiệu quả, tối ưu chi phí và chiến dịch",                 href: "/dich-vu",        emoji: "📢" },
  { title: "Mở khóa iCloud",      desc: "Mở khóa tài khoản iCloud an toàn, uy tín, bảo hành dài hạn",               href: "/dich-vu",        emoji: "🔓" },
  { title: "Tăng Follower TikTok",desc: "Tăng người theo dõi TikTok thực, không ảo, an toàn",                        href: "/dich-vu",        emoji: "📱" },
  { title: "Khóa học MMO",        desc: "Knowledge, affiliate, content TikTok... từ cơ bản đến nâng cao",            href: "/khoa-hoc",       emoji: "🎓" },
  { title: "Tài nguyên MMO",      desc: "Tool, tài khoản, dịch vụ... marketplace an toàn và tiện lợi",               href: "/tai-nguyen-mmo", emoji: "⚡" },
];

const PRESS_CARDS = [
  {
    logoType: "Báo Quốc Tế",
    tag: "Báo Quốc Tế",
    tagColor: "#0066ff",
    headline: "Hệ sinh thái MMO giúp hàng nghìn người Việt bứt phá thu nhập online",
    desc: "Nền tảng công nghệ giúp kết nối, đào tạo và hỗ trợ người dùng phát triển công việc kinh doanh online một cách bền vững.",
    date: "22/04/2025",
    href: "https://baoquocte.vn/pham-huu-dung-nguoi-con-vung-dat-ha-tinh-va-hanh-trinh-tro-thanh-ceo-dj-media-311953.html",
  },
  {
    logoType: "VTV",
    tag: "VTV",
    tagColor: "#0891b2",
    headline: "DJ Media: Đối tác tin cậy cho quảng cáo mạng xã hội",
    desc: "VTV.vn - Mạng xã hội là công cụ hiệu quả giúp cá nhân, doanh nghiệp quảng bá thương hiệu, sản phẩm và dịch vụ trong thời đại số.",
    date: "10/04/2025",
    href: "https://vtv.vn/goc-doanh-nghiep/dj-media-doi-tac-tin-cay-cho-quang-cao-mang-xa-hoi-20250409204644991.htm",
  },
  {
    logoType: "Ngôi Sao VN",
    tag: "Ngôi Sao VN",
    tagColor: "#7c3aed",
    headline: "MMO – Cơ hội khởi nghiệp ít vốn nhưng tiềm năng lớn cho người trẻ",
    desc: "Xu hướng khởi nghiệp online đang mở ra cơ hội cho người trẻ Việt Nam tự do tài chính và làm chủ cuộc sống.",
    date: "10/06/2025",
    href: "https://ngoisao.vn/theo-dong-su-kien/doanh-nghiep/ceo-pham-huu-dung-va-hanh-trinh-xay-dung-nen-thanh-cong-cua-dj-media-d457781.html",
  },
];

const FAQ_ITEMS = [
  { q: "Dịch vụ của website có uy tín không?",  a: "Chúng tôi cam kết về chất lượng và tối ưu hóa các chỉ số chuyển đổi thực tế để mang lại kết quả tốt nhất cho bạn." },
  { q: "Thời gian xử lý đơn hàng là bao lâu?", a: "Hầu hết đơn dịch vụ được xử lý tự động trong vòng 1–24 giờ sau khi thanh toán thành công." },
  { q: "Nạp tiền bằng phương thức nào?",        a: "Hỗ trợ chuyển khoản ngân hàng qua SePay — hệ thống tự động nhận và cộng tiền ngay lập tức." },
  { q: "Có hỗ trợ sau khi mua hàng không?",     a: "Có. Chúng tôi hỗ trợ 24/7 qua Telegram và Zalo. Với khóa học có bảo hành trọn đời." },
  { q: "Tôi có cần kinh nghiệm trước không?",   a: "Không cần. Khóa học được thiết kế từ cơ bản đến nâng cao, có kèm mentoring cá nhân." },
  { q: "Chính sách hoàn tiền như thế nào?",     a: "Dịch vụ không hoàn tiền sau khi xử lý. Khóa học hoàn 100% trong 7 ngày nếu chưa truy cập." },
];

const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", GOOGLE: "Google",
  INSTAGRAM: "Instagram", YOUTUBE: "YouTube", ICLOUD: "iCloud",
  ZALO: "Zalo", TELEGRAM: "Telegram", TWITTER: "Twitter", OTHER: "Khác",
};

/* ═══════════════════════════════════════════════════════ */
export default async function HomePage() {
  await guardPublicPage("");
  const [hotTuts, featuredProducts, featuredServices, rawCourses, navCategories, cmsData] = await Promise.all([
    prisma.tutTrick.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { totalOrders: "desc" }],
      take: 2,
      select: {
        id: true, name: true, slug: true, thumbnail: true, price: true,
        platform: true, totalOrders: true, successRate: true,
        publishedDate: true, rating: true, processingTime: true, warrantyPolicy: true,
      },
    }),
    prisma.sellerProduct.findMany({
      where: {
        isActive: true, isHidden: false, isRestricted: false, deletedAt: null,
        stockItems: { some: { status: "AVAILABLE" } },
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true, name: true, price: true, imageUrl: true, salesCount: true,
        description: true, sellerCategory: true,
        seller: { select: { uidPrefix: true } },
        _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
      take: 8,
      select: { id: true, slug: true, name: true, thumbnail: true, price: true, platform: true },
    }),
    prisma.course.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ displayOrder: "asc" }, { totalOrders: "desc" }],
      take: 6,
      select: {
        id: true, slug: true, name: true, thumbnail: true,
        description: true, category: true,
        salePrice: true, originalPrice: true,
        studentCount: true, rating: true, badge: true,
      },
    }),
    prisma.resourceCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    getAllSiteContent(),
  ]);

  // ── CMS content ──────────────────────────────────────────────────
  type HeroContent   = { badge: string; title: string; description: string; imageUrl: string; chip1Value: string; chip1Label: string; chip2Value: string; chip2Label: string; btn1Text: string; btn1Href: string; btn2Text: string; btn2Href: string; };
  type DJContent     = { companyTitle: string; imageUrl: string; yearsExpValue: string; yearsExpLabel: string; description: string; hotlineLabel: string; hotlineNumber: string; socialFacebook: string; socialTiktok: string; socialInstagram: string; socialZalo: string; socialYoutube: string; };
  type TeamMember    = { name: string; title: string; imageUrl: string; badgeValue: string; badgeLabel: string; badgeColor: string; bio1: string; bio2: string; quote: string; };
  type TeamContent   = { sectionLabel: string; sectionTitle: string; members: TeamMember[]; };
  type StatItem      = { value: string; count: number | null; suffix: string; label: string; };
  type PressCard     = { logoType: string; tag: string; tagColor: string; headline: string; desc: string; date: string; href: string; };
  type PressContent  = { badge: string; title: string; subtitle: string; cards: PressCard[]; };
  type FaqContent    = { title: string; items: { q: string; a: string; }[]; };

  const heroContent  = cmsData[SITE_CONTENT_KEYS.HOME_HERO]    as HeroContent;
  const djContent    = cmsData[SITE_CONTENT_KEYS.HOME_DJMEDIA]  as DJContent;
  const teamContent  = cmsData[SITE_CONTENT_KEYS.HOME_TEAM]    as TeamContent;
  const cmsStats     = (cmsData[SITE_CONTENT_KEYS.HOME_STATS] as { stats: StatItem[] }).stats;
  const pressContent = cmsData[SITE_CONTENT_KEYS.HOME_PRESS]   as PressContent;
  const faqContent   = cmsData[SITE_CONTENT_KEYS.HOME_FAQ]     as FaqContent;

  const teamMembers  = teamContent.members ?? [];
  const member0      = teamMembers[0];
  const member1      = teamMembers[1];

  const featuredCourses = rawCourses.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    thumbnail: c.thumbnail ?? null,
    description: c.description ?? null,
    category: c.category,
    salePrice: Number(c.salePrice),
    originalPrice: Number(c.originalPrice),
    studentCount: c.studentCount,
    rating: c.rating,
    badge: c.badge as string,
  }));

  return (
    <>
      <HeroScrollObserver />
      <HomeDriftObserver />

      {/* ── DJ MEDIA AGENCY INTRO ────────────────────── */}
      <section style={{ padding: "80px 0 72px", background: "#fff", overflow: "hidden" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>
          <div className="dj-media-grid">

            {/* ── 1: Title ── */}
            <div className="dj-media-title anim-fade-up" data-d="1">
              <h2 style={{
                fontSize: "clamp(1.67rem,3.57vw,2.86rem)", fontWeight: "900",
                color: "#0f172a", lineHeight: "1.2", marginBottom: "0",
              }}>
                {djContent.companyTitle.split("\n").map((line, i) => (
                  <span key={i} style={{ display: "block", whiteSpace: "nowrap" }}>{line.replace("&", "& ")}</span>
                ))}
              </h2>
            </div>

            {/* ── 2: Image ── */}
            <div style={{ position: "relative" }} className="dj-media-img anim-scale-in" data-d="2">
              <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.16)", aspectRatio: "4/3", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r2Url(djContent.imageUrl) || "/images/dj-media-classroom.jpg"} alt="DJ Media Agency – Lớp học thực chiến" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ position: "absolute", bottom: "24px", left: "24px", background: "#fff", borderRadius: "16px", padding: "14px 20px", boxShadow: "0 12px 32px rgba(0,0,0,.14)", zIndex: 2, animation: "float 5s ease-in-out infinite" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#f59e0b", lineHeight: 1 }}>{djContent.yearsExpValue}</div>
                <div style={{ fontSize: ".73rem", color: "#334155", fontWeight: "600", marginTop: "4px" }}>{djContent.yearsExpLabel}</div>
              </div>
            </div>

            {/* ── 3: Description + Social ── */}
            <div className="dj-media-desc anim-fade-up" data-d="3">
              <p style={{
                fontSize: ".975rem", color: "#64748b", lineHeight: "1.85",
                marginBottom: "24px", maxWidth: "520px",
              }}>
                {djContent.description}
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a href={djContent.socialFacebook} target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href={djContent.socialTiktok} target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#010101", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.89a8.18 8.18 0 0 0 4.78 1.52V7a4.85 4.85 0 0 1-1.01-.31z"/></svg>
                </a>
                <a href={djContent.socialInstagram} target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href={djContent.socialZalo} target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <span style={{ color: "#fff", fontWeight: "900", fontSize: ".85rem", letterSpacing: "-.5px" }}>Zalo</span>
                </a>
                <a href={djContent.socialYoutube} target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#FF0000" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/><polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                </a>
              </div>
            </div>

            {/* ── 4: Hotline / Button ── */}
            <div className="dj-media-btn anim-fade-in" data-d="4" style={{ marginTop: "10px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "14px 24px", boxShadow: "0 4px 18px rgba(0,0,0,.07)" }}>
                <div style={{ width: "48px", height: "48px", flexShrink: 0, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={22} strokeWidth={2} style={{ color: "#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize: ".78rem", color: "#64748b", margin: "0 0 3px", fontWeight: "500" }}>{djContent.hotlineLabel}</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f97316", margin: 0, letterSpacing: ".5px" }}>{djContent.hotlineNumber}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          position: "relative",
          zIndex: 0,
          background: "#fff",
          overflow: "hidden",
          padding: "100px 0 80px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Ambient gradient */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 60% at 80% 20%, rgba(0,102,255,.07) 0%, transparent 60%)," +
            "radial-gradient(ellipse 50% 50% at 10% 80%, rgba(99,102,241,.06) 0%, transparent 55%)",
        }} />

        {/* Grid mask */}
        <div className="hero-grid-mask" style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,102,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,102,255,.04) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Ambient orbs */}
        <div style={{
          position: "absolute", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
          width: "500px", height: "500px",
          background: "radial-gradient(circle,rgba(0,102,255,.12) 0%,transparent 70%)",
          top: "-100px", right: "-80px",
          animation: "float 12s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
          width: "400px", height: "400px",
          background: "radial-gradient(circle,rgba(0,102,255,.09) 0%,transparent 70%)",
          bottom: "-50px", left: "-80px",
          animation: "floatAlt 15s ease-in-out infinite",
        }} />

        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 2, width: "100%" }}>
          <div className="hero-grid">

            {/* ── 1: Badge + Title ── */}
            <div className="hero-title-block anim-fade-up" data-d="1">
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "rgba(0,102,255,.08)", border: "1px solid rgba(0,102,255,.2)",
                color: "#0066ff", padding: "6px 16px", borderRadius: "100px",
                fontSize: ".75rem", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase",
                marginBottom: "24px",
              }}>
                <span style={{ position: "relative", width: "8px", height: "8px" }}>
                  <span style={{
                    position: "absolute", inset: 0,
                    background: "#0066ff", borderRadius: "50%",
                    animation: "ping 1.5s cubic-bezier(0,0,.2,1) infinite",
                  }} />
                  <span style={{
                    width: "8px", height: "8px", background: "#0066ff", borderRadius: "50%",
                    display: "block", animation: "breathe 2s ease-in-out infinite",
                  }} />
                </span>
                {heroContent.badge}
              </div>
              <h1 style={{
                fontSize: "clamp(2.2rem,5vw,4.2rem)",
                lineHeight: "1.15", fontWeight: "900", color: "#0f172a", marginBottom: "0",
                letterSpacing: "-0.03em",
              }}>
                {heroContent.title.split("\n").map((line, i, arr) =>
                  i < arr.length - 1
                    ? <span key={i}>{line} &amp;<br /></span>
                    : <span key={i} style={{ background: "linear-gradient(90deg,#0066ff 0%,#60a5fa 50%,#0066ff 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradShift 4s ease infinite" }}>{line}</span>
                )}
              </h1>
            </div>

            {/* ── 2: Portrait ── */}
            <div className="hero-img-block anim-scale-in" data-d="2">
              <div style={{ position: "relative", width: "380px", margin: "0 auto" }}>
                {/* Orbit halo */}
                <div style={{
                  position: "absolute", inset: "-30px",
                  border: "1.5px dashed rgba(0,102,255,.2)", borderRadius: "50%",
                  animation: "orbit 20s linear infinite",
                }}>
                  <div style={{
                    position: "absolute", top: "-6px", left: "50%",
                    width: "12px", height: "12px", background: "#0066ff", borderRadius: "50%",
                    boxShadow: "0 0 12px rgba(0,102,255,.5)", transform: "translateX(-50%)",
                  }} />
                </div>

                <div style={{
                  width: "100%", aspectRatio: "1",
                  borderRadius: "40px",
                  overflow: "hidden",
                  boxShadow: "0 20px 40px rgba(0,0,0,.1)",
                  position: "relative", zIndex: 2,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r2Url(heroContent.imageUrl) || "/images/hethongmmo.png"}
                    alt="Hệ thống MMO & Tài nguyên số 5.0"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>

                {/* Floating chips */}
                <div style={{
                  position: "absolute", background: "rgba(255,255,255,.96)",
                  backdropFilter: "blur(8px)", borderRadius: "14px", padding: "10px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 3,
                  animation: "float 6s ease-in-out infinite",
                  left: "-40px", top: "30%",
                }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0066ff", lineHeight: 1 }}>{heroContent.chip1Value}</div>
                  <div style={{ fontSize: ".7rem", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>{heroContent.chip1Label}</div>
                </div>
                <div style={{
                  position: "absolute", background: "rgba(255,255,255,.96)",
                  backdropFilter: "blur(8px)", borderRadius: "14px", padding: "10px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 3,
                  animation: "float 6s ease-in-out -4s infinite",
                  right: "-40px", bottom: "25%",
                }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0066ff", lineHeight: 1 }}>{heroContent.chip2Value}</div>
                  <div style={{ fontSize: ".7rem", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>{heroContent.chip2Label}</div>
                </div>
              </div>
            </div>

            {/* ── 3: Description ── */}
            <div className="hero-desc-block anim-fade-up" data-d="3">
              <p style={{
                fontSize: "1.05rem", color: "#64748b", marginBottom: "0",
                maxWidth: "480px", lineHeight: "1.75",
              }}>
                {heroContent.description}
              </p>
            </div>

            {/* ── 4: Buttons ── */}
            <div className="hero-btn-block anim-fade-in" data-d="4">
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href={heroContent.btn1Href} className="btn-canva-outline">
                  <Search size={16} strokeWidth={2} />
                  {heroContent.btn1Text}
                </Link>
                <Link href={heroContent.btn2Href} className="btn-canva-primary">
                  {heroContent.btn2Text}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ĐỘI NGŨ SÁNG LẬP ─────────────────────────── */}
      <section style={{ padding: "80px 0", background: "#fff", overflow: "hidden" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>

          {/* Section header */}
          <div style={{ textAlign: "center", marginBottom: "56px" }} className="anim-fade-up" data-d="1">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "rgba(0,102,255,.07)", color: "#0066ff",
              padding: "5px 16px", borderRadius: "100px",
              fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.4px",
              textTransform: "uppercase", marginBottom: "14px",
              border: "1px solid rgba(0,102,255,.15)",
            }}>
              <Briefcase size={13} strokeWidth={2} />
              {teamContent.sectionLabel}
            </div>
            <h2 style={{
              fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: "800",
              color: "#0f172a", margin: 0, lineHeight: "1.2",
            }}>
              {teamContent.sectionTitle}
            </h2>
          </div>

          {/* Two-person grid */}
          <div className="founders-grid">

            {/* ── Member 0 ── */}
            {member0 && <div className="founder-card anim-slide-right" data-d="2">
              <div style={{ position: "relative", marginBottom: "28px" }}>
                <div style={{
                  position: "absolute", inset: "-16px",
                  background: "linear-gradient(135deg,rgba(0,102,255,.06),rgba(0,102,255,.02))",
                  borderRadius: "40px", zIndex: 0,
                }} />
                <div className="founder-img-hover" style={{
                  width: "100%", aspectRatio: "1",
                  borderRadius: "24px", position: "relative", zIndex: 1,
                  boxShadow: "0 16px 40px rgba(0,0,0,.13)",
                  overflow: "hidden", transition: "transform .5s ease",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r2Url(member0.imageUrl)}
                    alt={member0.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{
                  position: "absolute", bottom: "-14px", right: "-14px",
                  background: "#fff", borderRadius: "14px", padding: "12px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 2,
                  textAlign: "center", animation: "float 5s ease-in-out infinite",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: "900", color: member0.badgeColor, lineHeight: 1 }}>{member0.badgeValue}</div>
                  <div style={{ fontSize: ".65rem", color: "#64748b", fontWeight: "600", marginTop: "3px" }}>{member0.badgeLabel}</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: "0 0 4px" }}>{member0.name}</h3>
                <p style={{ fontSize: ".8rem", fontWeight: "600", color: member0.badgeColor, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: ".8px" }}>
                  {member0.title}
                </p>
                {member0.bio1 && <p style={{ fontSize: ".95rem", color: "#64748b", lineHeight: "1.8", marginBottom: "16px" }}>{member0.bio1}</p>}
                {member0.bio2 && <p style={{ fontSize: ".95rem", color: "#64748b", lineHeight: "1.8", marginBottom: "16px" }}>{member0.bio2}</p>}
                {member0.quote && <blockquote style={{
                  borderLeft: `3px solid ${member0.badgeColor}`, padding: "12px 16px",
                  background: "rgba(0,102,255,.04)", borderRadius: "0 10px 10px 0",
                  fontStyle: "italic", fontSize: ".9rem", lineHeight: "1.7", margin: 0, color: "#334155",
                }}>
                  &ldquo;{member0.quote}&rdquo;
                </blockquote>}
              </div>
            </div>}

            {/* ── Member 1 ── */}
            {member1 && <div className="founder-card anim-slide-left" data-d="2">
              <div style={{ position: "relative", marginBottom: "28px" }}>
                <div style={{
                  position: "absolute", inset: "-16px",
                  background: "linear-gradient(135deg,rgba(245,158,11,.08),rgba(249,115,22,.03))",
                  borderRadius: "40px", zIndex: 0,
                }} />
                <div className="founder-img-hover" style={{
                  width: "100%", aspectRatio: "1",
                  borderRadius: "24px", position: "relative", zIndex: 1,
                  boxShadow: "0 16px 40px rgba(0,0,0,.13)",
                  overflow: "hidden", transition: "transform .5s ease",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r2Url(member1.imageUrl)}
                    alt={member1.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{
                  position: "absolute", bottom: "-14px", left: "-14px",
                  background: "#fff", borderRadius: "14px", padding: "12px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 2,
                  textAlign: "center", animation: "float 5s ease-in-out infinite",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: "900", color: member1.badgeColor, lineHeight: 1 }}>{member1.badgeValue}</div>
                  <div style={{ fontSize: ".65rem", color: "#64748b", fontWeight: "600", marginTop: "3px" }}>{member1.badgeLabel}</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: "0 0 4px" }}>{member1.name}</h3>
                <p style={{ fontSize: ".8rem", fontWeight: "600", color: member1.badgeColor, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: ".8px" }}>
                  {member1.title}
                </p>
                {member1.bio1 && <p style={{ fontSize: ".95rem", color: "#64748b", lineHeight: "1.8", marginBottom: "16px" }}>{member1.bio1}</p>}
                {member1.bio2 && <p style={{ fontSize: ".95rem", color: "#64748b", lineHeight: "1.8", marginBottom: "16px" }}>{member1.bio2}</p>}
                {member1.quote && <blockquote style={{
                  borderLeft: `3px solid ${member1.badgeColor}`, padding: "12px 16px",
                  background: "rgba(245,158,11,.04)", borderRadius: "0 10px 10px 0",
                  fontStyle: "italic", fontSize: ".9rem", lineHeight: "1.7", margin: 0, color: "#334155",
                }}>
                  &ldquo;{member1.quote}&rdquo;
                </blockquote>}
              </div>
            </div>}

          </div>
        </div>
      </section>

      {/* ── COURSE SLIDER ─────────────────────────────── */}
      <CourseSlider courses={featuredCourses} />

      {/* ── BÁO CHÍ / TRUYỀN THÔNG ────────────────────── */}
      <section style={{ padding: "72px 0 64px", background: "#fff" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "rgba(0,102,255,.07)", color: "#0066ff",
              padding: "5px 16px", borderRadius: "100px",
              fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.4px",
              textTransform: "uppercase", marginBottom: "18px",
              border: "1px solid rgba(0,102,255,.15)",
            }}>
              <Newspaper size={13} strokeWidth={2} />
              {pressContent.badge}
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: "900",
              color: "#0f172a", margin: "0 0 14px", letterSpacing: "-0.02em",
              lineHeight: "1.15",
            }}>
              {pressContent.title}
            </h2>

            {/* Subtitle */}
            <p style={{ fontSize: ".95rem", color: "#64748b", margin: "0 auto", maxWidth: "460px", lineHeight: "1.7" }}>
              {pressContent.subtitle.split("\n").map((line, idx) => (
                <span key={idx}>{line}{idx < pressContent.subtitle.split("\n").length - 1 && <br />}</span>
              ))}
            </p>

            {/* Decorative divider */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "22px" }}>
              <div style={{ width: "48px", height: "1.5px", background: "linear-gradient(to right, transparent, #0066ff)" }} />
              <div style={{ width: "7px", height: "7px", background: "#0066ff", borderRadius: "2px", transform: "rotate(45deg)" }} />
              <div style={{ width: "48px", height: "1.5px", background: "linear-gradient(to left, transparent, #0066ff)" }} />
            </div>
          </div>

          {/* 3 Press Cards */}
          <div className="press-grid">
            {pressContent.cards.map((card, i) => (
              <a
                key={i}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="press-card anim-card-in"
                data-d={String(i + 1)}
                style={{ textDecoration: "none" }}
              >
                <div style={{ padding: "26px 26px 22px", display: "flex", flexDirection: "column", height: "100%" }}>

                  {/* Logo + tag row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    {/* Logo */}
                    {card.logoType === "Báo Quốc Tế" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          background: "linear-gradient(135deg,#0066ff,#3b82f6)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <ExternalLink size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                        </div>
                        <span style={{ fontWeight: "800", fontSize: ".95rem", color: "#111827", letterSpacing: "-0.3px" }}>Báo Quốc Tế</span>
                      </div>
                    )}
                    {card.logoType === "VTV" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "6px",
                          background: "#d40000",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ color: "#fff", fontWeight: "900", fontSize: ".65rem", letterSpacing: "-.3px" }}>VTV</span>
                        </div>
                        <span style={{ fontWeight: "800", fontSize: ".95rem", color: "#111827", letterSpacing: "-0.3px" }}>VTV.vn</span>
                      </div>
                    )}
                    {card.logoType === "Ngôi Sao VN" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Star size={14} strokeWidth={2} fill="#fff" style={{ color: "#fff" }} />
                        </div>
                        <span style={{ fontWeight: "800", fontSize: ".95rem", color: "#111827", letterSpacing: "-0.3px" }}>Ngôi Sao VN</span>
                      </div>
                    )}

                    {/* Tag chip */}
                    <span style={{
                      fontSize: ".7rem", fontWeight: "600", color: card.tagColor,
                      background: `${card.tagColor}12`,
                      border: `1px solid ${card.tagColor}30`,
                      padding: "4px 12px", borderRadius: "100px",
                      whiteSpace: "nowrap",
                    }}>{card.tag}</span>
                  </div>

                  {/* Quote + headline + desc */}
                  <div style={{ flex: 1 }}>
                    {/* Large opening quote */}
                    <div style={{
                      fontSize: "2.8rem", fontWeight: "900", color: "#0066ff",
                      lineHeight: "1", marginBottom: "6px", fontFamily: "Georgia, serif",
                      opacity: 0.25,
                    }}>&ldquo;</div>

                    <p style={{
                      fontSize: ".975rem", fontWeight: "700", color: "#0f172a",
                      lineHeight: "1.6", margin: "0 0 12px",
                    }}>
                      {card.headline}
                    </p>
                    <p style={{
                      fontSize: ".875rem", color: "#64748b",
                      lineHeight: "1.7", margin: 0,
                    }}>
                      {card.desc}
                    </p>
                  </div>

                  {/* Footer: date + link */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    paddingTop: "18px", marginTop: "20px",
                    borderTop: "1px solid #f1f5f9",
                  }}>
                    <span style={{ fontSize: ".78rem", color: "#94a3b8", fontWeight: "500" }}>{card.date}</span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      fontSize: ".82rem", fontWeight: "600", color: "#0066ff",
                    }}>
                      Đọc bài viết
                      <ExternalLink size={13} strokeWidth={2} />
                    </span>
                  </div>

                </div>
              </a>
            ))}
          </div>

        </div>
      </section>

      {/* ── DỊCH VỤ CHUYÊN NGHIỆP CỦA CHÚNG TÔI ─────── */}
      <section style={{ padding: "60px 0", background: "#fff" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "rgba(0,102,255,.08)", color: "#0066ff",
                padding: "5px 14px", borderRadius: "100px",
                fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.2px",
                textTransform: "uppercase", marginBottom: "8px",
              }}>
                <Trophy size={14} strokeWidth={1.75} />
                Chuyên nghiệp
              </div>
              <h2 style={{ fontSize: "clamp(1.3rem,3vw,1.8rem)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                DỊCH VỤ CHUYÊN NGHIỆP CỦA CHÚNG TÔI
              </h2>
            </div>
            <Link href="/dich-vu" style={{
              fontSize: ".875rem", fontWeight: "600", color: "#0066ff",
              textDecoration: "none", border: "1.5px solid #0066ff",
              padding: "7px 18px", borderRadius: "8px",
              whiteSpace: "nowrap",
            }} className="btn-view-all">
              Xem tất cả
            </Link>
          </div>

          {(() => {
            const cards = featuredServices.length > 0
              ? featuredServices.map((s) => ({ href: `/dich-vu/${s.slug}`, name: s.name, price: Number(s.price), thumb: s.thumbnail, emoji: "⚙️" }))
              : POPULAR_SERVICES.slice(0, 8).map((s) => ({ href: s.href, name: s.title, price: 0, thumb: null as string | null, emoji: s.emoji }));
            return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }} className="grid-4-responsive">
            {cards.map((svc, i) => {
              const { href, name, price, thumb, emoji } = svc;
              return (
                <Link
                  key={i}
                  href={href}
                  className="svc-compact-card anim-card-in"
                  data-d={String((i % 6) + 1)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    background: "#fff", borderRadius: "16px",
                    border: "1.5px solid #e2e8f0",
                    overflow: "hidden", textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                    textAlign: "center",
                  }}
                >
                  {/* Image / emoji area */}
                  <div style={{
                    width: "100%", aspectRatio: "16/9",
                    background: "linear-gradient(135deg,#e0f2fe 0%,#bfdbfe 60%,#ddd6fe 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "36px", position: "relative", overflow: "hidden",
                  }}>
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={r2Url(thumb)} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "14px 12px 16px", width: "100%" }}>
                    <p style={{
                      fontSize: ".82rem", fontWeight: "700", color: "#0f172a",
                      margin: "0 0 6px", lineHeight: "1.3",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {name}
                    </p>
                    <p style={{ fontSize: ".9rem", fontWeight: "800", color: "#E53E3E", margin: 0 }}>
                      {price > 0 ? formatVnd(price) : "Liên hệ"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
            );
          })()}
        </div>
      </section>

      {/* ── STATS — taste-skill §4.9: bold display numbers, no border dividers ── */}
      <div style={{
        background: "#0f172a",
        padding: "50px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0" }} className="stats-grid-responsive">
            {cmsStats.map(({ value, count, suffix, label }, i) => (
              <div
                key={label}
                className="anim-card-in"
                data-d={String(i + 1)}
                style={{
                  textAlign: "center", padding: "28px 17px",
                  cursor: "default",
                  borderLeft: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none",
                }}
              >
                <h3
                  data-count={count !== null ? String(count) : undefined}
                  data-suffix={count !== null ? suffix : undefined}
                  style={{
                    fontSize: "clamp(1.4rem,2.45vw,2.24rem)", fontWeight: "900",
                    lineHeight: 1, marginBottom: "7px", color: "#fff",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {value}
                </h3>
                <p style={{ fontSize: ".6rem", color: "rgba(255,255,255,.5)", fontWeight: "600", letterSpacing: ".8px", textTransform: "uppercase", margin: 0 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ── TUT HOT NHẤT HÔM NAY ──────────────────────── */}
      {hotTuts.length > 0 && <section style={{ padding: "60px 0", background: "#fff" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(239,68,68,.08)", color: "#ef4444",
                padding: "5px 14px", borderRadius: "100px",
                fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.2px",
                textTransform: "uppercase", marginBottom: "8px",
              }}>
                <Flame size={13} strokeWidth={1.75} />
                Nổi bật
              </div>
              <h2 style={{ fontSize: "clamp(1.3rem,3vw,1.8rem)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                TUT HOT NHẤT HÔM NAY
              </h2>
            </div>
            <Link href="/tut-tricks" style={{
              fontSize: ".875rem", fontWeight: "600", color: "#0066ff",
              textDecoration: "none", border: "1.5px solid #0066ff",
              padding: "7px 18px", borderRadius: "8px", transition: "background .22s ease, color .22s ease",
            }} className="btn-view-all">
              Xem tất cả
            </Link>
          </div>

          {hotTuts.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#f8fafc", borderRadius: "16px", border: "1.5px dashed #e2e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                <BookOpen size={48} strokeWidth={1.5} style={{ color: "#94a3b8" }} />
              </div>
              <p style={{ color: "#64748b", fontWeight: "600" }}>Chưa có TUT nào. Hãy quay lại sau!</p>
              <Link href="/tut-tricks" style={{
                display: "inline-block", marginTop: "16px",
                background: "#0066ff", color: "#fff",
                padding: "10px 24px", borderRadius: "8px", fontWeight: "700",
                textDecoration: "none",
              }}>
                Khám phá TUT MMO →
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "20px" }} className="tut-grid">
              {hotTuts.map((tut, i) => {
                const pubDate = tut.publishedDate
                  ? new Date(tut.publishedDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : null;
                return (
                  <Link
                    key={tut.id}
                    href={`/tut-tricks/${tut.slug}`}
                    className="tut-card anim-card-in"
                    data-d={String(i + 1)}
                    style={{
                      display: "flex", flexDirection: "column",
                      background: "#fff", borderRadius: "16px",
                      border: "1.5px solid #e2e8f0",
                      overflow: "hidden", textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,.06)",
                    }}
                  >
                    {/* Thumbnail / platform banner */}
                    <div style={{
                      position: "relative",
                      background: tut.platform === "TIKTOK"
                        ? "linear-gradient(135deg,#000 0%,#1a1a2e 100%)"
                        : "linear-gradient(135deg,#1877f2 0%,#003d9c 100%)",
                      aspectRatio: "16/7",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {tut.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r2Url(tut.thumbnail)} alt={tut.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                      ) : tut.platform === "TIKTOK" ? (
                        <Music2 size={52} strokeWidth={1.25} style={{ color: "rgba(255,255,255,0.7)" }} />
                      ) : tut.platform === "FACEBOOK" ? (
                        <Users size={52} strokeWidth={1.25} style={{ color: "rgba(255,255,255,0.7)" }} />
                      ) : (
                        <BookOpen size={52} strokeWidth={1.25} style={{ color: "rgba(255,255,255,0.7)" }} />
                      )}
                      {/* Badges row */}
                      <div style={{
                        position: "absolute", top: "10px", left: "10px",
                        display: "flex", gap: "6px",
                      }}>
                        <span style={{
                          background: "#ef4444", color: "#fff",
                          fontSize: ".65rem", fontWeight: "800", padding: "3px 8px", borderRadius: "4px",
                        }}>HOT</span>
                        <span style={{
                          background: "rgba(255,255,255,.95)", color: "#1877f2",
                          fontSize: ".65rem", fontWeight: "700", padding: "3px 8px", borderRadius: "4px",
                        }}>{PLATFORM_LABEL[tut.platform] ?? tut.platform}</span>
                        <span style={{
                          background: "rgba(255,255,255,.95)", color: "#64748b",
                          fontSize: ".65rem", fontWeight: "700", padding: "3px 8px", borderRadius: "4px",
                        }}>Có phí</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                      <h3 style={{
                        fontSize: ".975rem", fontWeight: "700", color: "#0f172a",
                        margin: 0, lineHeight: "1.4",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {tut.name}
                      </h3>

                      {/* Meta row */}
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: ".8rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Users size={13} strokeWidth={1.75} />
                          {tut.totalOrders.toLocaleString("vi-VN")} khách hàng
                        </span>
                        {pubDate && (
                          <span style={{ fontSize: ".8rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}><Calendar size={13} strokeWidth={1.75} />{pubDate}</span>
                        )}
                      </div>

                      {/* Processing & Warranty */}
                      {(tut.processingTime ?? tut.warrantyPolicy) && (
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {tut.processingTime && (
                            <span style={{ fontSize: ".78rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} strokeWidth={1.75} />
                              Xử lý: {tut.processingTime}
                            </span>
                          )}
                          {tut.warrantyPolicy && (
                            <span style={{ fontSize: ".78rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Shield size={12} strokeWidth={1.75} />
                              BH: {tut.warrantyPolicy}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Success rate bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: ".75rem", color: "#64748b" }}>Tỉ lệ thành công</span>
                          <span style={{ fontSize: ".75rem", fontWeight: "700", color: "#64748b" }}>{tut.successRate}%</span>
                        </div>
                        <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", background: "#34d399", borderRadius: "3px",
                            width: `${tut.successRate}%`,
                          }} />
                        </div>
                      </div>

                      {/* Price + CTA */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f1f5f9",
                      }}>
                        <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#E53E3E" }}>
                          {formatVnd(Number(tut.price))}
                        </span>
                        <span style={{
                          background: "#E53E3E", color: "#fff",
                          padding: "8px 20px", borderRadius: "8px",
                          fontWeight: "700", fontSize: ".85rem",
                          display: "inline-flex", alignItems: "center", gap: "6px",
                        }}>
                          <ShoppingCart size={14} strokeWidth={2} />
                          MUA NGAY
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>}

      {/* ── CATEGORY NAV BAR ──────────────────────────── */}
      <div style={{
        background: "#fff",
        borderTop: "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: "1200px", margin: "0 auto",
          display: "flex", alignItems: "center", gap: "0",
          overflowX: "auto", whiteSpace: "nowrap",
        }} className="no-scrollbar cat-nav-row">
          <span style={{
            color: "#64748b", fontWeight: "700", fontSize: ".75rem",
            letterSpacing: "1px", textTransform: "uppercase",
            whiteSpace: "nowrap", padding: "12px 16px 12px 0",
            borderRight: "1px solid #e2e8f0", marginRight: "4px", flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: "6px",
          }}>
            <FolderOpen size={13} strokeWidth={1.75} />
            DANH MỤC TÀI NGUYÊN
          </span>
          <Link
            href="/tai-nguyen-mmo"
            className="cat-nav-link"
            style={{
              color: "#0f172a", fontSize: ".85rem", fontWeight: "600",
              padding: "12px 16px", whiteSpace: "nowrap", textDecoration: "none",
              transition: "color .2s ease, background .2s ease",
            }}
          >
            Tất cả
          </Link>
          {navCategories.map(({ name }) => (
            <Link
              key={name}
              href={`/tai-nguyen-mmo?category=${encodeURIComponent(name)}`}
              className="cat-nav-link"
              style={{
                color: "#0f172a", fontSize: ".85rem", fontWeight: "600",
                padding: "12px 16px", whiteSpace: "nowrap", textDecoration: "none",
                transition: "color .2s ease, background .2s ease",
              }}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── SẢN PHẨM MMO NỔI BẬT ─────────────────────── */}
      <section style={{ padding: "60px 0", background: "#fff" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(0,102,255,.08)", color: "#0066ff",
                padding: "5px 14px", borderRadius: "100px",
                fontSize: ".72rem", fontWeight: "700", letterSpacing: "1.2px",
                textTransform: "uppercase", marginBottom: "8px",
              }}>
                <ShoppingBag size={13} strokeWidth={1.75} />
                Bán chạy
              </div>
              <h2 style={{ fontSize: "clamp(1.3rem,3vw,1.8rem)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                SẢN PHẨM MMO NỔI BẬT
              </h2>
            </div>
            <Link href="/tai-nguyen-mmo" style={{
              fontSize: ".875rem", fontWeight: "600", color: "#0066ff",
              textDecoration: "none", border: "1.5px solid #0066ff",
              padding: "7px 18px", borderRadius: "8px",
            }} className="btn-view-all">
              Xem tất cả
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: "16px", border: "1.5px dashed #e2e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                <ShoppingBag size={48} strokeWidth={1.5} style={{ color: "#94a3b8" }} />
              </div>
              <p style={{ color: "#64748b", fontWeight: "600" }}>Chưa có sản phẩm nào. Hãy quay lại sau!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px", alignItems: "stretch" }} className="product-grid">
              {featuredProducts.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/tai-nguyen-mmo/san-pham/${p.id}`}
                  className="product-card anim-card-in"
                  data-d={String(i + 1)}
                  style={{
                    display: "flex", flexDirection: "column",
                    background: "#fff", borderRadius: "16px",
                    border: "1.5px solid #e2e8f0",
                    overflow: "hidden", textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(0,0,0,.06)",
                    height: "100%",
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    position: "relative",
                    background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                    aspectRatio: "16/9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {p.imageUrl ? (
                      <>
                        {/* Blurred background fill */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r2Url(p.imageUrl)} alt="" aria-hidden style={{ width: "115%", height: "115%", objectFit: "cover", position: "absolute", inset: "-7.5%", filter: "blur(18px)", opacity: 0.5 }} />
                        {/* Sharp foreground — contain để thấy blur viền */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r2Url(p.imageUrl)} alt={p.name} style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", objectFit: "contain" }} />
                      </>
                    ) : (
                      <Lock size={36} strokeWidth={1.5} style={{ color: "#059669", opacity: 0.65 }} />
                    )}
                    <span style={{
                      position: "absolute", top: "8px", left: "8px", zIndex: 2,
                      background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#b45309",
                      color: "#fff",
                      fontSize: ".65rem", fontWeight: "900", padding: "2px 8px", borderRadius: "4px",
                      letterSpacing: ".5px",
                    }}>#{i + 1} BÁN CHẠY</span>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Tags */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: ".68rem", fontWeight: "700", color: "#f97316",
                        background: "rgba(249,115,22,.08)", padding: "2px 8px", borderRadius: "4px",
                      }}>
                        Seller #{p.seller.uidPrefix}
                      </span>
                      <span style={{
                        fontSize: ".68rem", fontWeight: "600", color: "#64748b",
                        background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px",
                      }}>
                        {p.sellerCategory}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontSize: ".95rem", fontWeight: "700", color: "#0f172a", margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      lineHeight: "1.4", minHeight: "2.8em",
                    }}>
                      {p.name}
                    </h3>

                    {/* Description — always render for equal height */}
                    <p style={{
                      fontSize: ".78rem", color: "#64748b", margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      lineHeight: "1.55", minHeight: "2.4em",
                    }}>
                      {p.description ?? "Sản phẩm chất lượng cao, giao hàng tự động, bảo hành uy tín."}
                    </p>

                    {/* Stock & Sales */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: ".75rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Package size={12} strokeWidth={1.75} />
                        {p._count.stockItems} còn hàng
                      </span>
                      <span style={{ fontSize: ".75rem", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                        <CheckCircle size={12} strokeWidth={1.75} />
                        {p.salesCount} đã bán
                      </span>
                    </div>

                    {/* Price + CTA */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9",
                    }}>
                      <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "#E53E3E" }}>
                        {formatVnd(Number(p.price))}
                      </span>
                      <span style={{
                        background: "#E53E3E", color: "#fff",
                        padding: "8px 18px", borderRadius: "8px",
                        fontWeight: "700", fontSize: ".82rem",
                        display: "inline-flex", alignItems: "center", gap: "5px",
                      }}>
                        <ShoppingCart size={13} strokeWidth={2} />
                        MUA NGAY
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section style={{ padding: "100px 0", background: "#fff" }}>
        <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: "60px", alignItems: "flex-start" }} className="faq-cta-flex">

            {/* FAQ */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "36px" }}>
                <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: "800", color: "#0f172a", lineHeight: "1.2", margin: 0 }}>
                  {faqContent.title}
                </h2>
              </div>
              <FaqAccordion items={faqContent.items} />
            </div>

            {/* CTA Card */}
            <div style={{ flex: "0 0 340px" }} className="cta-card-col">
              <div style={{
                background: "linear-gradient(135deg,rgba(0,64,179,.95) 0%,rgba(0,90,230,.95) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,.15)",
                borderRadius: "24px", padding: "40px 32px",
                boxShadow: "0 20px 50px rgba(0,64,179,.35), 0 1px 0 rgba(255,255,255,.1) inset",
                textAlign: "center",
                position: "sticky", top: "100px",
              }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                  <Zap size={48} strokeWidth={1.5} style={{ color: "#fff" }} />
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", marginBottom: "12px" }}>
                  Bắt đầu ngay hôm nay
                </h3>
                <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.75)", lineHeight: "1.7", marginBottom: "28px" }}>
                  Đăng ký miễn phí — Không cần thẻ tín dụng, truy cập và sử dụng dịch vụ ngay.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <Link href="/dang-ky" style={{
                    background: "#fff", color: "#0052cc",
                    padding: "14px 24px", borderRadius: "12px",
                    fontWeight: "700", fontSize: ".95rem", textDecoration: "none",
                    textAlign: "center", transition: "background .3s ease, transform .3s ease, box-shadow .3s ease",
                  }} className="cta-btn-green">
                    Đăng ký miễn phí
                  </Link>
                  <Link href="/dich-vu" style={{
                    background: "rgba(255,255,255,.12)", color: "#fff",
                    padding: "14px 24px", borderRadius: "12px",
                    fontWeight: "600", fontSize: ".95rem", textDecoration: "none",
                    textAlign: "center", transition: "background .3s ease",
                    border: "1px solid rgba(255,255,255,.2)",
                  }} className="cta-btn-outline">
                    Xem dịch vụ
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA FULL-WIDTH ─────────────────────────────── */}
     

      {/* ── Responsive + hover CSS ─── */}
      <style>{`
        /* ── Canva-style buttons ── */
        .btn-canva-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: #0066ff; color: #fff;
          border: 2px solid #0066ff; border-radius: 10px;
          font-weight: 700; font-size: .95rem; text-decoration: none;
          transition: background .22s ease, border-color .22s ease, transform .22s ease, box-shadow .22s ease;
          cursor: pointer; white-space: nowrap;
        }
        .btn-canva-primary:hover {
          background: #0052cc; border-color: #0052cc;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,102,255,.38);
        }
        .btn-canva-primary:focus-visible {
          outline: 2px solid #0066ff; outline-offset: 3px;
        }
        .btn-canva-primary:active { transform: translateY(0); }

        .btn-canva-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: transparent; color: #0066ff;
          border: 2px solid #0066ff; border-radius: 10px;
          font-weight: 700; font-size: .95rem; text-decoration: none;
          transition: background .22s ease, color .22s ease, transform .22s ease, box-shadow .22s ease;
          cursor: pointer; white-space: nowrap;
        }
        .btn-canva-outline:hover {
          background: #0066ff; color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,102,255,.28);
        }
        .btn-canva-outline:focus-visible {
          outline: 2px solid #0066ff; outline-offset: 3px;
        }
        .btn-canva-outline:active { transform: translateY(0); }

        /* Hero buttons */
        .btn-hero-primary {
          animation: pulseNeon 2.5s ease-in-out infinite;
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .btn-hero-primary:hover {
          transform: translateY(-3px) scale(1.02);
          animation: none;
          box-shadow: 0 12px 32px rgba(0,102,255,.45);
        }
        .btn-hero-outline {
          transition: background .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease, transform .3s ease;
        }
        .btn-hero-outline:hover {
          background: #2B6CB0;
          color: #fff !important;
          border-color: #2B6CB0 !important;
          box-shadow: 0 8px 24px rgba(43,108,176,.3);
          transform: translateY(-2px);
        }
        .btn-hero-orange:hover {
          background: #ea6a0a !important;
          box-shadow: 0 8px 24px rgba(249,115,22,.4);
          transform: translateY(-2px);
        }
        /* Category nav links */
        .cat-nav-link:hover { color: #0066ff !important; background: rgba(0,102,255,.06); }
        /* Category icon cards */
        .cat-icon-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,.10);
          border-color: #0066ff !important;
        }
        /* TUT cards */
        .tut-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 44px rgba(0,0,0,.12);
          border-color: rgba(0,102,255,.2) !important;
        }
        /* Product cards */
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(0,0,0,.10);
          border-color: rgba(0,102,255,.2) !important;
        }
        /* Service cards */
        .service-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 24px 50px rgba(0,0,0,.12);
          border-color: rgba(0,102,255,.15) !important;
        }
        /* View all button */
        .btn-view-all:hover {
          background: #2B6CB0;
          color: #fff !important;
        }
        /* Filter tabs */
        .filter-tab:hover {
          background: #0066ff !important;
          color: #fff !important;
          border-color: #0066ff !important;
        }
        /* Expert image */
        .expert-img-hover:hover { transform: scale(1.03); }
        /* CTA buttons */
        .cta-btn-green:hover { background: #e8f0ff !important; transform: translateY(-2px); }
        .cta-btn-outline:hover { background: rgba(255,255,255,.2) !important; }

        /* ── Category icon card — icon box hover ── */
        .cat-icon-card:hover > div:first-child {
          background: rgba(0,102,255,.14) !important;
        }

        /* ── Section header pattern ── */
        .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; }
        .section-header-left { display: flex; flex-direction: column; gap: 4px; }
        .section-label {
          font-size: .72rem; font-weight: 700; letter-spacing: 1.4px;
          text-transform: uppercase; color: #0066ff;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .section-title { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0; }
        .section-link {
          font-size: .875rem; font-weight: 600; color: #0066ff;
          text-decoration: none; border: 1.5px solid #0066ff;
          padding: 7px 18px; border-radius: 8px;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background .22s ease, color .22s ease, border-color .22s ease; white-space: nowrap;
        }
        .section-link:hover { background: #0066ff; color: #fff; }

        /* ── Press cards ── */
        .press-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .press-card {
          background: #fff;
          border: 1.5px solid #e8edf2;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 12px rgba(0,0,0,.05);
          transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
        }
        .press-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(0,0,0,.11);
          border-color: rgba(0,102,255,.3);
        }

        /* ── Layout ── */
        .stats-grid-responsive { grid-template-columns: repeat(5,1fr); }
        .grid-3-responsive { grid-template-columns: repeat(3,1fr); }
        .grid-4-responsive { grid-template-columns: repeat(4,1fr); }
        .cat-icons-grid    { grid-template-columns: repeat(8,1fr); }
        .tut-grid          { grid-template-columns: repeat(2,1fr); }
        .product-grid      { grid-template-columns: repeat(3,1fr); }
        .faq-cta-flex      { flex-direction: row; align-items: flex-start; }
        .cta-card-col      { display: block; }

        /* ── Section 1: DJ Media Grid ── */
        .dj-media-grid {
          display: grid;
          grid-template-columns: 1fr 480px;
          grid-template-rows: auto auto auto;
          column-gap: 64px;
          row-gap: 24px;
          align-items: start;
        }
        .dj-media-title { grid-column: 1; grid-row: 1; }
        .dj-media-desc  { grid-column: 1; grid-row: 2; }
        .dj-media-btn   { grid-column: 1; grid-row: 3; }
        .dj-media-img   { grid-column: 2; grid-row: 1 / 4; align-self: center; }

        /* ── Section 2: Hero Grid ── */
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          grid-template-rows: auto auto auto;
          column-gap: 60px;
          align-items: start;
        }
        .hero-title-block { grid-column: 1; grid-row: 1; }
        .hero-desc-block  { grid-column: 1; grid-row: 2; }
        .hero-btn-block   { grid-column: 1; grid-row: 3; }
        .hero-img-block   { grid-column: 2; grid-row: 1 / 4; align-self: center; }

        /* ── Founders grid ── */
        .founders-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: start;
        }
        .founder-card { display: flex; flex-direction: column; }
        .founder-img-hover:hover { transform: scale(1.03); }

        /* Social icon buttons */
        .social-icon-btn:hover {
          transform: translateY(-4px) scale(1.08);
          box-shadow: 0 8px 20px rgba(0,0,0,.2);
        }
        /* Service compact card hover */
        .svc-compact-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 32px rgba(0,0,0,.10);
          border-color: rgba(0,102,255,.2) !important;
        }

        @media (max-width: 1024px) {
          .press-grid     { grid-template-columns: repeat(2, 1fr); }
          .dj-media-grid  { grid-template-columns: 1fr 380px; column-gap: 40px; }
          .hero-grid      { grid-template-columns: 1fr 320px; column-gap: 40px; }
          .founders-grid  { gap: 36px; }
          .stats-grid-responsive { grid-template-columns: repeat(3,1fr) !important; }
          .cat-icons-grid    { grid-template-columns: repeat(4,1fr) !important; }
          .grid-4-responsive { grid-template-columns: repeat(4,1fr) !important; }
        }
        @media (max-width: 900px) {
          .faq-cta-flex { flex-direction: column !important; }
          .cta-card-col { flex: unset !important; width: 100% !important; }
          .grid-4-responsive { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 768px) {
          .press-grid { grid-template-columns: 1fr; gap: 16px; }

          /* Section 1 mobile: title → image → desc → button */
          .dj-media-grid {
            grid-template-columns: 1fr;
            column-gap: 0;
            row-gap: 20px;
          }
          .dj-media-title { grid-column: 1; grid-row: 1; }
          .dj-media-img   { grid-column: 1; grid-row: 2; }
          .dj-media-desc  { grid-column: 1; grid-row: 3; }
          .dj-media-btn   { grid-column: 1; grid-row: 4; }

          /* Section 2 mobile: title → image → desc → button */
          .hero-grid {
            grid-template-columns: 1fr;
            column-gap: 0;
            row-gap: 20px;
            text-align: center;
          }
          .hero-title-block { grid-column: 1; grid-row: 1; }
          .hero-img-block   { grid-column: 1; grid-row: 2; width: 100%; }
          .hero-desc-block  { grid-column: 1; grid-row: 3; }
          .hero-btn-block   { grid-column: 1; grid-row: 4; }
          .hero-btn-block > div { justify-content: center; }

          /* Founders grid mobile: stack vertically */
          .founders-grid { grid-template-columns: 1fr; gap: 48px; }

          .stats-grid-responsive { grid-template-columns: repeat(3,1fr) !important; }
          .grid-3-responsive { grid-template-columns: repeat(2,1fr) !important; gap: 18px !important; }
          .grid-4-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .cat-icons-grid    { grid-template-columns: repeat(4,1fr) !important; }
          .tut-grid          { grid-template-columns: 1fr !important; }
          .product-grid      { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          .grid-3-responsive { grid-template-columns: 1fr !important; }
          .grid-4-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .cat-icons-grid    { grid-template-columns: repeat(4,1fr) !important; gap: 8px !important; }
          .stats-grid-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .product-grid      { grid-template-columns: 1fr !important; }
          .tut-grid          { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* ─── Service card component ─── */
function ServiceCard({
  title, desc, href, emoji, delay,
}: {
  title: string; desc: string; href: string; emoji: string; delay: number;
}) {
  return (
    <Link
      href={href}
      className="service-card anim-fade-up"
      data-d={String(delay)}
      style={{
        background: "#fff",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 4px 6px rgba(0,0,0,.06)",
        border: "1.5px solid transparent",
        transition: "transform .4s ease, box-shadow .4s ease, border-color .3s ease",
        textDecoration: "none",
        display: "block",
      }}
    >
      <div style={{
        aspectRatio: "16/10",
        background: "linear-gradient(135deg,#e0f2fe 0%,#bfdbfe 50%,#ddd6fe 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "48px", overflow: "hidden",
      }}>
        {emoji}
      </div>
      <div style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "8px", color: "#0f172a" }}>{title}</h3>
        <p style={{ fontSize: ".92rem", color: "#64748b", lineHeight: "1.7", margin: 0 }}>{desc}</p>
      </div>
    </Link>
  );
}
