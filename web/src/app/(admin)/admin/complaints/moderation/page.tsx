import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import ChatModerationClient from "./_components/ChatModerationClient";

export const metadata: Metadata = { title: "Admin — Cài đặt từ cấm chat" };

const CONFIG_KEY = "chat_moderation_config";

export default async function AdminChatModerationPage() {
  const session = await auth();
  try { requireAdmin(session); } catch { redirect("/admin/complaints?tab=violations"); }

  const config = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
    select: { value: true },
  });
  const bannedKeywords = ((config?.value as { bannedKeywords?: string[] } | undefined)?.bannedKeywords) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/complaints?tab=violations" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Vi phạm chat
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt từ cấm trong chat</h1>
        <p className="text-sm text-gray-500 mt-1">
          Số điện thoại luôn tự động bị chặn. Thêm từ khóa bên dưới để chặn thêm (không phân biệt hoa/thường).
        </p>
      </div>

      <ChatModerationClient bannedKeywords={bannedKeywords} />
    </div>
  );
}
