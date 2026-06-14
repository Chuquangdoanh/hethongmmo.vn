import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import PageHeroEditor from "../_components/PageHeroEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Dịch vụ" };

export default async function DichVuEditorPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_DICH_VU);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">← Cài đặt giao diện</Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Dịch vụ</h1>
      </div>
      <PageHeroEditor sectionKey={SITE_CONTENT_KEYS.PAGE_DICH_VU} initialData={data} pageLabel="Dịch vụ" pageUrl="/dich-vu" />
    </div>
  );
}
