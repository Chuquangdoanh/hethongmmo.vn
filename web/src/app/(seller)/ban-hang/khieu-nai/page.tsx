import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { getNotificationSoundUrl } from "@/lib/utils/notification-sound";
import {
  Clock, CheckCircle, MessageCircleWarning,
} from "lucide-react";
import SellerKhieuNaiSidebar, { type ConversationItem } from "./_components/SellerKhieuNaiSidebar";
import TicketChatPanel from "@/app/(user)/ho-tro/_components/TicketChatPanel";
import SupportChatThread from "@/components/shared/SupportChatThread";
import ScrollToTop from "@/components/shared/ScrollToTop";
import BackBtn from "@/components/shared/BackBtn";
import ReturnTabSound from "@/components/shared/ReturnTabSound";
import "./seller-khieu-nai.css";

export const metadata: Metadata = { title: "Khiếu nại từ khách — Nhà bán hàng" };

const STATUS_LABEL: Record<string, string> = {
  IN_REVIEW:     "Đang đàm phán",
  PENDING_ADMIN: "Chờ admin",
  RESOLVED:      "Đã hoàn thành",
  REJECTED:      "Đã hoàn tiền khách",
};
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  IN_REVIEW:     { bg: "#eff6ff", color: "#1d4ed8",  border: "#bfdbfe" },
  PENDING_ADMIN: { bg: "#fdf4ff", color: "#7c3aed",  border: "#e9d5ff" },
  RESOLVED:      { bg: "#f0fdf4", color: "#15803d",  border: "#bbf7d0" },
  REJECTED:      { bg: "#fef2f2", color: "#dc2626",  border: "#fecaca" },
};
const defaultStyle = { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

export default async function SellerKhieuNaiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: activeId } = await searchParams;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;
  const notificationSoundUrl = await getNotificationSoundUrl();

  // Chat hỗ trợ (SupportTicket) dùng id có tiền tố "st-" để phân biệt với Complaint
  const isSupportTicket = activeId?.startsWith("st-") ?? false;
  const supportTicketId = isSupportTicket ? activeId!.slice(3) : null;

  /* ── Seller's order IDs ── */
  const sellerOrderIds = (
    await prisma.order.findMany({
      where: { sellerId: me.id },
      select: { id: true },
    })
  ).map((o) => o.id);

  /* ── Complaint list (left panel) ── */
  const complaints = await prisma.complaint.findMany({
    where: { orderId: { in: sellerOrderIds } },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true } },
      chatRoom: {
        select: {
          id: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { senderName: true, content: true },
          },
        },
      },
    },
  });


  /* Order info for list display */
  const listOrderIds = complaints.map((c) => c.orderId).filter(Boolean) as string[];
  const listOrders = listOrderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: listOrderIds }, sellerId: me.id },
        select: { id: true, orderCode: true, itemName: true },
      })
    : [];
  const orderListMap = new Map(listOrders.map((o) => [o.id, o]));

  /* ── Chat hỗ trợ list (left panel) — độc lập với Complaint, không tranh chấp tiền ── */
  const supportTickets = await prisma.supportTicket.findMany({
    where: { sellerId: me.id },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { orderCode: true, itemName: true } },
      user: { select: { fullName: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderName: true, content: true } },
    },
  });

  /* ── Selected complaint (middle + right panel) ── */
  const selected = (activeId && !isSupportTicket)
    ? await prisma.complaint.findFirst({
        where: { id: activeId, orderId: { in: sellerOrderIds } },
        include: {
          user: { select: { fullName: true, email: true } },
          chatRoom: {
            include: {
              participants: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
              },
              messages: { orderBy: { createdAt: "asc" }, take: 100 },
            },
          },
        },
      })
    : null;

  if (activeId && !isSupportTicket && !selected) redirect("/ban-hang/khieu-nai");

  /* ── Selected support ticket ── */
  const selectedSupportTicket = supportTicketId
    ? await prisma.supportTicket.findFirst({
        where: { id: supportTicketId, sellerId: me.id },
        include: {
          order: { select: { orderCode: true, itemName: true } },
          user: { select: { fullName: true, email: true } },
        },
      })
    : null;

  if (isSupportTicket && !selectedSupportTicket) redirect("/ban-hang/khieu-nai");

  const selectedOrder = selected?.orderId
    ? await prisma.order.findFirst({
        where: { id: selected.orderId, sellerId: me.id },
        select: {
          id: true, orderCode: true, itemName: true,
          finalPrice: true, status: true, createdAt: true,
        },
      })
    : null;

  /* ── Build TicketChatPanel props ── */
  const chatRoom = selected?.chatRoom ?? null;

  const myParticipant = chatRoom?.participants.find((p) => p.userId === me.id);
  const currentUserLabel =
    me.role === "ADMIN" || me.role === "STAFF"
      ? "Admin"
      : (myParticipant?.label ?? "Nhà bán hàng");

  const TOTAL_MSG_LIMIT = 20;
  const USER_TURN_LIMIT = 3;
  const initialQuota = chatRoom
    ? {
        total: TOTAL_MSG_LIMIT,
        used: chatRoom.totalMsgCount,
        remaining: Math.max(0, TOTAL_MSG_LIMIT - chatRoom.totalMsgCount),
        warning: chatRoom.totalMsgCount >= 17,
        locked: chatRoom.totalMsgCount >= TOTAL_MSG_LIMIT,
        userTurnLimit: USER_TURN_LIMIT,
        userTurnUsed: chatRoom.userTurnCount,
      }
    : undefined;

  let r2opened = false;
  if (chatRoom?.id) {
    const rows = await prisma.$queryRaw<[{ round_two_opened: boolean }]>`
      SELECT round_two_opened FROM chat_rooms WHERE id = ${chatRoom.id}::uuid
    `;
    r2opened = rows[0]?.round_two_opened ?? false;
  }

  const initialResolution = chatRoom
    ? {
        sellerConfirmed:  chatRoom.sellerConfirmed,
        sellerConfirmedAt: chatRoom.sellerConfirmedAt?.toISOString() ?? null,
        userDone:         chatRoom.userDone,
        roundTwoOpened:   r2opened,
      }
    : undefined;

  const chatRoomForPanel = chatRoom
    ? {
        id: chatRoom.id,
        participants: chatRoom.participants.map((p) => ({
          userId:   p.userId,
          label:    p.label,
          userName: p.label === "Người mua"
            ? (p.user.fullName ?? p.user.email)
            : (p.label === "Nhà bán hàng"
                ? `Seller #${p.userId.slice(0, 8).toUpperCase()}`
                : (p.user.fullName ?? p.user.email)),
        })),
        messages: chatRoom.messages.map((m) => ({
          id:          m.id,
          senderId:    m.senderId,
          senderName:  m.senderName,
          senderLabel: m.senderLabel,
          content:     m.content,
          createdAt:   m.createdAt.toISOString(),
        })),
      }
    : null;

  const chatEnded =
    selected?.status === "RESOLVED" ||
    selected?.status === "REJECTED";

  return (
    <div className={`ht-wrapper${activeId ? " ht-wrapper--detail" : " ht-wrapper--list"}`}>
      <ScrollToTop />
      <ReturnTabSound soundUrl={notificationSoundUrl} />

      {/* ══ LEFT — Danh sách hội thoại (gộp Khiếu nại + Chat hỗ trợ) ═══ */}
      <div className="ht-sidebar">
        <SellerKhieuNaiSidebar
          activeId={activeId}
          items={[
            ...complaints.map((c): ConversationItem => {
              const o       = c.orderId ? orderListMap.get(c.orderId) : null;
              const lastMsg = c.chatRoom?.messages[0];
              return {
                kind:               "complaint",
                id:                 c.id,
                status:             c.status,
                updatedAt:          c.updatedAt.toISOString(),
                buyerName:          c.user.fullName ?? c.user.email,
                orderCode:          o?.orderCode ?? undefined,
                itemName:           o?.itemName  ?? undefined,
                subject:            c.subject,
                lastMsgSenderName:  lastMsg?.senderName  ?? undefined,
                lastMsgContent:     lastMsg?.content     ?? undefined,
              };
            }),
            ...supportTickets.map((t): ConversationItem => {
              const lastMsg = t.messages[0];
              return {
                kind:               "support",
                id:                 t.id,
                updatedAt:          t.updatedAt.toISOString(),
                buyerName:          t.user.fullName ?? t.user.email,
                orderCode:          t.order.orderCode,
                itemName:           t.order.itemName,
                lastMsgSenderName:  lastMsg?.senderName ?? undefined,
                lastMsgContent:     lastMsg?.content    ?? undefined,
              };
            }),
          ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
        />
      </div>

      {/* ══ MIDDLE — Chi tiết khiếu nại ══════════════════════════ */}
      {selected ? (
        <div className="ht-middle">
          {/* Title bar */}
          <div className="ht-title-bar">
            <BackBtn href="/ban-hang/khieu-nai" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                {ticketCode(selected.id)} — {selected.subject}
              </h1>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                Người mua: <strong>{selected.user.fullName ?? selected.user.email}</strong>
                {selectedOrder && (
                  <>
                    <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                    <span>Đơn #{selectedOrder.orderCode}</span>
                    <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                    <span>{selectedOrder.itemName}</span>
                  </>
                )}
              </p>
            </div>
            {(() => {
              const st = STATUS_STYLE[selected.status] ?? defaultStyle;
              return (
                <span style={{
                  fontSize: "11px", padding: "4px 12px", borderRadius: "20px",
                  fontWeight: "700", flexShrink: 0,
                  background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                }}>
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
              );
            })()}
          </div>

          {/* Lý do khiếu nại */}
          <div className="ht-status-tabs">
            <span style={{ fontSize: "11px", color: "#b45309", fontWeight: "600", flexShrink: 0 }}>
              Lý do:
            </span>
            <span style={{
              fontSize: "11px", color: "#1e293b",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {selected.subject}
            </span>
            {selected.content && (
              <>
                <span style={{ color: "#e2e8f0", flexShrink: 0 }}>·</span>
                <span style={{
                  fontSize: "11px", color: "#64748b",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                }}>
                  {selected.content}
                </span>
              </>
            )}
          </div>

          {/* Chat area */}
          <div className="ht-chat-area">
            <div className="ht-chat-summary">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "12px" }}>
                  {ticketCode(selected.id)}
                </span>
                {selectedOrder && (
                  <>
                    <span style={{ color: "#e2e8f0" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#475569" }}>
                      {selectedOrder.itemName}
                    </span>
                    <span style={{ color: "#e2e8f0" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>
                      {formatVnd(Number(selectedOrder.finalPrice))}
                    </span>
                  </>
                )}
              </div>
              <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>
                {formatDate(selected.createdAt)}
              </span>
            </div>

            {chatRoomForPanel ? (
              <TicketChatPanel
                key={chatRoomForPanel.id}
                room={chatRoomForPanel}
                currentUserId={me.id}
                currentUserLabel={currentUserLabel}
                initialChatEnded={chatEnded}
                initialComplaintStatus={selected.status}
                initialQuota={initialQuota}
                initialResolution={initialResolution}
                notificationSoundUrl={notificationSoundUrl}
              />
            ) : selected.status === "RESOLVED" ? (
              <div className="ht-state-box" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <CheckCircle size={22} style={{ color: "#16a34a", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#15803d", margin: "0 0 3px" }}>
                    Khiếu nại đã được giải quyết
                  </p>
                  <p style={{ fontSize: "12px", color: "#166534" }}>
                    {selected.resolution ?? "Đơn hàng đã được xác nhận hoàn thành."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="ht-state-box" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
                <Clock size={22} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", margin: "0 0 3px" }}>
                    Đang chờ admin mở phòng chat
                  </p>
                  <p style={{ fontSize: "12px", color: "#78350f" }}>
                    Admin sẽ xác minh và mở phòng chat để bạn trao đổi với người mua.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : selectedSupportTicket ? (
        <div className="ht-middle">
          {/* Title bar — chat hỗ trợ thuần túy, không progress steps, không nút xác nhận/hoàn thành */}
          <div className="ht-title-bar">
            <BackBtn href="/ban-hang/khieu-nai" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Chat hỗ trợ với người mua
              </h1>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                Người mua: <strong>{selectedSupportTicket.user.fullName ?? selectedSupportTicket.user.email}</strong>
                <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                <span>Đơn #{selectedSupportTicket.order.orderCode}</span>
                <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                <span>{selectedSupportTicket.order.itemName}</span>
              </p>
            </div>
          </div>

          {/* Chat area */}
          <div className="ht-chat-area">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <SupportChatThread
                ticketId={selectedSupportTicket.id}
                myRole="SELLER"
                notificationSoundUrl={notificationSoundUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="ht-middle ht-middle--empty">
          <MessageCircleWarning size={44} style={{ color: "#cbd5e1" }} />
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Chọn khiếu nại để xem chi tiết</p>
          <p style={{ fontSize: "12px", color: "#cbd5e1" }}>Chọn một khiếu nại từ danh sách bên trái</p>
        </div>
      )}

    </div>
  );
}
