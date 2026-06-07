import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatDate, formatVnd } from "@/lib/utils/format";
import { MessageCircleWarning, ChevronLeft, Clock, ShoppingBag, Receipt } from "lucide-react";
import ChatWidget, { type ChatRoomInfo } from "@/components/shared/ChatWidget";
import SellerProfileHero from "@/components/shared/SellerProfileHero";

export const metadata: Metadata = { title: "Chi tiết khiếu nại — Nhà bán hàng" };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Mở", IN_REVIEW: "Đang xem xét", RESOLVED: "Hoàn thành", REJECTED: "Đóng băng",
};
const STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-red-50 text-red-600 border-red-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:  "bg-red-50 text-red-600 border-red-200",
};

export default async function SellerKhieuNaiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  // IDOR-safe: verify this complaint belongs to one of seller's orders
  const sellerOrderIds = (
    await prisma.order.findMany({
      where: { sellerId: me.id },
      select: { id: true },
    })
  ).map((o) => o.id);

  const complaint = await prisma.complaint.findFirst({
    where: { id, orderId: { in: sellerOrderIds } },
    include: {
      user: { select: { fullName: true, email: true } },
      chatRoom: {
        include: {
          participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      },
    },
  });

  if (!complaint) notFound();

  const order = complaint.orderId
    ? await prisma.order.findUnique({
        where: { id: complaint.orderId },
        select: { orderCode: true, itemName: true, finalPrice: true, createdAt: true },
      })
    : null;

  const chatRoom: ChatRoomInfo | null = complaint.chatRoom
    ? {
        id: complaint.chatRoom.id,
        participants: complaint.chatRoom.participants.map((p) => ({
          userId: p.userId,
          label: p.label,
          userName: p.user.fullName ?? p.user.email,
        })),
        messages: complaint.chatRoom.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          senderLabel: m.senderLabel,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      }
    : null;

  const statusCls = STATUS_CLS[complaint.status] ?? STATUS_CLS["OPEN"]!;

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="complaints" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">

        {/* Breadcrumb */}
        <Link
          href="/ban-hang/khieu-nai"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ChevronLeft size={14} /> Khiếu nại
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <MessageCircleWarning size={17} className="text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Chi tiết khiếu nại</h1>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${statusCls}`}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* Left — info */}
          <div className="space-y-4">
            {order && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                <div className="px-5 py-3 bg-blue-100/60 border-b border-blue-100 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-blue-700" />
                  <h2 className="text-sm font-semibold text-blue-800">Thông tin đơn hàng</h2>
                </div>
                <div className="px-5 py-4 space-y-3 text-sm">
                  <Row label="Sản phẩm">
                    <span className="font-medium text-gray-900">{order.itemName}</span>
                  </Row>
                  <Row label="Mã đơn">
                    <span className="font-mono text-xs text-gray-600">#{order.orderCode}</span>
                  </Row>
                  <Row label="Giá bán">
                    <span className="font-semibold text-red-500">{formatVnd(Number(order.finalPrice))}</span>
                  </Row>
                  <Row label="Ngày mua">{formatDate(order.createdAt)}</Row>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Receipt size={14} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">Thông tin khiếu nại</h2>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <Row label="Người mua">{complaint.user.fullName ?? complaint.user.email}</Row>
                <Row label="Lý do">{complaint.subject}</Row>
                <Row label="Mô tả">
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{complaint.content}</p>
                </Row>
                <Row label="Ngày gửi">{formatDate(complaint.createdAt)}</Row>
              </div>
            </div>
          </div>

          {/* Right — chat */}
          <div className="lg:sticky lg:top-6">
            {chatRoom ? (
              <ChatWidget
                room={chatRoom}
                currentUserId={me.id}
                initialChatEnded={complaint.status === "RESOLVED" || complaint.status === "REJECTED"}
                endedLabel={complaint.status === "RESOLVED" ? "Hoàn thành" : complaint.status === "REJECTED" ? "Từ chối" : undefined}
              />
            ) : complaint.status === "REJECTED" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">Khiếu nại đã bị từ chối</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Hệ Thống MMO đã xem xét và từ chối khiếu nại này. Đơn hàng được xác nhận hoàn thành.
                  </p>
                </div>
              </div>
            ) : complaint.status === "RESOLVED" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Khiếu nại đã được giải quyết</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Khiếu nại đã được xử lý và đóng lại.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Hệ Thống MMO đang xử lý</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Sau khi Hệ Thống MMO xác nhận trò chuyện, bạn có thể trao đổi trực tiếp tại đây.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-xs text-gray-500 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 text-gray-800">{children}</div>
    </div>
  );
}
