import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  MessageCircle, MessageSquare, Lock, Clock, ChevronRight,
} from "lucide-react";
import UserProfileHero from "@/components/shared/UserProfileHero";

export const metadata: Metadata = { title: "Ticket hỗ trợ" };

const STATUS_LABEL: Record<string, string> = {
  OPEN:      "Chờ xử lý",
  IN_REVIEW: "Đang xử lý",
  RESOLVED:  "Đã hoàn thành",
  REJECTED:  "Đã đóng",
};
const STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW: "bg-blue-50 text-blue-600 border-blue-200",
  RESOLVED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:  "bg-gray-50 text-gray-500 border-gray-200",
};

export default async function TroChuyenPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [user, lastDeposit, complaints] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        balance: true, totalDeposited: true, totalSpent: true,
        uidPrefix: true, fullName: true, email: true, role: true, avatarUrl: true,
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
            participants: {
              where: { label: "Admin" },
              select: { user: { select: { fullName: true } } },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  if (!user) redirect("/");

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
        avatarUrl={user.avatarUrl ?? null}
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
                <h1 className="text-xl font-bold text-gray-900">Ticket hỗ trợ</h1>
                <p className="text-sm text-gray-500 mt-0.5">Theo dõi và trao đổi về các đơn hàng đã khiếu nại</p>
              </div>
            </div>
            <span className="text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-lg">
              {complaints.length} khiếu nại
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm text-center py-16">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={24} className="text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Chưa có ticket nào</p>
              <p className="text-xs text-gray-400 mt-1">Khiếu nại đơn hàng để tạo ticket hỗ trợ với đội ngũ của chúng tôi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => {
                const order = c.orderId ? orderMap.get(c.orderId) : null;
                const lastMsg = c.chatRoom?.messages[0];
                const statusCls = STATUS_CLS[c.status] ?? STATUS_CLS["OPEN"]!;
                const isClosed = c.status === "RESOLVED" || c.status === "REJECTED";
                const adminHandler = c.chatRoom?.participants[0]?.user.fullName;
                const ticketCode = `#TK-${c.id.slice(0, 8).toUpperCase()}`;

                return (
                  <Link
                    key={c.id}
                    href={`/tro-chuyen/${c.id}`}
                    className="block rounded-2xl border border-gray-100 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Ticket code + status badge */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {ticketCode}
                          </span>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                          {c.chatRoom && isClosed ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                              <Lock size={9} /> Đã đóng
                            </span>
                          ) : c.chatRoom ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                              <MessageSquare size={9} /> Đang xử lý
                            </span>
                          ) : isClosed ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                              <Lock size={9} /> Đã hoàn tất
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock size={9} /> Chờ phản hồi
                            </span>
                          )}
                        </div>

                        {/* Complaint subject (title) */}
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.subject}</p>

                        {/* Price + order code + timestamps */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {order && (
                            <>
                              <span className="text-xs font-semibold text-emerald-600">
                                {formatVnd(Number(order.finalPrice))}
                              </span>
                              <span className="text-[11px] text-gray-400">Đơn #{order.orderCode}</span>
                            </>
                          )}
                          <span className="text-[11px] text-gray-400">Tạo: {formatDate(c.createdAt)}</span>
                          {c.updatedAt > c.createdAt && (
                            <span className="text-[11px] text-gray-400">· Cập nhật: {formatDate(c.updatedAt)}</span>
                          )}
                        </div>

                        {/* Handler + last message */}
                        <div className="mt-2 flex items-start justify-between gap-2 flex-wrap">
                          {adminHandler ? (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <span className="font-medium text-gray-600">Phụ trách:</span> {adminHandler}
                            </p>
                          ) : (
                            <span />
                          )}
                        </div>

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
                      <ChevronRight size={16} className="text-blue-400 shrink-0 mt-1" />
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
