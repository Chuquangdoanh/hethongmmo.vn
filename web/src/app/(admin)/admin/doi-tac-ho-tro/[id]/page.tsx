import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { requireStaff, type AuthenticatedUser } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { getNotificationSoundUrl } from "@/lib/utils/notification-sound";
import PartnerChatPanel from "@/components/shared/PartnerChatPanel";
import type { PartnerChatMessage } from "@/components/shared/PartnerChatPanel";

export const metadata: Metadata = { title: "Admin — Chi tiết hỗ trợ đối tác" };

export default async function AdminPartnerSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  try { requireStaff(session); } catch { redirect("/"); }
  try { await requirePermission(session, "partner_support:read"); } catch { redirect("/admin"); }
  const me = session!.user as AuthenticatedUser;

  const { id } = await params;
  const thread = await prisma.partnerSupportThread.findUnique({
    where: { id },
    select: {
      id: true, kind: true, subject: true, providerName: true, status: true, createdAt: true,
      user: { select: { email: true, fullName: true } },
      order: { select: { orderCode: true, itemName: true, finalPrice: true, partnerRefunded: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
      },
    },
  });
  if (!thread) notFound();

  const notificationSoundUrl = await getNotificationSoundUrl();
  const messages: PartnerChatMessage[] = thread.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));

  return (
    <div className="space-y-5">
      <Link href="/admin/doi-tac-ho-tro" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={15} /> Danh sách hỗ trợ đối tác
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat */}
        <div className="lg:col-span-2">
          <PartnerChatPanel
            threadId={thread.id}
            currentUserId={me.id}
            isAdmin
            canRefund={thread.kind === "ORDER" && !!thread.order}
            providerName={thread.providerName}
            subject={thread.subject}
            initialMessages={messages}
            initialStatus={thread.status}
            notificationSoundUrl={notificationSoundUrl}
          />
        </div>

        {/* Order info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {thread.kind === "PRESALE" ? "Tư vấn trước mua" : "Thông tin đơn"}
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                thread.kind === "PRESALE" ? "bg-amber-100 text-amber-700" : "bg-[#0d9488]/10 text-[#0d9488]"
              }`}>
                {thread.kind === "PRESALE" ? "Tư vấn" : "Hỗ trợ đơn"}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><span className="text-gray-500">Gian hàng</span><span className="font-semibold text-gray-900">{thread.providerName}</span></div>
              {thread.order ? (
                <>
                  <div className="flex justify-between gap-2"><span className="text-gray-500">Mã đơn</span><span className="font-mono text-gray-900">#{thread.order.orderCode}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-gray-500">Sản phẩm</span><span className="text-gray-900 text-right max-w-[60%] truncate">{thread.order.itemName}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-gray-500">Giá</span><span className="font-semibold text-emerald-600">{formatVnd(Number(thread.order.finalPrice))}</span></div>
                </>
              ) : (
                <div className="flex justify-between gap-2"><span className="text-gray-500">Loại</span><span className="text-gray-900">Chưa mua — tư vấn</span></div>
              )}
              <div className="flex justify-between gap-2"><span className="text-gray-500">Người mua</span><span className="text-gray-900 text-right">{thread.user.fullName}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500">Email</span><span className="text-gray-900 text-right text-xs">{thread.user.email}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500">Ngày tạo</span><span className="text-gray-900 text-xs">{formatDate(thread.createdAt)}</span></div>
            </div>
          </div>

          {thread.kind === "ORDER" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-800 mb-1">💡 Về hoàn tiền</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Bấm &quot;Hoàn tiền&quot; sẽ hoàn tiền vào ví người mua từ hệ thống. Đơn hàng <strong>vẫn giữ trạng thái hoàn tất</strong> — doanh thu &amp; lợi nhuận không bị trừ.
                {thread.order?.partnerRefunded && <span className="block mt-1 font-bold">✓ Đơn này đã được hoàn tiền.</span>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
