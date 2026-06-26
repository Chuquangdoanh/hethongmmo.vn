import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff, type AuthenticatedUser } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import ComplaintChatPanel, { type ChatRoomData } from "./_components/ComplaintChatPanel";

export const metadata: Metadata = { title: "Admin — Chi tiết khiếu nại" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  OPEN:          { label: "Chờ xử lý",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_REVIEW:     { label: "Đang xem xét", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING_ADMIN: { label: "Chờ phán quyết", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  RESOLVED:      { label: "Hoàn thành",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED:      { label: "Đã hoàn tiền", cls: "bg-red-50 text-red-600 border-red-200" },
};

export default async function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  let me: AuthenticatedUser;
  try {
    me = requireStaff(session);
  } catch {
    redirect("/");
  }
  try {
    await requirePermission(session, "complaints:read");
  } catch {
    redirect("/admin/complaints");
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
        } catch { /* decryption failed */ }
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

  // Fetch chat room
  let rawRoom = null;
  try {
    rawRoom = await prisma.chatRoom.findUnique({
      where: { complaintId: id },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });
  } catch { /* prisma stale client */ }

  // $queryRaw đọc round_two_opened đúng kể cả khi Prisma client cũ
  let adminR2opened = false;
  if (rawRoom?.id) {
    const rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
      SELECT round_two_opened FROM chat_rooms WHERE id = ${rawRoom.id}::uuid
    `;
    adminR2opened = rows[0]?.round_two_opened ?? false;
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
    <div className="w-full space-y-5">
      {/* Breadcrumb + title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/complaints" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Danh sách khiếu nại
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-xs text-gray-500 font-mono">#{id.slice(0, 8).toUpperCase()}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* ── Row 1: 5:5 — Thông tin khiếu nại | Thông tin đơn hàng ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Thông tin khiếu nại */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-gray-800">Thông tin khiếu nại</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Row label="Người khiếu nại">
              <span className="text-sm font-semibold text-gray-900">
                {complaint.user.fullName ?? complaint.user.email}
              </span>
              <span className="text-xs text-gray-400 ml-2">{complaint.user.email}</span>
            </Row>
            <Row label="Lý do">
              <span className="text-sm text-gray-800">{complaint.subject}</span>
            </Row>
            <Row label="Mô tả">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {complaint.content}
              </p>
            </Row>
            <Row label="Ngày gửi">
              <span className="text-sm text-gray-500">{formatDate(complaint.createdAt)}</span>
            </Row>
            {complaint.resolvedAt && (
              <Row label="Giải quyết lúc">
                <span className="text-sm text-gray-500">{formatDate(complaint.resolvedAt)}</span>
              </Row>
            )}
            {complaint.resolution && (
              <Row label="Kết quả">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {complaint.resolution}
                </p>
              </Row>
            )}
          </div>
        </div>

        {/* Thông tin đơn hàng */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛍️</span>
              <h2 className="text-sm font-bold text-gray-800">Thông tin đơn hàng</h2>
            </div>
            {orderInfo && (
              <Link
                href={`/admin/orders/${orderInfo.id}`}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
              >
                Xem chi tiết →
              </Link>
            )}
          </div>

          {orderInfo ? (
            <div className="px-5 py-4 space-y-3">
              <Row label="Sản phẩm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{orderInfo.itemName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                    {orderInfo.orderType === "MMO_PRODUCT" ? "MMO" : "Nhà bán"}
                  </span>
                </div>
              </Row>
              <Row label="Mã đơn">
                <span className="text-sm text-gray-600 font-mono">#{orderInfo.orderCode}</span>
              </Row>
              <Row label="Ngày mua">
                <span className="text-sm text-gray-500">{formatDate(orderInfo.createdAt)}</span>
              </Row>
              <Row label="Giá trị">
                <span className="text-sm font-bold text-emerald-600">{formatVnd(orderInfo.finalPrice)}</span>
              </Row>
              <Row label="Người bán">
                <span className="text-sm text-gray-900">
                  {orderInfo.sellerName ?? <span className="text-gray-400 italic">Hệ thống</span>}
                </span>
              </Row>
              {orderInfo.deliveredContent && (
                <div className="pt-1">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Nội dung đã giao</p>
                  <div className="rounded-xl bg-gray-900 px-4 py-3 max-h-32 overflow-y-auto">
                    <p className="text-sm font-mono text-white break-all leading-relaxed whitespace-pre-wrap">
                      {orderInfo.deliveredContent}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Không có đơn hàng liên kết</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Full width — Trò chuyện khiếu nại ── */}
      <ComplaintChatPanel
        complaintId={id}
        chatRoom={chatRoom}
        currentUserId={me.id}
        currentUserName={me.fullName}
        complaintStatus={complaint.status}
        orderId={complaint.orderId}
        initialRoundTwoOpened={adminR2opened}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-xs text-gray-400 pt-0.5 font-medium">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
