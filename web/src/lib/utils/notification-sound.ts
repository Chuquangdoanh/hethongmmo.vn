import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";

type NotificationSoundContent = { url?: string };

// Lấy URL âm thanh thông báo (CRUD tại /admin/cai-dat-giao-dien/am-thanh-thong-bao).
// Trả về null nếu admin chưa upload — nơi gọi tự quyết định fallback (im lặng hoặc giữ hành vi cũ).
export async function getNotificationSoundUrl(): Promise<string | null> {
  const content = await getSiteContent<NotificationSoundContent>(SITE_CONTENT_KEYS.NOTIFICATION_SOUND);
  return content.url || null;
}
