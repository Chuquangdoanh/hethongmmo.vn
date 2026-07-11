import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import NotificationSoundEditor from "./_components/NotificationSoundEditor";

export const metadata: Metadata = { title: "Admin — Âm thanh thông báo" };

export default async function NotificationSoundPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<{ url?: string }>(SITE_CONTENT_KEYS.NOTIFICATION_SOUND);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">
          ← Cài đặt giao diện
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Âm thanh thông báo</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        File âm thanh phát khi: quay lại tab đang mở, bấm nút "Khiếu nại", hoặc có tin nhắn mới trong mục Hỗ trợ.
      </p>
      <NotificationSoundEditor initialUrl={data.url ?? ""} />
    </div>
  );
}
