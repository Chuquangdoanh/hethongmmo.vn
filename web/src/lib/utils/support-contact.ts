import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";

type ContactSupportContent = {
  quickButtons?: { id: string; label: string; href: string }[];
};

const DEFAULT_TELEGRAM_HREF = "https://t.me/BossMeta789";

// Lấy link Telegram hỗ trợ từ CMS (fallback về mặc định nếu chưa cấu hình).
export async function getSupportTelegramHref(): Promise<string> {
  const contact = await getSiteContent<ContactSupportContent>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);
  return contact.quickButtons?.find((b) => b.id === "telegram")?.href ?? DEFAULT_TELEGRAM_HREF;
}

// Lấy link Zalo liên hệ cho nút "Khiếu nại" của đơn hàng Hệ thống (MMO_PRODUCT) /
// KhuongFB (KHUONGFB_PRODUCT) — 2 loại đơn không có seller thật nên không dùng được
// luồng khiếu nại/chat. CRUD tại quickButtons id "khieu-nai-he-thong" trong
// /admin/cai-dat-giao-dien/lien-he-ho-tro.
export async function getSystemOrderComplaintHref(): Promise<string | null> {
  const contact = await getSiteContent<ContactSupportContent>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);
  return contact.quickButtons?.find((b) => b.id === "khieu-nai-he-thong")?.href ?? null;
}
