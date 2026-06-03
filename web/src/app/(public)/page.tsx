import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";
import HeroScrollObserver from "@/components/home/HeroScrollObserver";
import CourseSlider from "@/components/home/CourseSlider";
import FaqAccordion from "@/components/home/FaqAccordion";
import {
  GraduationCap, Unlock, BookOpen, ShoppingBag, Megaphone,
  ShieldCheck, Zap, Headphones, Flame, Lock,
  ShoppingCart, ArrowRight, Search,
  Phone, Trophy, FolderOpen, Calendar, Clock, Shield, Package,
  CheckCircle, HelpCircle, Briefcase, Users, Music2,
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
  const [hotTuts, featuredProducts, featuredServices, rawCourses] = await Promise.all([
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
  ]);

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

      {/* ── DJ MEDIA AGENCY INTRO ────────────────────── */}
      <section style={{ padding: "80px 0 72px", background: "#fff", overflow: "hidden" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: "64px", alignItems: "center" }} className="expert-flex">

            {/* ── Left: Text ── */}
            <div style={{ flex: 1 }} className="anim-fade-up">

              <h2 style={{
                fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: "900",
                color: "#0f172a", lineHeight: "1.2", marginBottom: "20px",
              }}>
                CÔNG TY TNHH DJ MEDIA &amp;<br />SUPPORT MẠNG XÃ HỘI
              </h2>

              <p style={{
                fontSize: ".975rem", color: "#2563eb", lineHeight: "1.85",
                marginBottom: "32px", maxWidth: "520px",
              }}>
                Hỗ Trợ Mọi Vấn Đề Dịch Vụ Mạng Xã Hội Đội Ngũ Chuyên Nghiệp Với 7 Năm Kinh Nghiệm Trong Các Lĩnh Vực : Hỗ Trợ Tất Cả Về Dịch Vụ Facebook + Tik Tok + Google, Chạy Quảng Cáo ADS, Khai Thác Adbreak và Đào Tạo Học Viên Chuyên Nghiệp Là Đơn Vị Công Ty Dịch Vụ Mạng Xã Hội Facebook + Tik Tok Đầu Tiên Tại Việt Nam Có 2 Chi Nhánh Tại Hà Nội và Hà Tĩnh !
              </p>

              {/* Social icons */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "32px", flexWrap: "wrap" }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#010101", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.89a8.18 8.18 0 0 0 4.78 1.52V7a4.85 4.85 0 0 1-1.01-.31z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://zalo.me" target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <span style={{ color: "#fff", fontWeight: "900", fontSize: ".85rem", letterSpacing: "-.5px" }}>Zalo</span>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform .25s ease, box-shadow .25s ease" }}>
                  <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#FF0000" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/><polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                </a>
              </div>

              {/* Hotline card */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "14px 24px", boxShadow: "0 4px 18px rgba(0,0,0,.07)" }}>
                <div style={{ width: "48px", height: "48px", flexShrink: 0, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={22} strokeWidth={2} style={{ color: "#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize: ".78rem", color: "#64748b", margin: "0 0 3px", fontWeight: "500" }}>Hotline (CEO – Phạm Hữu Dũng)</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f97316", margin: 0, letterSpacing: ".5px" }}>0828.118.789</p>
                </div>
              </div>
            </div>

            {/* ── Right: Image ── */}
            <div style={{ flex: "0 0 480px", position: "relative" }} className="anim-scale-in expert-img-col">
              <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.16)", aspectRatio: "4/3", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/dj-media-classroom.jpg" alt="DJ Media Agency – Lớp học thực chiến" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ position: "absolute", bottom: "24px", left: "24px", background: "#fff", borderRadius: "16px", padding: "14px 20px", boxShadow: "0 12px 32px rgba(0,0,0,.14)", zIndex: 2, animation: "float 5s ease-in-out infinite" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#f59e0b", lineHeight: 1 }}>10+</div>
                <div style={{ fontSize: ".73rem", color: "#334155", fontWeight: "600", marginTop: "4px" }}>Năm Kinh Nghiệm</div>
                <div style={{ fontSize: ".73rem", color: "#334155", fontWeight: "600" }}>Thực Chiến</div>
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
          background: "#ffffff",
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

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 2, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "60px" }} className="hero-inner-flex">

            {/* Content */}
            <div style={{ flex: 1 }} className="anim-fade-up">
              {/* Badge */}
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
                Hệ thống MMO &amp; Tài nguyên số 5.0 chính thức ra mắt
              </div>

              {/* taste-skill §4.7: hero max 4 elements — eyebrow·H1·subtext·CTAs */}
              <h1 style={{
                fontSize: "clamp(2.2rem,5vw,4.2rem)",
                lineHeight: "1.15", fontWeight: "900", color: "#0f172a", marginBottom: "20px",
                letterSpacing: "-0.03em",
              }}>
                HỆ THỐNG MMO &amp;<br />
                <span style={{ color: "#0066ff" }}>TÀI NGUYÊN SỐ 5.0</span>
              </h1>

              <p style={{
                fontSize: "1.05rem", color: "#64748b", marginBottom: "36px",
                maxWidth: "480px", lineHeight: "1.75",
              }}>
                Nền tảng giao dịch MMO cho Facebook, TikTok, Google Ads — khóa học, dịch vụ, tài nguyên số.
              </p>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/tai-nguyen-mmo" className="btn-canva-outline">
                  <Search size={16} strokeWidth={2} />
                  Khám Phá Tài Nguyên
                </Link>
                <Link href="/khoa-hoc" className="btn-canva-primary">
                  Đăng Ký Khóa Học
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>

            {/* Portrait */}
            <div style={{ flex: "0 0 420px" }} className="hero-image-col anim-scale-in">
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
                    src="/images/hethongmmo.png"
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
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0066ff", lineHeight: 1 }}>98%</div>
                  <div style={{ fontSize: ".7rem", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>Hài lòng</div>
                </div>
                <div style={{
                  position: "absolute", background: "rgba(255,255,255,.96)",
                  backdropFilter: "blur(8px)", borderRadius: "14px", padding: "10px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 3,
                  animation: "float 6s ease-in-out -4s infinite",
                  right: "-40px", bottom: "25%",
                }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0066ff", lineHeight: 1 }}>5+</div>
                  <div style={{ fontSize: ".7rem", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>Năm KN</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ABOUT / EXPERT ────────────────────────────── */}
      <section style={{ padding: "80px 0", background: "#fff", overflow: "hidden" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: "70px", alignItems: "center" }} className="expert-flex">

            <div style={{ flex: "0 0 400px", position: "relative" }} className="anim-slide-left expert-img-col">
              <div style={{
                position: "absolute", inset: "-20px",
                background: "linear-gradient(135deg,rgba(0,102,255,.06),rgba(0,102,255,.03))",
                borderRadius: "50px", zIndex: 0,
              }} />
              <div className="expert-img-hover" style={{
                width: "100%", aspectRatio: "1",
                borderRadius: "30px", position: "relative", zIndex: 1,
                boxShadow: "0 20px 50px rgba(0,0,0,.15)",
                overflow: "hidden", transition: "transform .5s ease",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/Chu Quang Doanh.png"
                  alt="Chu Quang Doanh — Chuyên gia Digital Marketing"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{
                position: "absolute", bottom: "-20px", right: "-20px",
                background: "#fff", borderRadius: "18px", padding: "16px 20px",
                boxShadow: "0 12px 30px rgba(0,0,0,.12)", zIndex: 2,
                textAlign: "center", animation: "float 5s ease-in-out infinite",
              }}>
                <div style={{ fontSize: "2rem", fontWeight: "900", color: "#0066ff", lineHeight: 1 }}>5+</div>
                <div style={{ fontSize: ".7rem", color: "#64748b", fontWeight: "600", marginTop: "4px" }}>Năm kinh nghiệm</div>
              </div>
            </div>

            <div style={{ flex: 1 }} className="anim-slide-right">
              <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: "800", lineHeight: "1.2", marginBottom: "20px", color: "#0f172a" }}>
                CHUYÊN GIA<br />DIGITAL MARKETING
              </h2>
              <p style={{ fontSize: "1.05rem", color: "#64748b", lineHeight: "1.85", marginBottom: "20px" }}>
                Tôi là <strong style={{ color: "#0f172a" }}>Chu Quang Doanh</strong>, với hơn 5 năm kinh nghiệm thực chiến trong việc triển khai các chiến dịch quảng cáo triệu đô trên TikTok và Facebook.
              </p>
              <p style={{ fontSize: "1.05rem", color: "#64748b", lineHeight: "1.85", marginBottom: "20px" }}>
                Sứ mệnh của tôi là giúp các doanh nghiệp SME tối ưu hóa chi phí và bùng nổ doanh số bền vững.
              </p>
              <blockquote style={{
                borderLeft: "4px solid #0066ff",
                padding: "16px 20px",
                background: "rgba(0,102,255,.04)", borderRadius: "0 12px 12px 0",
                fontStyle: "italic", fontSize: "1rem", lineHeight: "1.75", marginBottom: "32px",
                color: "#334155",
              }}>
                &ldquo;Kết quả thực tế của khách hàng chính là thước đo thành công của chúng tôi.&rdquo;
              </blockquote>
              <Link href="/gioi-thieu" className="btn-hero-primary" style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                background: "#0066ff", color: "#fff",
                padding: "15px 36px", borderRadius: "12px",
                fontWeight: "700", fontSize: "1rem", textDecoration: "none",
                transition: "all .3s ease",
              }}>
                Xem thêm về tôi →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── COURSE SLIDER ─────────────────────────────── */}
      <CourseSlider courses={featuredCourses} />

      {/* ── DỊCH VỤ CHUYÊN NGHIỆP CỦA CHÚNG TÔI ─────── */}
      <section style={{ padding: "60px 0", background: "#f8fafc" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
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
                    transition: "all .3s ease",
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
                      <img src={thumb} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
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
        padding: "72px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0" }} className="stats-grid-responsive">
            {STATS.map(({ value, count, suffix, label }, i) => (
              <div
                key={label}
                className="anim-card-in"
                data-d={String(i + 1)}
                style={{
                  textAlign: "center", padding: "40px 24px",
                  cursor: "default",
                  borderLeft: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none",
                }}
              >
                <h3
                  data-count={count !== null ? String(count) : undefined}
                  data-suffix={count !== null ? suffix : undefined}
                  style={{
                    fontSize: "clamp(2rem,3.5vw,3.2rem)", fontWeight: "900",
                    lineHeight: 1, marginBottom: "10px", color: "#fff",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {value}
                </h3>
                <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", fontWeight: "600", letterSpacing: ".8px", textTransform: "uppercase", margin: 0 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATEGORY NAV BAR ──────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#064e3b 0%,#065f46 100%)",
        borderBottom: "2px solid rgba(255,255,255,.1)",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: "1200px", margin: "0 auto",
          display: "flex", alignItems: "center", gap: "0",
          overflowX: "auto",
        }} className="no-scrollbar cat-nav-row">
          <span style={{
            color: "#6ee7b7", fontWeight: "700", fontSize: ".8rem",
            letterSpacing: "1px", textTransform: "uppercase",
            whiteSpace: "nowrap", padding: "14px 20px 14px 0",
            borderRight: "1px solid rgba(255,255,255,.15)", marginRight: "4px", flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: "6px",
          }}>
            <FolderOpen size={14} strokeWidth={1.75} />
            DANH MỤC TÀI NGUYÊN
          </span>
          {[
            { label: "Tất cả sản phẩm", href: "/tai-nguyen-mmo" },
            { label: "Facebook",        href: "/tai-nguyen-mmo?category=Facebook" },
            { label: "Game",            href: "/tai-nguyen-mmo?category=Game" },
            { label: "TikTok",          href: "/tai-nguyen-mmo?category=TikTok" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="cat-nav-link"
              style={{
                color: "rgba(255,255,255,.85)", fontSize: ".875rem", fontWeight: "600",
                padding: "14px 18px", whiteSpace: "nowrap", textDecoration: "none",
                transition: "color .2s ease, background .2s ease",
                borderRadius: "0",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── CATEGORY ICONS ────────────────────────────── */}
      <section style={{ background: "#f8fafc", padding: "40px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}>
            {CATEGORY_ICONS.map(({ label, href, Icon }, i) => (
              <Link
                key={label}
                href={href}
                className="cat-icon-card anim-card-in"
                data-d={String(i + 1)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "10px", padding: "20px 16px",
                  background: "#fff", borderRadius: "16px",
                  border: "1.5px solid #e2e8f0",
                  textDecoration: "none",
                  transition: "all .3s ease",
                  boxShadow: "0 2px 6px rgba(0,0,0,.04)",
                  minWidth: "120px", maxWidth: "160px", flex: "0 0 auto",
                }}
              >
                <div style={{
                  width: "52px", height: "52px", borderRadius: "14px",
                  background: "rgba(0,102,255,.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={26} strokeWidth={1.75} style={{ color: "#0066ff" }} />
                </div>
                <span style={{
                  fontSize: ".72rem", fontWeight: "700", color: "#334155",
                  textAlign: "center", lineHeight: "1.35",
                }}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TUT HOT NHẤT HÔM NAY ──────────────────────── */}
      <section style={{ padding: "60px 0", background: "#fff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Flame size={22} strokeWidth={1.75} style={{ color: "#ef4444", flexShrink: 0 }} />
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                TUT HOT NHẤT HÔM NAY
              </h2>
            </div>
            <Link href="/tut-tricks" style={{
              fontSize: ".875rem", fontWeight: "600", color: "#0066ff",
              textDecoration: "none", border: "1.5px solid #0066ff",
              padding: "7px 18px", borderRadius: "8px", transition: "all .25s ease",
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
                    href={`/tut-tricks`}
                    className="tut-card anim-card-in"
                    data-d={String(i + 1)}
                    style={{
                      display: "flex", flexDirection: "column",
                      background: "#fff", borderRadius: "16px",
                      border: "1.5px solid #e2e8f0",
                      overflow: "hidden", textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,.06)",
                      transition: "all .35s ease",
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
                        <img src={tut.thumbnail} alt={tut.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
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
                          <span style={{ fontSize: ".75rem", fontWeight: "700", color: "#0066ff" }}>{tut.successRate}%</span>
                        </div>
                        <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", background: "#0066ff", borderRadius: "3px",
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
      </section>

      {/* ── SẢN PHẨM MMO NỔI BẬT ─────────────────────── */}
      <section style={{ padding: "60px 0", background: "#f8fafc" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          {/* Section header — left-accent border style (different family from icon+title) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{
              fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", margin: 0,
              paddingLeft: "16px",
              borderLeft: "4px solid #0066ff",
            }}>
              SẢN PHẨM MMO NỔI BẬT
            </h2>
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
                    transition: "all .3s ease",
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
                        <img src={p.imageUrl} alt="" aria-hidden style={{ width: "115%", height: "115%", objectFit: "cover", position: "absolute", inset: "-7.5%", filter: "blur(18px)", opacity: 0.5 }} />
                        {/* Sharp foreground — contain để thấy blur viền */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt={p.name} style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", objectFit: "contain" }} />
                      </>
                    ) : (
                      <Lock size={36} strokeWidth={1.5} style={{ color: "#059669", opacity: 0.65 }} />
                    )}
                    <span style={{
                      position: "absolute", top: "8px", left: "8px", zIndex: 2,
                      background: "#ef4444", color: "#fff",
                      fontSize: ".6rem", fontWeight: "800", padding: "2px 7px", borderRadius: "4px",
                    }}>HOT</span>
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
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: "60px", alignItems: "flex-start" }} className="faq-cta-flex">

            {/* FAQ */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "36px" }}>
                <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: "800", color: "#0f172a", lineHeight: "1.2", margin: 0 }}>
                  CÂU HỎI THƯỜNG GẶP
                </h2>
              </div>
              <FaqAccordion items={FAQ_ITEMS} />
            </div>

            {/* CTA Card */}
            <div style={{ flex: "0 0 340px" }} className="cta-card-col">
              <div style={{
                background: "linear-gradient(135deg,rgba(6,78,59,.93) 0%,rgba(6,95,70,.93) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "24px", padding: "40px 32px",
                boxShadow: "0 20px 50px rgba(6,78,59,.35), 0 1px 0 rgba(255,255,255,.08) inset",
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
                    background: "#FF4500", color: "#fff",
                    padding: "14px 24px", borderRadius: "12px",
                    fontWeight: "700", fontSize: ".95rem", textDecoration: "none",
                    textAlign: "center", transition: "all .3s ease",
                  }} className="cta-btn-green">
                    Đăng ký miễn phí
                  </Link>
                  <Link href="/dich-vu" style={{
                    background: "rgba(255,255,255,.12)", color: "#fff",
                    padding: "14px 24px", borderRadius: "12px",
                    fontWeight: "600", fontSize: ".95rem", textDecoration: "none",
                    textAlign: "center", transition: "all .3s ease",
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
          transition: transform .3s ease, box-shadow .3s ease, animation 0s;
        }
        .btn-hero-primary:hover {
          transform: translateY(-3px) scale(1.02);
          animation: none;
          box-shadow: 0 12px 32px rgba(255,69,0,.45);
        }
        .btn-hero-outline {
          transition: all .3s ease;
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
        .cat-nav-link:hover { color: #fff !important; background: rgba(255,255,255,.1); }
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
        .cta-btn-green:hover { background: #D03A00 !important; transform: translateY(-2px); }
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
          transition: all .22s ease; white-space: nowrap;
        }
        .section-link:hover { background: #0066ff; color: #fff; }

        /* ── Layout ── */
        .hero-inner-flex   { flex-direction: row; }
        .hero-image-col    { display: block; }
        .expert-flex       { flex-direction: row; }
        .expert-img-col    { display: block; }
        .stats-grid-responsive { grid-template-columns: repeat(5,1fr); }
        .grid-3-responsive { grid-template-columns: repeat(3,1fr); }
        .grid-4-responsive { grid-template-columns: repeat(4,1fr); }
        .cat-icons-grid    { grid-template-columns: repeat(8,1fr); }
        .tut-grid          { grid-template-columns: repeat(2,1fr); }
        .product-grid      { grid-template-columns: repeat(3,1fr); }
        .faq-cta-flex      { flex-direction: row; align-items: flex-start; }
        .cta-card-col      { display: block; }
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
          .hero-inner-flex   { gap: 40px; }
          .hero-image-col    { flex: 0 0 320px !important; }
          .expert-flex       { gap: 50px; }
          .expert-img-col    { flex: 0 0 300px !important; }
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
          .hero-inner-flex   { flex-direction: column !important; text-align: center; }
          .hero-image-col    { flex: unset !important; width: 100%; order: -1; }
          .expert-flex       { flex-direction: column !important; }
          .expert-img-col    { flex: unset !important; width: 100%; max-width: 360px; margin: 0 auto; }
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
