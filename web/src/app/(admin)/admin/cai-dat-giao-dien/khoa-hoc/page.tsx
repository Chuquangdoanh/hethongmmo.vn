import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import PageHeroEditor from "../_components/PageHeroEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Khóa học" };

export default async function KhoaHocEditorPage() {
  const session = await auth();
  requireAdmin(session);
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_KHOA_HOC);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">← Cài đặt giao diện</Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Khóa học</h1>
      </div>
      <PageHeroEditor sectionKey={SITE_CONTENT_KEYS.PAGE_KHOA_HOC} initialData={data} pageLabel="Khóa học" pageUrl="/khoa-hoc" enableCarousel />
    </div>
  );
}
