import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import ComplaintChatPanel, { type ChatRoomData } from "./_components/ComplaintChatPanel";

export const metadata: Metadata = { title: "Admin — Chi tiết khiếu nại" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  OPEN:      { label: "Mở",           cls: "bg-red-50 text-red-600 border-red-200" },
  IN_REVIEW: { label: "Đang xem xét", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  RESOLVED:  { label: "Hoàn thành",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED:  { label: "Đóng băng",     cls: "bg-red-50 text-red-600 border-red-200" },
};

export default async function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  let me;
  try {
    me = requireAdmin(session);
  } catch {
    redirect("/");
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  if (!complaint) notFound();

  // Fetch linked order info
  let orderInfo: {
    id: string;
    orderCode: string;
    orderType: string;
    itemName: string;
    finalPrice: number;
    createdAt: Date;
    sellerName: string | null;
    deliveredContent: string | null;
  } | null = null;

  if (complaint.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: complaint.orderId },
      select: {
        id: true, orderCode: true, orderType: true, itemName: true,
        finalPrice: true, createdAt: true, deliveredItemId: true,
        sellerProduct: { select: { seller: { select: { fullName: true, email: true } } } },
      },
    });

    if (order) {
      let sellerName: string | null = null;
      if (order.sellerProduct?.seller) {
        sellerName = order.sellerProduct.seller.fullName ?? order.sellerProduct.seller.email;
      }

      let deliveredContent: string | null = null;
      if (order.deliveredItemId) {
        try {
          if (order.orderType === "MMO_PRODUCT") {
            const item = await prisma.mmoProductItem.findUnique({
              where: { id: order.deliveredItemId },
              select: { valueEnc: true },
            });
            if (item?.valueEnc) deliveredContent = decrypt(Buffer.from(item.valueEnc));
          } else if (order.orderType === "SELLER_PRODUCT") {
            const item = await prisma.sellerProductStock.findUnique({
              where: { id: order.deliveredItemId },
              select: { contentEnc: true },
            });
            if (item?.contentEnc) deliveredContent = decrypt(Buffer.from(item.contentEnc));
          }
        } catch { /* decryption failed — leave null */ }
      }

      orderInfo = {
        id: order.id,
        orderCode: order.orderCode,
        orderType: order.orderType,
        itemName: order.itemName,
        finalPrice: Number(order.finalPrice),
        createdAt: order.createdAt,
        sellerName,
        deliveredContent,
      };
    }
  }

  // Fetch chat room if exists
  let rawRoom = null;
  try {
    rawRoom = await prisma.chatRoom.findUnique({
      where: { complaintId: id },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });
  } catch {
    /* prisma.chatRoom unavailable on stale client — restart dev server */
  }

  const chatRoom: ChatRoomData | null = rawRoom
    ? {
        id: rawRoom.id,
        participants: rawRoom.participants.map((p) => ({
          userId: p.userId,
          label: p.label,
          userName: p.user.fullName ?? p.user.email,
        })),
        messages: rawRoom.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          senderLabel: m.senderLabel,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      }
    : null;

  const badge = STATUS_BADGES[complaint.status] ?? STATUS_BADGES["OPEN"]!;

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/complaints" className="text-xs text-gray-500 hover:text-gray-700">
          ← Khiếu nại
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* Left column */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết khiếu nại</h1>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {/* Complaint info */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Thông tin khiếu nại</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Row label="Người khiếu nại">
                <span className="text-sm font-medium text-gray-900">
                  {complaint.user.fullName ?? complaint.user.email}
                </span>
                <span className="text-xs text-gray-400 ml-2">{complaint.user.email}</span>
              </Row>
              <Row label="Lý do">
                <span className="text-sm text-gray-900">{complaint.subject}</span>
              </Row>
              <Row label="Mô tả chi tiết">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{complaint.content}</p>
              </Row>
              <Row label="Ngày gửi">
                <span className="text-sm text-gray-600">{formatDate(complaint.createdAt)}</span>
              </Row>
              {complaint.resolution && (
                <Row label="Phản hồi xử lý">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{complaint.resolution}</p>
                </Row>
              )}
            </div>
          </div>

          {/* Order info */}
          {orderInfo && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Thông tin đơn hàng</h2>
                <Link
                  href={`/admin/orders/${orderInfo.id}`}
                  className="text-xs text-[#7C3AED] hover:text-[#A855F7]"
                >
                  Xem chi tiết →
                </Link>
              </div>
              <div className="px-5 py-4 space-y-3">
                <Row label="Tên sản phẩm">
                  <span className="text-sm font-medium text-gray-900">{orderInfo.itemName}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                    {orderInfo.orderType === "MMO_PRODUCT" ? "MMO" : "Nhà bán"}
                  </span>
                </Row>
                <Row label="Mã đơn hàng">
                  <span className="text-sm text-gray-600 font-mono">#{orderInfo.orderCode}</span>
                </Row>
                <Row label="Ngày mua">
                  <span className="text-sm text-gray-600">{formatDate(orderInfo.createdAt)}</span>
                </Row>
                <Row label="Giá">
                  <span className="text-sm font-semibold text-emerald-600">{formatVnd(orderInfo.finalPrice)}</span>
                </Row>
                <Row label="Người bán">
                  <span className="text-sm text-gray-900">
                    {orderInfo.sellerName ?? <span className="text-gray-400">Hệ thống</span>}
                  </span>
                </Row>
                {orderInfo.deliveredContent && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Nội dung sản phẩm đã giao</p>
                    <div className="rounded-xl bg-gray-900 px-4 py-3">
                      <p className="text-sm font-mono text-white break-all leading-relaxed whitespace-pre-wrap">
                        {orderInfo.deliveredContent}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column — chat */}
        <ComplaintChatPanel
          complaintId={id}
          chatRoom={chatRoom}
          currentUserId={me.id}
          currentUserName={me.fullName}
          complaintStatus={complaint.status}
          orderId={complaint.orderId}
        />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-40 shrink-0 text-xs text-gray-500 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
