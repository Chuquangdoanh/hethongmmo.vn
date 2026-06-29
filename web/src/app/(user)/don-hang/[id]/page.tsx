import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import DeliveredContentLoader from "./DeliveredContentLoader";
import ReviewSection from "@/components/shared/ReviewSection";
import { type ChatRoomInfo } from "@/components/shared/ChatWidget";
import TicketChatPanel from "@/app/(user)/ho-tro/_components/TicketChatPanel";
import UserProfileHero from "@/components/shared/UserProfileHero";
import PayRemainingButton from "../_components/PayRemainingButton";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  PENDING:    { label: "Chờ xử lý",  class: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" },
  PROCESSING: { label: "Đang xử lý", class: "bg-[#0066ff]/10 text-[#0066ff] border-[#0066ff]/30" },
  DONE:       { label: "Hoàn thành", class: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30" },
  CANCELLED:  { label: "Đã hủy",     class: "bg-[#71717A]/10 text-[#64748b] border-[#71717A]/30" },
  REFUNDED:   { label: "Hoàn tiền",       class: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30" },
  DISPUTED:   { label: "Đang khiếu nại", class: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" },
  FROZEN:     { label: "Đang xử lý",     class: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" },
};

export default async function DonHangDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [order, userRow, lastDeposit] = await Promise.all([
    prisma.order.findFirst({
      where: { id, userId: me.id },
      select: {
        id: true, orderCode: true, itemName: true, orderType: true,
        originalPrice: true, finalPrice: true, warrantyVariant: true,
        status: true, createdAt: true, completedAt: true,
        sellerProductId: true, mmoProductId: true,
        paymentType: true, depositAmount: true, remainingAmount: true, finalPaidAt: true,
      },
    }),
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
  ]);

  if (!order || !userRow) notFound();

  const reviewableProductId =
    order.status === "DONE" && order.orderType === "SELLER_PRODUCT" ? order.sellerProductId :
    order.status === "DONE" && order.orderType === "MMO_PRODUCT"    ? order.mmoProductId    : null;

  const reviewProductType =
    order.orderType === "SELLER_PRODUCT" ? "SELLER_PRODUCT" as const :
    order.orderType === "MMO_PRODUCT"    ? "MMO_PRODUCT"    as const : null;

  // Fetch complaint + chatRoom for this order (IDOR-safe: userId = me.id)
  const complaint = await prisma.complaint.findFirst({
    where: { orderId: id, userId: me.id },
    select: {
      id: true, subject: true, status: true,
      chatRoom: {
        include: {
          participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      },
    },
  });

  const chatRoom: ChatRoomInfo | null = complaint?.chatRoom
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

  const [reviewStats, myReview, recentReviews] = reviewableProductId && reviewProductType
    ? await Promise.all([
        prisma.review.aggregate({
          where: { productType: reviewProductType, productId: reviewableProductId },
          _avg: { rating: true },
          _count: { id: true },
        }),
        prisma.review.findUnique({
          where: { orderId: order.id },
          select: { rating: true, comment: true },
        }),
        prisma.review.findMany({
          where: { productType: reviewProductType, productId: reviewableProductId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            rating: true, comment: true, createdAt: true,
            user: { select: { fullName: true, email: true } },
          },
        }),
      ])
    : [null, null, []];

  const st = STATUS_STYLES[order.status] ?? STATUS_STYLES["PENDING"]!;

  const balance        = Number(userRow.balance);
  const totalDeposited = Number(userRow.totalDeposited);
  const totalSpent     = Number(userRow.totalSpent);

  const TOTAL_MSG_LIMIT = 20;
  const USER_TURN_LIMIT = 3;

  const initialQuota = complaint?.chatRoom ? {
    total: TOTAL_MSG_LIMIT,
    used: complaint.chatRoom.totalMsgCount,
    remaining: Math.max(0, TOTAL_MSG_LIMIT - complaint.chatRoom.totalMsgCount),
    warning: complaint.chatRoom.totalMsgCount >= 17,
    locked: complaint.chatRoom.totalMsgCount >= TOTAL_MSG_LIMIT,
    userTurnLimit: USER_TURN_LIMIT,
    userTurnUsed: complaint.chatRoom.userTurnCount,
  } : undefined;

  let r2opened = false;
  if (complaint?.chatRoom?.id) {
    const rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
      SELECT round_two_opened FROM chat_rooms WHERE id = ${complaint.chatRoom.id}::uuid
    `;
    r2opened = rows[0]?.round_two_opened ?? false;
  }

  const initialResolution = complaint?.chatRoom ? {
    sellerConfirmed:  complaint.chatRoom.sellerConfirmed,
    sellerConfirmedAt: complaint.chatRoom.sellerConfirmedAt?.toISOString() ?? null,
    userDone:         complaint.chatRoom.userDone,
    roundTwoOpened:   r2opened,
  } : undefined;

  return (
    <>
      <UserProfileHero
        fullName={userRow.fullName}
        email={userRow.email}
        role={userRow.role}
        uidPrefix={userRow.uidPrefix}
        balance={balance}
        totalDeposited={totalDeposited}
        totalSpent={totalSpent}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="orders"
        avatarUrl={userRow.avatarUrl ?? null}
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/don-hang" className="text-xs text-gray-500 hover:text-gray-700">
            ← Đơn hàng
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.itemName}</h1>
            <p className="text-xs text-gray-400 mt-1">Mã đơn: #{order.orderCode}</p>
          </div>
          <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${st.class}`}>
            {st.label}
          </span>
        </div>

        <div className={complaint ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start" : "max-w-2xl"}>
          {/* Left — order info */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Thông tin đơn hàng</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Loại đơn", value: order.orderType },
                  { label: "Giá gốc",  value: formatVnd(Number(order.originalPrice)) },
                  order.paymentType === "DEPOSIT"
                    ? { label: "Đã cọc", value: formatVnd(Number(order.depositAmount ?? 0)) }
                    : { label: "Thực tế", value: formatVnd(Number(order.finalPrice)) },
                  order.paymentType === "DEPOSIT" && Number(order.remainingAmount ?? 0) > 0
                    ? { label: "Còn lại", value: formatVnd(Number(order.remainingAmount)) }
                    : null,
                  order.paymentType === "DEPOSIT" && Number(order.remainingAmount ?? 0) === 0
                    ? { label: "Tổng đã trả", value: formatVnd(Number(order.finalPrice)) }
                    : null,
                  order.warrantyVariant ? { label: "Bảo hành", value: order.warrantyVariant } : null,
                  { label: "Ngày đặt",    value: formatDate(order.createdAt) },
                  order.finalPaidAt ? { label: "Thanh toán đủ", value: formatDate(order.finalPaidAt) } : null,
                  order.completedAt ? { label: "Hoàn thành", value: formatDate(order.completedAt) } : null,
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div key={row!.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{row!.label}</span>
                      <span className={`font-medium ${row!.label === "Còn lại" ? "text-red-500" : "text-gray-800"}`}>{row!.value}</span>
                    </div>
                  ))}
              </div>
              {order.paymentType === "DEPOSIT" && Number(order.remainingAmount ?? 0) > 0 && (
                <div className="px-5 pb-4">
                  <PayRemainingButton orderId={order.id} remainingAmount={Number(order.remainingAmount)} />
                </div>
              )}
            </div>

            {/* Delivered content */}
            {(order.status === "DONE" || order.status === "REFUNDED") && (
              <DeliveredContentSection orderId={order.id} orderType={order.orderType} orderStatus={order.status} />
            )}

            {/* Review section */}
            {reviewableProductId && reviewProductType && reviewStats && (
              <ReviewSection
                productType={reviewProductType}
                productId={reviewableProductId}
                orderId={order.id}
                avgRating={reviewStats._avg.rating ?? 0}
                reviewCount={reviewStats._count.id}
                recentReviews={recentReviews.map((r) => ({
                  rating: r.rating,
                  comment: r.comment,
                  userName: r.user.fullName ?? r.user.email,
                  createdAt: formatDate(r.createdAt),
                }))}
                myReview={myReview}
              />
            )}
          </div>

          {/* Right — complaint chat */}
          {complaint && (
            <div className="lg:sticky lg:top-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Khiếu nại</h2>
                <span className="text-xs text-gray-500">{complaint.subject}</span>
              </div>
              {chatRoom ? (
                <div style={{
                  minHeight: "420px", maxHeight: "560px",
                  display: "flex", flexDirection: "column",
                  borderRadius: "12px", border: "1px solid #e2e8f0",
                  background: "#fff", overflow: "hidden",
                }}>
                  <TicketChatPanel
                    room={chatRoom}
                    currentUserId={me.id}
                    currentUserLabel="Người mua"
                    initialChatEnded={
                      complaint.status === "RESOLVED" ||
                      complaint.status === "REJECTED"
                    }
                    initialComplaintStatus={complaint.status}
                    initialQuota={initialQuota}
                    initialResolution={initialResolution}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 flex gap-2.5">
                  <span className="text-amber-500 shrink-0 mt-0.5 text-lg">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Chờ Admin mở chat</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Khiếu nại của bạn đang được đội ngũ xem xét. Khi Admin xác nhận, hộp chat sẽ xuất hiện tại đây.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DeliveredContentSection({ orderId, orderType, orderStatus }: { orderId: string; orderType: string; orderStatus: string }) {
  const isRefunded = orderStatus === "REFUNDED";
  return (
    <div className={`rounded-xl border p-5 ${isRefunded ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
      <h2 className={`text-sm font-semibold mb-3 ${isRefunded ? "text-red-700" : "text-emerald-700"}`}>
        {isRefunded ? "Trạng thái đơn hàng" : orderType === "TUTTRICK" ? "Nội dung giao — Tut & Trick" : "Thông tin tài khoản / Nội dung giao"}
      </h2>
      <DeliveredContentLoader orderId={orderId} orderType={orderType} orderStatus={orderStatus} />
    </div>
  );
}
