import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { getAllSiteContent } from "@/lib/services/site-content.service";
import HomeHeroEditor from "./_components/HomeHeroEditor";
import HomeDJMediaEditor from "./_components/HomeDJMediaEditor";
import HomeTeamEditor from "./_components/HomeTeamEditor";
import HomeStatsEditor from "./_components/HomeStatsEditor";
import HomePressEditor from "./_components/HomePressEditor";
import HomeFaqEditor from "./_components/HomeFaqEditor";

export const metadata: Metadata = { title: "Admin — Giao diện Trang chủ" };

export default async function TrangChuEditorPage() {
  const session = await auth();
  requireAdmin(session);

  const all = await getAllSiteContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cai-dat-giao-dien" className="text-sm text-blue-600 hover:underline">
          ← Cài đặt giao diện
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Trang chủ</h1>
      </div>

      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        Sau khi lưu, nội dung sẽ cập nhật tự động trên trang public sau tối đa 60 giây (ISR cache).
      </div>

      <HomeDJMediaEditor initialData={all["home_djmedia"] as Record<string, unknown>} />
      <HomeHeroEditor initialData={all["home_hero"] as Record<string, unknown>} />
      <HomeTeamEditor initialData={all["home_team"] as Record<string, unknown>} />
      <HomeStatsEditor initialData={all["home_stats"] as Record<string, unknown>} />
      <HomePressEditor initialData={all["home_press"] as Record<string, unknown>} />
      <HomeFaqEditor initialData={all["home_faq"] as Record<string, unknown>} />
    </div>
  );
}
