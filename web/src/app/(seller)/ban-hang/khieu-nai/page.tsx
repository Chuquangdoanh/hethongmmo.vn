import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import { MessageCircleWarning, ChevronRight, MessageSquare } from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";

export const metadata: Metadata = { title: "Khiếu nại — Nhà bán hàng" };

const STATUS_LABEL: Record<string, string> = {
  OPEN:      "Mở",
  IN_REVIEW: "Đang xem xét",
  RESOLVED:  "Hoàn thành",
  REJECTED:  "Đóng băng",
};

const STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-red-50 text-red-600 border-red-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:  "bg-red-50 text-red-600 border-red-200",
};

export default async function SellerKhieuNaiPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const sellerOrderIds = (
    await prisma.order.findMany({
      where: { sellerId: me.id },
      select: { id: true },
    })
  ).map((o) => o.id);

  const complaints = await prisma.complaint.findMany({
    where: { orderId: { in: sellerOrderIds } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true } },
      chatRoom: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { senderName: true, content: true, createdAt: true },
          },
        },
      },
    },
  });

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="complaints" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <MessageCircleWarning size={17} className="text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Khiếu nại</h1>
                <p className="text-sm text-gray-500 mt-0.5">Khiếu nại từ khách hàng về sản phẩm của bạn</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">{complaints.length} khiếu nại</span>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm text-center py-16">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircleWarning size={22} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">Chưa có khiếu nại nào</p>
              <p className="text-xs text-gray-400 mt-1">Tiếp tục duy trì chất lượng sản phẩm tốt nhé!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => {
                const lastMsg = c.chatRoom?.messages[0];
                const statusCls = STATUS_CLS[c.status] ?? STATUS_CLS["OPEN"]!;
                return (
                  <Link
                    key={c.id}
                    href={`/ban-hang/khieu-nai/${c.id}`}
                    className="block rounded-2xl border border-gray-100 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.subject}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCls}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                          {c.status === "RESOLVED" ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✅ Hoàn thành
                            </span>
                          ) : c.status === "REJECTED" ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                              ✕ Từ chối
                            </span>
                          ) : c.chatRoom ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                              <MessageSquare size={9} /> Đang trò chuyện
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Từ: {c.user.fullName ?? c.user.email} · {formatDate(c.createdAt)}
                        </p>
                        {lastMsg ? (
                          <p className="text-xs text-gray-500 mt-1.5 truncate">
                            <span className="font-medium">{lastMsg.senderName}:</span> {lastMsg.content}
                          </p>
                        ) : c.status === "REJECTED" ? (
                          <p className="text-xs text-red-500 mt-1.5">Khiếu nại đã bị từ chối</p>
                        ) : c.status === "RESOLVED" ? (
                          <p className="text-xs text-emerald-600 mt-1.5">Khiếu nại đã được giải quyết</p>
                        ) : c.chatRoom ? (
                          <p className="text-xs text-gray-400 mt-1.5">Chưa có tin nhắn nào</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1.5">⏳ Hệ Thống MMO đang xử lý</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-violet-500 shrink-0 mt-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
