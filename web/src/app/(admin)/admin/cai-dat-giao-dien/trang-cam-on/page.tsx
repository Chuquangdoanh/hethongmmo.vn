import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import ThankYouEditor from "./_components/ThankYouEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Trang Cảm Ơn" };

export default async function ThankYouEditorPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.THANK_YOU);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">
          ← Cài đặt giao diện
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Trang Cảm Ơn</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        Trang hiển thị sau khi khách hàng đặt hàng / thanh toán thành công.
        URL công khai: <code className="bg-gray-100 px-1 rounded text-xs">/cam-on</code>
      </p>
      <ThankYouEditor sectionKey={SITE_CONTENT_KEYS.THANK_YOU} initialData={data} />
    </div>
  );
}
