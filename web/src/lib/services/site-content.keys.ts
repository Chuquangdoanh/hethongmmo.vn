/** Hằng số key CMS — không import server code, an toàn dùng trong Client Component */
export const SITE_CONTENT_KEYS = {
  HOME_HERO:    "home_hero",
  HOME_DJMEDIA: "home_djmedia",
  HOME_TEAM:    "home_team",
  HOME_STATS:   "home_stats",
  HOME_PRESS:   "home_press",
  HOME_BANNERS: "home_banners",
  HOME_FAQ:     "home_faq",
  PAGE_DICH_VU:    "page_dich_vu",
  PAGE_KHOA_HOC:   "page_khoa_hoc",
  PAGE_QUANG_CAO:            "page_quang_cao",
  PAGE_QUANG_CAO_WHY_CHOOSE: "page_quang_cao_why_choose",
  PAGE_TUT_TRICKS: "page_tut_tricks",
  PAGE_TAI_NGUYEN: "page_tai_nguyen",
  PAGE_NETWORKS:       "page_networks",
  PAGE_NETWORKS_TRUST: "page_networks_trust",
  PAGE_NETWORKS_KOC:   "page_networks_koc",
  FOOTER:       "footer",
  THANK_YOU:    "thank_you",
  CONTACT_SUPPORT: "contact_support",
  NOTIFICATION_SOUND: "notification_sound",
} as const;

export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[keyof typeof SITE_CONTENT_KEYS];
