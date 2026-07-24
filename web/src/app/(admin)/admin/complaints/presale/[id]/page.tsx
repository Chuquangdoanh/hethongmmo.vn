import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Admin — Chi tiết tin nhắn trước khi mua" };

export default async function AdminPreSaleChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  try { requireStaff(session); } catch { redirect("/"); }
  try { await requirePermission(session, "complaints:read"); } catch { redirect("/admin/complaints"); }

  const chat = await prisma.preSaleChat.findUnique({
    where: { id },
    include: {
      user:   { select: { fullName: true, email: true } },
      seller: { select: { fullName: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!chat) notFound();

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/complaints?tab=presale" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Tin nhắn trước khi mua
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-xs text-gray-500 font-mono">#{id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h2 className="text-sm font-bold text-gray-800">Trò chuyện trước khi mua</h2>
          </div>
          <span className="text-[11px] text-gray-400">
            {(chat.user.fullName ?? chat.user.email)} (Người mua) · {(chat.seller.fullName ?? chat.seller.email)} (Người bán)
          </span>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {chat.messages.length === 0 && (
            <p className="text-sm text-center text-gray-400 py-16">Chưa có tin nhắn nào.</p>
          )}
          {chat.messages.map((msg) => {
            const isBuyer = msg.senderRole === "USER";
            return (
              <div key={msg.id} className={`flex flex-col ${isBuyer ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-gray-500 mb-0.5 font-medium">
                  {msg.senderName} · {isBuyer ? "Người mua" : "Người bán"}
                </span>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                    isBuyer
                      ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                      : "bg-[#7C3AED] text-white rounded-tr-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                  {formatDate(msg.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
