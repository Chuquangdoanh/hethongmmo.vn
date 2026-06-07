import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  MessageCircle, MessageSquare, Lock, Clock, ChevronRight,
} from "lucide-react";
import UserProfileHero from "@/components/shared/UserProfileHero";

export const metadata: Metadata = { title: "Trò chuyện khiếu nại" };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Mở", IN_REVIEW: "Đang xem xét", RESOLVED: "Từ chối", REJECTED: "Hoàn thành",
};
const STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-red-50 text-red-600 border-red-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:  "bg-gray-50 text-gray-500 border-gray-200",
  REJECTED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default async function TroChuyenPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [user, lastDeposit, complaints] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        balance: true, totalDeposited: true, totalSpent: true,
        uidPrefix: true, fullName: true, email: true, role: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId: me.id, type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] as never[] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.complaint.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      include: {
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
    }),
  ]);

  if (!user) return null;

  const orderIds = complaints.map((c) => c.orderId).filter((id): id is string => Boolean(id));
  const orders = orderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: orderIds }, userId: me.id },
        select: { id: true, orderCode: true, itemName: true, finalPrice: true },
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  return (
    <>
      <UserProfileHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        uidPrefix={user.uidPrefix}
        balance={Number(user.balance)}
        totalDeposited={Number(user.totalDeposited)}
        totalSpent={Number(user.totalSpent)}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="chat"
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <MessageCircle size={17} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Trò chuyện khiếu nại</h1>
                <p className="text-sm text-gray-500 mt-0.5">Theo dõi và trao đổi về các đơn hàng đã khiếu nại</p>
              </div>
            </div>
            <span className="text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-lg">
              {complaints.length} khiếu nại
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm text-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs text-gray-400 mt-1">Khiếu nại đơn hàng để bắt đầu trò chuyện với đội ngũ hỗ trợ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => {
                const order = c.orderId ? orderMap.get(c.orderId) : null;
                const lastMsg = c.chatRoom?.messages[0];
                const statusCls = STATUS_CLS[c.status] ?? STATUS_CLS["OPEN"]!;
                const isClosed = c.status === "RESOLVED" || c.status === "REJECTED";

                return (
                  <Link
                    key={c.id}
                    href={`/tro-chuyen/${c.id}`}
                    className="block rounded-2xl border border-gray-100 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Product name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {order?.itemName ?? "Đơn hàng"}
                          </p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCls}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                          {c.chatRoom && isClosed ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                              <Lock size={9} /> Đã kết thúc
                            </span>
                          ) : c.chatRoom ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                              <MessageSquare size={9} /> Đang trò chuyện
                            </span>
                          ) : isClosed ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                              <Lock size={9} /> Đã xử lý
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock size={9} /> Vui lòng chờ
                            </span>
                          )}
                        </div>

                        {/* Price + order code + time */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {order && (
                            <span className="text-xs font-semibold text-emerald-600">
                              {formatVnd(Number(order.finalPrice))}
                            </span>
                          )}
                          {order && (
                            <span className="text-[11px] text-gray-400">#{order.orderCode}</span>
                          )}
                          <span className="text-[11px] text-gray-400">{formatDate(c.createdAt)}</span>
                        </div>

                        {/* Complaint subject */}
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Lý do:</span> {c.subject}
                        </p>

                        {/* Last message preview */}
                        {lastMsg ? (
                          <p className="text-xs text-gray-500 mt-1.5 truncate">
                            <span className="font-medium">{lastMsg.senderName}:</span> {lastMsg.content}
                          </p>
                        ) : c.chatRoom ? (
                          <p className="text-xs text-gray-400 mt-1.5">Chưa có tin nhắn nào</p>
                        ) : isClosed ? (
                          <p className="text-xs text-gray-500 mt-1.5">Khiếu nại đã được xử lý bởi bộ phận hỗ trợ.</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                            <Clock size={10} /> Hệ Thống MMO đang xác minh đơn hàng của bạn, vui lòng chờ đợi...
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-blue-500 shrink-0 mt-0.5" />
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
