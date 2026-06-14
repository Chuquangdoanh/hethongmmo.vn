import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import FooterEditor from "./_components/FooterEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Footer" };

export default async function FooterEditorPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.FOOTER);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">
          ← Cài đặt giao diện
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Footer</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        Quản lý toàn bộ nội dung hiển thị trong footer — hiệu lực ngay khi lưu.
      </p>
      <FooterEditor sectionKey={SITE_CONTENT_KEYS.FOOTER} initialData={data} />
    </div>
  );
}
