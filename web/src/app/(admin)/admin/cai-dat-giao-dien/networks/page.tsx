import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import PageHeroEditor from "../_components/PageHeroEditor";
import NetworksTrustEditor from "./_components/NetworksTrustEditor";
import NetworksKocEditor from "./_components/NetworksKocEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Networks" };

export default async function NetworksEditorPage() {
  const session = await auth();
  requireAdmin(session);

  const [heroData, trustData, kocData] = await Promise.all([
    getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_NETWORKS),
    getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_NETWORKS_TRUST),
    getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.PAGE_NETWORKS_KOC),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">← Cài đặt giao diện</Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Networks</h1>
      </div>

      <PageHeroEditor
        sectionKey={SITE_CONTENT_KEYS.PAGE_NETWORKS}
        initialData={heroData}
        pageLabel="Networks"
        pageUrl="/NetWorks"
      />

      <NetworksTrustEditor initialData={trustData} />

      <NetworksKocEditor initialData={kocData} />
    </div>
  );
}
