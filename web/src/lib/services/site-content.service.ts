import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import type { Prisma } from "@prisma/client";
export { SITE_CONTENT_KEYS } from "./site-content.keys";
export type { SiteContentKey } from "./site-content.keys";
import type { SiteContentKey } from "./site-content.keys";

// ── Default content ──────────────────────────────────────────────────
const DEFAULTS: Record<SiteContentKey, unknown> = {
  home_hero: {
    badge: "Hệ thống MMO & Tài nguyên số 5.0 chính thức ra mắt",
    title: "HỆ THỐNG MMO &\nTÀI NGUYÊN SỐ 5.0",
    description: "Nền tảng hàng đầu Việt Nam cho Facebook, TikTok, Google Ads. Hơn 59.000 khách hàng tin dùng dịch vụ, tài nguyên và khóa học thực chiến.",
    imageUrl: "/images/hethongmmo.png",
    chip1Value: "99.9%",
    chip1Label: "Hài lòng",
    chip2Value: "7+",
    chip2Label: "Năm KN",
    btn1Text: "Khám Phá Tài Nguyên",
    btn1Href: "/tai-nguyen-mmo",
    btn2Text: "Đăng Ký Khóa Học",
    btn2Href: "/khoa-hoc",
  },
  home_djmedia: {
    companyTitle: "CÔNG TY TNHH DJ MEDIA &\nSUPPORT MẠNG XÃ HỘI",
    imageUrl: "/images/dj-media-classroom.jpg",
    yearsExpValue: "7+",
    yearsExpLabel: "Năm Kinh Nghiệm Thực Chiến",
    description: "Đội ngũ chuyên nghiệp với 7 năm kinh nghiệm thực chiến trong lĩnh vực dịch vụ mạng xã hội: hỗ trợ Facebook, TikTok, Google, chạy quảng cáo ADS, khai thác Adbreak và đào tạo học viên. Đơn vị tiên phong tại Việt Nam với 2 chi nhánh tại Hà Nội và Hà Tĩnh.",
    hotlineLabel: "Hotline (CEO – Phạm Hữu Dũng)",
    hotlineNumber: "0828.118.789",
    socialFacebook: "https://facebook.com",
    socialTiktok: "https://tiktok.com",
    socialInstagram: "https://instagram.com",
    socialZalo: "https://zalo.me",
    socialYoutube: "https://youtube.com",
  },
  home_team: {
    sectionLabel: "Ban lãnh đạo",
    sectionTitle: "Giám Đốc & Điều hành Hệ Thống MMO",
    members: [
      {
        name: "Phạm Hữu Dũng",
        title: "CEO & Chuyên gia Digital Marketing",
        imageUrl: "/images/phamhuudung.jpg",
        badgeValue: "7+",
        badgeLabel: "Năm KN",
        badgeColor: "#0066ff",
        bio1: "Sở hữu hơn 7 năm kinh nghiệm triển khai các chiến dịch quảng cáo triệu đô trên TikTok, Facebook và Google Ads, Phạm Hữu Dũng là người định hình chiến lược tăng trưởng sau thành công của DJ Media. Tính đến nay, anh cùng các cộng sự đã xây dựng hệ sinh thái MMO toàn diện, phục vụ hơn 59.000 khách hàng, xử lý trên 363.000 giao dịch thành công và đồng hành dẫn dắt 7.900+ học viên bứt phá thu nhập trong không gian số.",
        bio2: "Với mô hình 2 chi nhánh tiên phong tại Hà Nội và Hà Tĩnh, anh cam kết mang lại những giải pháp marketing thực chiến và tối ưu chi phí tốt nhất cho doanh nghiệp.",
        quote: "Kết quả thực tế của khách hàng chính là thước đo thành công của chúng tôi.",
      },
      {
        name: "Chu Quang Doanh",
        title: "Đồng sáng lập & Điều hành Hệ Thống MMO",
        imageUrl: "/images/Chu Quang Doanh.png",
        badgeValue: "59K+",
        badgeLabel: "Khách hàng",
        badgeColor: "#f59e0b",
        bio1: "Xây dựng và vận hành Hệ Thống MMO phục vụ hơn 59.000 khách hàng, xử lý hơn 363.000 giao dịch — từ tài khoản số, TUT MMO đến khóa học và quảng cáo ADS.",
        bio2: "",
        quote: "chúng tôi xây dựng hệ thống này không chỉ để kinh doanh — mà để tạo ra một hệ sinh thái nơi mọi người có thể học, làm và phát triển cùng nhau.",
      },
    ],
  },
  home_stats: {
    stats: [
      { value: "59.639+", count: 59639, suffix: "+", label: "Khách hàng" },
      { value: "363.921+", count: 363921, suffix: "+", label: "Đơn giao dịch" },
      { value: "7.926+", count: 7926, suffix: "+", label: "Học viên" },
      { value: "99.9%", count: 99.9, suffix: "%", label: "Tỉ lệ hài lòng" },
      { value: "24/7", count: null, suffix: "", label: "Hỗ trợ" },
    ],
  },
  home_press: {
    badge: "Truyền thông",
    title: "BÁO CHÍ NÓI GÌ VỀ CHÚNG TÔI",
    subtitle: "Hơn 50+ bài báo truyền thông uy tín đã đưa tin\nvề hệ sinh thái MMO và những giá trị chúng tôi mang lại",
    cards: [
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
    ],
  },
  home_faq: {
    title: "CÂU HỎI THƯỜNG GẶP",
    items: [
      { q: "Dịch vụ của website có uy tín không?", a: "Chúng tôi cam kết về chất lượng và tối ưu hóa các chỉ số chuyển đổi thực tế để mang lại kết quả tốt nhất cho bạn." },
      { q: "Thời gian xử lý đơn hàng là bao lâu?", a: "Hầu hết đơn dịch vụ được xử lý tự động trong vòng 1–24 giờ sau khi thanh toán thành công." },
      { q: "Nạp tiền bằng phương thức nào?", a: "Hỗ trợ chuyển khoản ngân hàng qua SePay — hệ thống tự động nhận và cộng tiền ngay lập tức." },
      { q: "Có hỗ trợ sau khi mua hàng không?", a: "Có. Chúng tôi hỗ trợ 24/7 qua Telegram và Zalo. Với khóa học có bảo hành trọn đời." },
      { q: "Tôi có cần kinh nghiệm trước không?", a: "Không cần. Khóa học được thiết kế từ cơ bản đến nâng cao, có kèm mentoring cá nhân." },
      { q: "Chính sách hoàn tiền như thế nào?", a: "Dịch vụ không hoàn tiền sau khi xử lý. Khóa học hoàn 100% trong 7 ngày nếu chưa truy cập." },
    ],
  },
  page_dich_vu: {
    badge: "Dịch vụ",
    title: "Đăng ký dịch vụ ngay",
    subtitle: "",
    description: "Chọn dịch vụ bạn cần và điền thông tin để được hỗ trợ nhanh chóng",
    thumbnail: "",
    titleAccentColor: "#EF4444",
  },
  page_khoa_hoc: {
    badge: "Digital Learning",
    title: "Khóa học Thực chiến MMO 2025",
    subtitle: "",
    description: "Hệ thống khóa học từ cơ bản đến nâng cao, học cùng chuyên gia thực chiến",
    thumbnail: "",
    titleAccentColor: "#7c3aed",
  },
  page_quang_cao: {
    badge: "Quảng cáo",
    title: "Dịch vụ quảng cáo Facebook & TikTok",
    subtitle: "Chuyên nghiệp — Hiệu quả — Tối ưu chi phí",
    description: "Tối ưu ngân sách, tăng ROI. Kinh nghiệm 5 năm, quản lý 50B+ ngân sách quảng cáo.",
    thumbnail: "/images/hethongmmo.png",
    titleAccentColor: "#f97316",
  },
  page_quang_cao_why_choose: {
    sectionLabel: "Lý do chọn chúng tôi",
    subtitle: "Chất lượng tạo nên uy tín",
    bullets: [
      "Kinh nghiệm thực chiến 5 năm",
      "Cam kết hiệu quả tối ưu theo CPA/ROI",
      "Chi phí dịch vụ cạnh tranh nhất thị trường",
      "Hỗ trợ 1-1, xử lý sự cố tức thì 24/7",
    ],
    stats: [
      { value: "50B+", label: "NGÂN SÁCH ĐÃ QUẢN LÝ" },
      { value: "1.200+", label: "CHIẾN DỊCH THÀNH CÔNG" },
      { value: "350%", label: "LỢI NHUẬN TRUNG BÌNH" },
    ],
    statsBgImage: "",
  },
  page_tut_tricks: {
    badge: "⚡ KHO TUT TRICK ĐỘC QUYỀN",
    title: "TUT / TRICK",
    titleColor: "#ef4444",
    subtitle: "Cộng Đồng MMO Việt Nam",
    description: "Bí quyết tăng trưởng chiến, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia.",
    thumbnail: "",
    titleAccentColor: "#f59e0b",
  },
  page_tai_nguyen: {
    badge: "Tài nguyên MMO",
    title: "Kho Tài Nguyên MMO",
    subtitle: "",
    description: "Tool, tài khoản, dịch vụ số — marketplace an toàn, giao hàng tự động, bảo hành uy tín.",
    thumbnail: "",
    communityTitle: "CỘNG ĐỒNG MMO — HỆ THỐNG MMO 5.0",
    communityTelegramLabel: "Nhóm Telegram – Cộng đồng Update Biến Chuyển Meta",
    communityTelegramUrl: "https://t.me/hethongmmovn",
    communitySupportLabel: "Chăm sóc khách hàng",
    communitySupportText: '["HỆ THỐNG MMO"] - Telegram : @hethongmmo.vn (Hỗ trợ 24/7 mọi ngày)',
    communityGroupLabel: "Cộng Đồng MMO",
    communityGroupDesc: "Nơi giao lưu, chia sẻ kiến thức, tài nguyên và cập nhật các xu hướng mới nhất về MMO, Facebook Ads, Marketing và kiếm tiền online.",
    communityFanpageLabel: "Kênh Fanpage Chính Thức",
    communityFanpageUrl: "https://www.facebook.com/hethongmmo.vn/",
    communityAccentColor: "#0066ff",
    communityHighlightColor: "#f97316",
    // Sidebar contact card (nguoi-ban + he-thong pages)
    contactTitle: "Chăm sóc khách hàng Hệ Thống MMO",
    contactTelegramUrl: "https://t.me/BossMeta789",
    contactTelegramLabel: "@BossMeta789",
    contactFacebookUrl: "https://www.facebook.com/Chu.Quang.Doanh.Media88/",
    contactFacebookLabel: "HỆ THỐNG MMO",
    contactHours: "08:00 – 23:00 hàng ngày",
  },
  page_networks: {
    badge: "DNET MEDIA NETWORK",
    title: "Hệ Sinh Thái NETWORK Hỗ Trợ Kiếm Tiền Từ Nội Dung Trên Facebook",
    subtitle: "Hệ sinh thái hỗ trợ kiếm tiền từ nội dung Facebook",
    description: "Trang chính thức cung cấp dịch vụ và thông tin hỗ trợ kiếm tiền nội dung cho Content Creator và KOC.",
    thumbnail: "",
    titleAccentColor: "#0066ff",
  },
  page_networks_trust: {
    sectionTitle: "Cam kết uy tín và bảo mật",
    sideImage: "/images/dj-media-classroom.jpg",
    trustPoints: [
      "Kinh nghiệm thực chiến trong lĩnh vực nội dung",
      "Support 24/7 cho các đối tác của Network",
      "Giải pháp thanh toán an toàn, minh bạch",
      "Mở rộng mạng lưới KOC và Brand uy tín",
    ],
  },
  page_networks_koc: {
    sectionLabel: "THƯ VIỆN HÌNH ẢNH",
    sectionTitle: "Đối Tác KOC tiêu biểu",
    items: [
      { label: "IDOLS SÁNG CON TV", sub: "100.000k Followers", src: "/images/sangcon.jpg" },
      { label: "IDLOS VIỆT XĂM",    sub: "100.000K Followers", src: "/images/vietxam.jpg" },
      { label: "Đối Tác Kiên Love", sub: "54.000K Followers",  src: "/images/kienlove.jpg" },
    ],
  },
  footer: {
    // CTA Banner
    ctaTitle: "Sẵn sàng phát triển hệ thống MMO của bạn?",
    ctaSubtitle: "Tham gia hệ sinh thái đào tạo, dịch vụ MXH và marketplace uy tín.",
    ctaBtn1Text: "Khám phá dịch vụ",
    ctaBtn1Href: "/dich-vu",
    ctaBtn2Text: "Nhận tư vấn",
    ctaBtn2Href: "https://facebook.com/hethongmmovn/",
    // Brand
    brandDesc: "Nền tảng MMO số 1 Việt Nam — dịch vụ MXH, khóa học, tài nguyên và marketplace an toàn, uy tín, chất lượng.",
    // Social links
    socialFacebook: "https://www.facebook.com/Chu.Quang.Doanh.Media88/",
    socialTiktok: "https://www.tiktok.com/@chuquangdoanhmmo",
    socialYoutube: "https://www.youtube.com/@ChuQuangDoanh",
    socialTelegram: "https://t.me/BossMeta789",
    socialZalo: "https://zalo.me/0393118789",
    // Stats cards
    stat1Value: "10.000+", stat1Label: "Học viên tin tưởng",
    stat2Value: "100%",    stat2Label: "An toàn, bảo mật",
    stat3Value: "24/7",    stat3Label: "Hỗ trợ tận tâm",
    // Services links (JSON array)
    serviceLinks: [
      { href: "/dich-vu",        label: "Dịch vụ MXH" },
      { href: "/khoa-hoc",       label: "Khóa học MMO" },
      { href: "/tai-nguyen-mmo", label: "Tài nguyên MMO" },
      { href: "/quang-cao",      label: "Quảng cáo" },
      { href: "/tut-tricks",     label: "Tut/Tools MMO" },
    ],
    // Support links (JSON array)
    supportLinks: [
      { href: "/",                         label: "Trang chủ" },
      { href: "/dieu-khoan",               label: "Điều khoản dịch vụ" },
      { href: "/chinh-sach",               label: "Chính sách bảo mật" },
      { href: "/chinh-sach-nha-ban-hang",  label: "Chính sách nhà bán hàng" },
    ],
    // Contact
    contactPhone: "0393.118.789",
    contactEmail: "chudoanhofficial@gmail.com",
    contactAddress: "Hà Nội, Việt Nam",
    contactHours: "Thứ 2 - Chủ nhật: 8:00 - 23:00",
    contactTelegramHref: "https://t.me/BossMeta789",
    contactTelegramLabel: "Hỗ trợ nhanh qua Telegram",
    contactTelegramSub: "Phản hồi trong vài phút",
    // Copyright
    copyrightText: "© 2026 hethongmmo.vn. Tất cả quyền được bảo lưu.",
    // Bộ Công Thương
    bctHref: "",
  },
  thank_you: {
    title: "Cảm ơn bạn đã tin tưởng!",
    subtitle: "Đơn hàng của bạn đã được ghi nhận thành công.",
    message: "Chúng tôi đang xử lý đơn hàng của bạn. Bạn sẽ nhận được thông báo qua email hoặc Telegram trong thời gian sớm nhất.",
    badge: "Thành công",
    iconType: "check",
    btn1Text: "Về trang chủ",
    btn1Href: "/",
    btn2Text: "Xem đơn hàng",
    btn2Href: "/don-hang",
    supportTitle: "Cần hỗ trợ?",
    supportDesc: "Liên hệ với chúng tôi qua Telegram hoặc Zalo — phản hồi trong vài phút.",
    telegramHref: "https://t.me/BossMeta789",
    telegramLabel: "Chat Telegram ngay",
    zaloHref: "https://zalo.me/0393118789",
    zaloLabel: "Chat Zalo ngay",
  },
  contact_support: {
    buttonLabel: "Liên hệ hỗ trợ",
    items: [
      { platform: "facebook", title: "Facebook Support", subtitle: "Fanpage hỗ trợ 24/7",       href: "https://facebook.com/chuquangdoanh", bgColor: "#1877F2" },
      { platform: "zalo",     title: "Zalo Community",  subtitle: "Kết nối cộng đồng Zalo",    href: "https://zalo.me/0000000000",         bgColor: "#0068FF" },
      { platform: "tiktok",   title: "TikTok Channel",  subtitle: "Video & Livestream",         href: "https://tiktok.com/@chuquangdoanh", bgColor: "#010101" },
      { platform: "telegram", title: "Telegram Group",  subtitle: "Kết nối với cộng đồng",     href: "https://t.me/chuquangdoanh",        bgColor: "#0088CC" },
    ],
  },
};

// ── Service functions ────────────────────────────────────────────────

export async function getSiteContent<T = unknown>(key: SiteContentKey): Promise<T> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] as T;
  const def = DEFAULTS[key];
  if (def && typeof def === "object" && !Array.isArray(def) && typeof row.content === "object" && row.content !== null && !Array.isArray(row.content)) {
    return { ...def, ...(row.content as object) } as T;
  }
  return row.content as T;
}

export async function getAllSiteContent(): Promise<Record<string, unknown>> {
  const rows = await prisma.siteContent.findMany();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.content;
  }
  return result;
}

export async function upsertSiteContent(
  key: SiteContentKey,
  content: unknown,
  actorId: string
): Promise<void> {
  const before = await prisma.siteContent.findUnique({ where: { key } });

  await prisma.siteContent.upsert({
    where: { key },
    create: { key, content: content as Parameters<typeof prisma.siteContent.create>[0]["data"]["content"], updatedById: actorId },
    update: { content: content as Parameters<typeof prisma.siteContent.update>[0]["data"]["content"], updatedById: actorId },
  });

  await writeAuditLog({
    actorId,
    action: "UPDATE_SITE_CONTENT",
    targetType: "SiteContent",
    targetId: key,
    before: (before?.content ?? undefined) as Prisma.InputJsonObject | undefined,
    after: content as Prisma.InputJsonObject,
  });
}

export function getDefault<T = unknown>(key: SiteContentKey): T {
  return DEFAULTS[key] as T;
}
