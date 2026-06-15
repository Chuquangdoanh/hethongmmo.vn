import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import ContactSupportEditor from "./_components/ContactSupportEditor";

export const metadata: Metadata = { title: "Admin — Cài đặt Liên hệ hỗ trợ" };

export default async function ContactSupportPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">
          ← Cài đặt giao diện
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Liên hệ hỗ trợ</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        Popup nút liên hệ cố định góc phải màn hình trên toàn bộ trang public.
      </p>
      <ContactSupportEditor initialData={data} />
    </div>
  );
}
