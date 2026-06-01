import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import ChatWidget, { type ChatRoomInfo } from "@/components/shared/ChatWidget";
import UserProfileHero from "@/components/shared/UserProfileHero";

export const metadata: Metadata = { title: "Chi tiết khiếu nại" };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Mở", IN_REVIEW: "Đang xem xét", RESOLVED: "Từ chối", REJECTED: "Hoàn thành",
};
const STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-red-50 text-red-600 border-red-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:  "bg-gray-50 text-gray-500 border-gray-200",
  REJECTED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default async function TroChuyenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [user, lastDeposit, complaint] = await Promise.all([
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
    // IDOR-safe: userId = me.id
    prisma.complaint.findFirst({
      where: { id, userId: me.id },
      include: {
        user: { select: { fullName: true, email: true } },
        chatRoom: {
          include: {
            participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
            messages: { orderBy: { createdAt: "asc" }, take: 50 },
          },
        },
      },
    }),
  ]);

  if (!complaint) notFound();

  // Fetch order separately (no Prisma relation on orderId)
  const order = complaint.orderId
    ? await prisma.order.findFirst({
        where: { id: complaint.orderId, userId: me.id },
        select: { id: true, orderCode: true, itemName: true, finalPrice: true, createdAt: true },
      })
    : null;

  const chatRoom: ChatRoomInfo | null = complaint.chatRoom
    ? {
        id: complaint.chatRoom.id,
        participants: complaint.chatRoom.participants.map((p) => ({
          userId: p.userId,
          label: p.label,
          userName: p.label === "Nhà bán hàng"
            ? `Seller #${p.userId.slice(0, 8).toUpperCase()}`
            : (p.user.fullName ?? p.user.email),
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
  const chatEnded = complaint.status === "RESOLVED" || complaint.status === "REJECTED";
  const endedLabel = complaint.status === "RESOLVED" ? "Từ chối" : complaint.status === "REJECTED" ? "Hoàn thành" : undefined;

  return (
    <>
      {user && (
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
      )}

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="/tro-chuyen" className="text-xs text-gray-500 hover:text-gray-700">
            ← Trò chuyện
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900">Chi tiết khiếu nại</h1>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${statusCls}`}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* Left — info cards */}
          <div className="space-y-4">
            {/* Order info */}
            {order && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                <div className="px-5 py-3 bg-blue-100/60 border-b border-blue-100">
                  <h2 className="text-sm font-semibold text-blue-800">Thông tin đơn hàng</h2>
                </div>
                <div className="px-5 py-4 space-y-3 text-sm">
                  <Row label="Sản phẩm">
                    <span className="font-medium text-gray-900">{order.itemName}</span>
                  </Row>
                  <Row label="Giá">
                    <span className="font-semibold text-emerald-600">{formatVnd(Number(order.finalPrice))}</span>
                  </Row>
                  <Row label="Mã đơn">
                    <span className="font-mono text-xs text-gray-600">#{order.orderCode}</span>
                  </Row>
                  <Row label="Ngày mua">{formatDate(order.createdAt)}</Row>
                
                </div>
              </div>
            )}

            {/* Complaint info */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
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
                initialChatEnded={chatEnded}
                endedLabel={endedLabel}
              />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 flex gap-2.5">
                <span className="text-amber-500 shrink-0 mt-0.5 text-lg">⏳</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Chờ Admin mở chat</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Sau khi Admin xác nhận trò chuyện, bạn có thể trao đổi trực tiếp tại đây.
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
