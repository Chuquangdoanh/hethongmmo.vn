import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/utils/format";
import { getNotificationSoundUrl } from "@/lib/utils/notification-sound";
import {
  Search, Clock, CheckCircle, ShieldAlert, MessageCircle,
} from "lucide-react";
import TicketChatPanel from "./_components/TicketChatPanel";
import TicketScrollLink from "./_components/TicketScrollLink";
import ScrollToTop from "@/components/shared/ScrollToTop";
import BackBtn from "@/components/shared/BackBtn";
import ReturnTabSound from "@/components/shared/ReturnTabSound";
import SupportChatThread from "@/components/shared/SupportChatThread";
import "./ho-tro.css";

export const metadata: Metadata = { title: "Ticket hỗ trợ" };

/* ─── Status display ──────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  OPEN:          "Chờ xử lý",
  IN_REVIEW:     "Đang xử lý",
  PENDING_ADMIN: "Đã phản hồi",
  RESOLVED:      "Đã hoàn thành",
  REJECTED:      "Đã hoàn tiền ",
};
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:          { bg: "#fffbeb", color: "#b45309",  border: "#fde68a" },
  IN_REVIEW:     { bg: "#eff6ff", color: "#1d4ed8",  border: "#bfdbfe" },
  PENDING_ADMIN: { bg: "#fdf4ff", color: "#7c3aed",  border: "#e9d5ff" },
  RESOLVED:      { bg: "#f0fdf4", color: "#15803d",  border: "#bbf7d0" },
  REJECTED:      { bg: "#f8fafc", color: "#64748b",  border: "#e2e8f0" },
};
const defaultStyle = { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

/* Item dùng chung cho danh sách hội thoại gộp (Khiếu nại + Chat hỗ trợ) */
type ConversationRow = {
  kind: "complaint" | "support";
  id: string;
  href: string;
  updatedAt: string;
  titleLabel: string;
  line2: string;
  line3?: string;
  lastMsg?: { senderName: string; content: string };
  statusBadge?: { label: string; bg: string; color: string; border: string };
};

/* ─── Progress steps ──────────────────────────────────────────── */
function buildSteps(status: string, createdAt: Date, resolvedAt: Date | null) {
  const isDone   = status === "RESOLVED" || status === "REJECTED";
  const isAdmin  = status === "PENDING_ADMIN";

  return [
    {
      n: 1, label: "Đã mở khiếu nại",
      sub: formatDate(createdAt),
      done: true, active: false,
    },
    {
      n: 2, label: "Đang đàm phán",
      sub: "Chat với nhà bán hàng",
      done: isDone || isAdmin, active: status === "IN_REVIEW",
    },
    {
      n: 3, label: "Xác nhận kết quả",
      sub: "Seller & user đồng ý",
      done: isDone, active: isAdmin,
    },
    {
      n: 4, label: "Admin phán quyết",
      sub: isAdmin ? "Đang chờ admin" : "Nếu cần thiết",
      done: isDone && isAdmin, active: isAdmin,
    },
    {
      n: 5, label: "Kết thúc",
      sub: resolvedAt ? formatDate(resolvedAt) : "Đóng khiếu nại",
      done: isDone, active: isDone,
    },
  ];
}

/* ─── Page ────────────────────────────────────────────────────── */
export default async function HoTroPage({
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

  /* ── Complaint list (left panel) ── */
  const complaints = await prisma.complaint.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: {
      chatRoom: {
        select: {
          id: true,
          createdAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { senderName: true, content: true },
          },
        },
      },
    },
  });

  /* Order info cho list */
  const listOrderIds = complaints.map(c => c.orderId).filter(Boolean) as string[];
  const listOrders   = listOrderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: listOrderIds }, userId: me.id },
        select: { id: true, orderCode: true, itemName: true },
      })
    : [];
  const orderListMap = new Map(listOrders.map(o => [o.id, o]));

  /* ── Chat hỗ trợ list (left panel) — độc lập với Complaint, không tranh chấp tiền ── */
  const supportTickets = await prisma.supportTicket.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { orderCode: true, itemName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderName: true, content: true } },
    },
  });

  /* ── Selected complaint ── */
  const selected = (activeId && !isSupportTicket)
    ? await prisma.complaint.findFirst({
        where: { id: activeId, userId: me.id },
        include: {
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

  if (activeId && !isSupportTicket && !selected) redirect("/ho-tro");

  /* ── Selected support ticket ── */
  const selectedSupportTicket = supportTicketId
    ? await prisma.supportTicket.findFirst({
        where: { id: supportTicketId, userId: me.id },
        include: { order: { select: { orderCode: true, itemName: true } } },
      })
    : null;

  if (isSupportTicket && !selectedSupportTicket) redirect("/ho-tro");

  const selectedOrder = selected?.orderId
    ? await prisma.order.findFirst({
        where: { id: selected.orderId, userId: me.id },
        select: {
          id: true, orderCode: true, itemName: true,
          finalPrice: true, status: true, createdAt: true,
        },
      })
    : null;

  /* ── Build chat room props ── */
  const chatRoom = selected?.chatRoom ?? null;

  // Xác định label của user hiện tại trong chat room
  const myParticipant = chatRoom?.participants.find(p => p.userId === me.id);
  const currentUserLabel =
    me.role === "ADMIN" || me.role === "STAFF"
      ? "Admin"
      : (myParticipant?.label ?? "Người mua");

  // Build quota từ chatRoom data (server-side initial state)
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

  // $queryRaw bypass Prisma client cũ — đọc round_two_opened đúng kể cả trước khi restart server
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
        participants: chatRoom.participants.map(p => ({
          userId:   p.userId,
          label:    p.label,
          userName: p.label === "Nhà bán hàng"
            ? `Seller #${p.userId.slice(0, 8).toUpperCase()}`
            : (p.user.fullName ?? p.user.email),
        })),
        messages: chatRoom.messages.map(m => ({
          id:          m.id,
          senderId:    m.senderId,
          senderName:  m.senderName,
          senderLabel: m.senderLabel,
          content:     m.content,
          createdAt:   m.createdAt.toISOString(),
        })),
      }
    : null;

  const chatEnded     = selected?.status === "RESOLVED" || selected?.status === "REJECTED";
  const progressSteps = selected
    ? buildSteps(selected.status, selected.createdAt, selected.resolvedAt ?? null)
    : null;

  /* ── Danh sách hội thoại (gộp Khiếu nại + Chat hỗ trợ vào 1 tab chung) ── */
  const conversationItems: ConversationRow[] = [
    ...complaints.map((c): ConversationRow => {
      const o  = c.orderId ? orderListMap.get(c.orderId) : null;
      const st = STATUS_STYLE[c.status] ?? defaultStyle;
      return {
        kind: "complaint",
        id: c.id,
        href: `/ho-tro?id=${c.id}`,
        updatedAt: c.updatedAt.toISOString(),
        titleLabel: ticketCode(c.id),
        line2: o ? `Đơn #${o.orderCode}` : "Không có đơn hàng",
        line3: o?.itemName ?? c.subject,
        lastMsg: c.chatRoom?.messages[0],
        statusBadge: { label: STATUS_LABEL[c.status] ?? c.status, ...st },
      };
    }),
    ...supportTickets.map((t): ConversationRow => ({
      kind: "support",
      id: t.id,
      href: `/ho-tro?id=st-${t.id}`,
      updatedAt: t.updatedAt.toISOString(),
      titleLabel: `Đơn #${t.order.orderCode}`,
      line2: t.order.itemName,
      lastMsg: t.messages[0],
    })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const STATUS_TABS = [
    { key: "IN_REVIEW",     label: "Đang xử lý" },
    { key: "PENDING_ADMIN", label: "Đã phản hồi" },
    { key: "RESOLVED",      label: "Đã hoàn thành" },
    { key: "REJECTED",      label: "Đã đóng" },
  ];

  return (
    <div className={`ht-wrapper${activeId ? " ht-wrapper--detail" : " ht-wrapper--list"}`}>
      <ScrollToTop />
      <ReturnTabSound soundUrl={notificationSoundUrl} />

      {/* ══ LEFT — Danh sách ticket ═══════════════════════════════ */}
      <div className="ht-sidebar">
        <div className="ht-sidebar-head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Danh sách hội thoại
            </span>
            <span style={{
              fontSize: "10px", padding: "2px 8px", background: "#f1f5f9",
              borderRadius: "20px", border: "1px solid #e2e8f0", color: "#64748b",
            }}>
              {conversationItems.length} hội thoại
            </span>
          </div>
          <div className="ht-search">
            <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Tìm kiếm hội thoại...</span>
          </div>
        </div>

        <div className="ht-sidebar-list">
          {conversationItems.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <MessageCircle size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px", display: "block" }} />
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có hội thoại nào</p>
              <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                Khiếu nại hoặc chat hỗ trợ đơn hàng để tạo hội thoại
              </p>
            </div>
          ) : (
            conversationItems.map((item) => {
              const isActive = activeId === (item.kind === "complaint" ? item.id : `st-${item.id}`);

              return (
                <TicketScrollLink
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  className={`ht-ticket-item${isActive ? " ht-ticket-item--active" : ""}`}
                >
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "12px", fontWeight: "700",
                        color: isActive ? "#1d4ed8" : "#1e293b", marginBottom: "2px",
                        display: "flex", alignItems: "center", gap: "4px",
                      }}>
                        {item.kind === "support" && <MessageCircle size={11} style={{ flexShrink: 0 }} />}
                        {item.titleLabel}
                      </p>
                      <p style={{
                        fontSize: "11px", color: "#475569",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: "1px",
                      }}>
                        {item.line2}
                      </p>
                      {item.line3 && (
                        <p style={{
                          fontSize: "11px", color: "#64748b",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.line3}
                        </p>
                      )}
                      {item.lastMsg && (
                        <p style={{
                          fontSize: "10px", color: "#94a3b8", marginTop: "2px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.lastMsg.senderName}: {item.lastMsg.content}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <p style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "5px" }}>
                        {new Date(item.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
                      </p>
                      {item.statusBadge ? (
                        <span style={{
                          display: "inline-block", fontSize: "9px", padding: "2px 7px",
                          borderRadius: "10px", fontWeight: "600",
                          background: item.statusBadge.bg, color: item.statusBadge.color, border: `1px solid ${item.statusBadge.border}`,
                        }}>
                          {item.statusBadge.label}
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-block", fontSize: "9px", padding: "2px 7px",
                          borderRadius: "10px", fontWeight: "600",
                          background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                        }}>
                          Chat hỗ trợ
                        </span>
                      )}
                    </div>
                  </div>
                </TicketScrollLink>
              );
            })
          )}
        </div>
      </div>

      {/* ══ MIDDLE — Chi tiết ticket ══════════════════════════════ */}
      {selected ? (
        <div className="ht-middle">
          {/* Title bar */}
          <div className="ht-title-bar">
            <BackBtn href="/ho-tro" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Chi tiết khiếu nại {ticketCode(selected.id)}
              </h1>
              {selectedOrder && (
                <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <Link href="/don-hang" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                    Đơn #{selectedOrder.orderCode}
                  </Link>
                  <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                  <span>Dịch vụ: {selectedOrder.itemName}</span>
                  <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
                  <Link href="/don-hang" style={{ color: "#2563eb", textDecoration: "none" }}>Xem đơn ↗</Link>
                </p>
              )}
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

          {/* Progress steps */}
          {progressSteps && (
            <div className="ht-progress">
              {progressSteps.map((step, i) => (
                <div key={step.n} className="ht-step">
                  {i < progressSteps.length - 1 && (
                    <div className={`ht-step-line${step.done ? " ht-step-line--done" : ""}`} />
                  )}
                  <div className={`ht-step-circle${step.done ? " ht-step-circle--done" : step.active ? " ht-step-circle--active" : ""}`}>
                    {step.done && !step.active ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2.5 6.5L5 9L10.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: step.active ? "white" : "#94a3b8" }}>
                        {step.n}
                      </span>
                    )}
                  </div>
                  <div className="ht-step-label">
                    <p style={{
                      fontSize: "10px", fontWeight: step.active || step.done ? "600" : "400",
                      color: step.active || step.done ? "#1e293b" : "#94a3b8", margin: 0,
                    }}>
                      {step.label}
                    </p>
                    <p style={{ fontSize: "9px", color: "#94a3b8", margin: "1px 0 0" }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status tabs (read-only) */}
          <div className="ht-status-tabs">
            <span style={{ fontSize: "11px", color: "#475569", fontWeight: "500", flexShrink: 0 }}>
              Trạng thái:
            </span>
            {STATUS_TABS.map(tab => {
              const isActive = selected.status === tab.key;
              return (
                <span key={tab.key} style={{
                  fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontWeight: "600",
                  background: isActive ? "#2563eb" : "#f1f5f9",
                  color: isActive ? "white" : "#64748b",
                  border: `1px solid ${isActive ? "#2563eb" : "#e2e8f0"}`,
                }}>
                  {tab.label}
                </span>
              );
            })}
          </div>

          {/* Chat area */}
          <div className="ht-chat-area">
            <div className="ht-chat-summary">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "12px" }}>
                  Khiếu nại: {ticketCode(selected.id)}
                </span>
                {selectedOrder && (
                  <>
                    <span style={{ color: "#e2e8f0" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#475569" }}>
                      Dịch vụ: {selectedOrder.itemName}
                    </span>
                  </>
                )}
              </div>
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
                    Khiếu nại đã giải quyết thành công
                  </p>
                  <p style={{ fontSize: "12px", color: "#166534" }}>
                    {selected.resolution ?? "Đơn hàng đã được xác nhận hoàn thành."}
                  </p>
                </div>
              </div>
            ) : selected.status === "PENDING_ADMIN" ? (
              <div className="ht-state-box" style={{ background: "#fdf4ff", borderColor: "#e9d5ff" }}>
                <ShieldAlert size={22} style={{ color: "#7c3aed", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#7c3aed", margin: "0 0 3px" }}>
                    Admin đang xem xét
                  </p>
                  <p style={{ fontSize: "12px", color: "#6d28d9" }}>
                    Bộ phận admin đang đánh giá khiếu nại và sẽ phán quyết sớm nhất có thể.
                  </p>
                </div>
              </div>
            ) : (
              <div className="ht-state-box" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
                <Clock size={22} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", margin: "0 0 3px" }}>
                    Đang xác minh đơn hàng
                  </p>
                  <p style={{ fontSize: "12px", color: "#78350f" }}>
                    Hệ thống đang xác minh. Nhà bán hàng sẽ phản hồi trong 12 giờ.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : selectedSupportTicket ? (
        <div className="ht-middle">
          {/* Title bar — chat hỗ trợ thuần túy, không progress steps, không status tabs */}
          <div className="ht-title-bar">
            <BackBtn href="/ho-tro" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Chat hỗ trợ với người bán
              </h1>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                <Link href="/don-hang" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                  Đơn #{selectedSupportTicket.order.orderCode}
                </Link>
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
                myRole="USER"
                notificationSoundUrl={notificationSoundUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="ht-middle ht-middle--empty">
          <MessageCircle size={44} style={{ color: "#cbd5e1" }} />
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Chọn ticket để xem chi tiết</p>
          <p style={{ fontSize: "12px", color: "#cbd5e1" }}>Chọn một khiếu nại từ danh sách bên trái</p>
        </div>
      )}

    </div>
  );
}
