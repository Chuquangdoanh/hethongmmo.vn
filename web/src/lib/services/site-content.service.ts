import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import type { Prisma } from "@prisma/client";

// ── Content key constants ────────────────────────────────────────────
export const SITE_CONTENT_KEYS = {
  HOME_HERO:    "home_hero",
  HOME_DJMEDIA: "home_djmedia",
  HOME_TEAM:    "home_team",
  HOME_STATS:   "home_stats",
  HOME_PRESS:   "home_press",
  HOME_FAQ:     "home_faq",
  PAGE_DICH_VU:    "page_dich_vu",
  PAGE_KHOA_HOC:   "page_khoa_hoc",
  PAGE_QUANG_CAO:  "page_quang_cao",
  PAGE_TUT_TRICKS: "page_tut_tricks",
  PAGE_TAI_NGUYEN: "page_tai_nguyen",
  PAGE_NETWORKS:   "page_networks",
} as const;

export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[keyof typeof SITE_CONTENT_KEYS];

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
  },
  page_khoa_hoc: {
    badge: "Digital Learning",
    title: "Khóa học Thực chiến MMO 2025",
    subtitle: "",
    description: "Hệ thống khóa học từ cơ bản đến nâng cao, học cùng chuyên gia thực chiến",
    thumbnail: "",
  },
  page_quang_cao: {
    badge: "Quảng cáo",
    title: "Dịch vụ quảng cáo Facebook & TikTok",
    subtitle: "Chuyên nghiệp — Hiệu quả — Tối ưu chi phí",
    description: "Tối ưu ngân sách, tăng ROI. Kinh nghiệm 5 năm, quản lý 50B+ ngân sách quảng cáo.",
    thumbnail: "/images/hethongmmo.png",
  },
  page_tut_tricks: {
    badge: "⚡ KHO TUT TRICK ĐỘC QUYỀN",
    title: "TUT / TRICK",
    titleColor: "#ef4444",
    subtitle: "Cộng Đồng MMO Việt Nam",
    description: "Bí quyết tăng trưởng chiến, kiếm tiền online — tổng hợp độc quyền, cập nhật liên tục từ các chuyên gia.",
    thumbnail: "",
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
    communitySupportText: "HỆ THỐNG MMO - Telegram : @hethongmmo.vn (Hỗ trợ 24/7 mọi ngày)",
    communityGroupLabel: "Cộng Đồng MMO",
    communityGroupDesc: "Nơi giao lưu, chia sẻ kiến thức, tài nguyên và cập nhật các xu hướng mới nhất về MMO, Facebook Ads, Marketing và kiếm tiền online.",
    communityFanpageLabel: "Kênh Fanpage Chính Thức",
    communityFanpageUrl: "https://www.facebook.com/hethongmmo.vn/",
  },
  page_networks: {
    badge: "DNET MEDIA NETWORK",
    title: "Hệ Sinh Thái NETWORK Hỗ Trợ Kiếm Tiền Từ Nội Dung Trên Facebook",
    subtitle: "Hệ sinh thái hỗ trợ kiếm tiền từ nội dung Facebook",
    description: "Trang chính thức cung cấp dịch vụ và thông tin hỗ trợ kiếm tiền nội dung cho Content Creator và KOC.",
    thumbnail: "",
  },
};

// ── Service functions ────────────────────────────────────────────────

export async function getSiteContent<T = unknown>(key: SiteContentKey): Promise<T> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] as T;
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
