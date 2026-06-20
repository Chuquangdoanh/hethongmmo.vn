import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  Search, Clock, CheckCircle, TicketCheck, ShieldAlert,
  ClipboardList, ShoppingBag, Banknote, Lock, ShieldCheck,
} from "lucide-react";
import TicketChatPanel from "./_components/TicketChatPanel";
import SlaTimer from "./_components/SlaTimer";
import TicketScrollLink from "./_components/TicketScrollLink";
import "./ho-tro.css";

export const metadata: Metadata = { title: "Ticket hỗ trợ" };

/* ─── Status display ──────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  OPEN:          "Chờ xử lý",
  IN_REVIEW:     "Đang xử lý",
  PENDING_ADMIN: "Đã phản hồi",
  RESOLVED:      "Đã hoàn thành",
  REJECTED:      "Đã đóng",
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

  /* Auto-redirect đến ticket đang hoạt động */
  if (!activeId && complaints.length > 0) {
    const first =
      complaints.find(c => c.status === "IN_REVIEW" || c.status === "PENDING_ADMIN") ??
      complaints[0]!;
    redirect(`/ho-tro?id=${first.id}`);
  }

  /* Order info cho list */
  const listOrderIds = complaints.map(c => c.orderId).filter(Boolean) as string[];
  const listOrders   = listOrderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: listOrderIds }, userId: me.id },
        select: { id: true, orderCode: true, itemName: true },
      })
    : [];
  const orderListMap = new Map(listOrders.map(o => [o.id, o]));

  /* ── Selected complaint ── */
  const selected = activeId
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

  if (activeId && !selected) redirect("/ho-tro");

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

  const initialResolution = chatRoom
    ? {
        sellerConfirmed: chatRoom.sellerConfirmed,
        sellerConfirmedAt: chatRoom.sellerConfirmedAt?.toISOString() ?? null,
        userDone: chatRoom.userDone,
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

  const chatEnded     = selected?.status === "RESOLVED" || selected?.status === "REJECTED" || selected?.status === "PENDING_ADMIN";
  const progressSteps = selected
    ? buildSteps(selected.status, selected.createdAt, selected.resolvedAt ?? null)
    : null;

  const STATUS_TABS = [
    { key: "IN_REVIEW",     label: "Đang xử lý" },
    { key: "PENDING_ADMIN", label: "Đã phản hồi" },
    { key: "RESOLVED",      label: "Đã hoàn thành" },
    { key: "REJECTED",      label: "Đã đóng" },
  ];

  return (
    <div className="ht-wrapper">

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
              {complaints.length} ticket
            </span>
          </div>
          <div className="ht-search">
            <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Tìm kiếm hội thoại...</span>
          </div>
        </div>

        <div className="ht-sidebar-list">
          {complaints.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <TicketCheck size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px", display: "block" }} />
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có ticket nào</p>
              <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                Khiếu nại đơn hàng để tạo ticket hỗ trợ
              </p>
            </div>
          ) : (
            complaints.map(c => {
              const o        = c.orderId ? orderListMap.get(c.orderId) : null;
              const isActive = c.id === activeId;
              const lastMsg  = c.chatRoom?.messages[0];
              const st       = STATUS_STYLE[c.status] ?? defaultStyle;

              return (
                <TicketScrollLink
                  key={c.id}
                  href={`/ho-tro?id=${c.id}`}
                  className={`ht-ticket-item${isActive ? " ht-ticket-item--active" : ""}`}
                >
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "12px", fontWeight: "700",
                        color: isActive ? "#1d4ed8" : "#1e293b", marginBottom: "2px",
                      }}>
                        {ticketCode(c.id)}
                      </p>
                      <p style={{
                        fontSize: "11px", color: "#475569",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: "1px",
                      }}>
                        {o ? `Đơn #${o.orderCode}` : "Không có đơn hàng"}
                      </p>
                      <p style={{
                        fontSize: "11px", color: "#64748b",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {o?.itemName ?? c.subject}
                      </p>
                      {lastMsg && (
                        <p style={{
                          fontSize: "10px", color: "#94a3b8", marginTop: "2px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {lastMsg.senderName}: {lastMsg.content}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <p style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "5px" }}>
                        {new Date(c.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </p>
                      <span style={{
                        display: "inline-block", fontSize: "9px", padding: "2px 7px",
                        borderRadius: "10px", fontWeight: "600",
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                      }}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
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
          {/* Breadcrumb */}
          <div className="ht-breadcrumb">
            <Link href="/" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none" }}>Trang chủ</Link>
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>›</span>
            <Link href="/ho-tro" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none" }}>Ticket hỗ trợ</Link>
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>›</span>
            <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "500" }}>Chi tiết khiếu nại</span>
          </div>

          {/* Title bar */}
          <div className="ht-title-bar">
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
                room={chatRoomForPanel}
                currentUserId={me.id}
                currentUserLabel={currentUserLabel}
                initialChatEnded={chatEnded}
                initialComplaintStatus={selected.status}
                initialQuota={initialQuota}
                initialResolution={initialResolution}
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
      ) : (
        <div className="ht-middle ht-middle--empty">
          <TicketCheck size={44} style={{ color: "#cbd5e1" }} />
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Chọn ticket để xem chi tiết</p>
          <p style={{ fontSize: "12px", color: "#cbd5e1" }}>Chọn một khiếu nại từ danh sách bên trái</p>
        </div>
      )}

      {/* ══ RIGHT — Thông tin đơn hàng + SLA ══════════════════════ */}
      {selected ? (
        <div className="ht-right">
          <div className="ht-right-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Thông tin đơn hàng</h3>
              <Link href="/don-hang" style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none" }}>Xem chi tiết</Link>
            </div>
            {selectedOrder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <InfoRow icon={<ClipboardList size={14} />} label="Mã đơn hàng">
                  <span style={{ fontSize: "12px", fontWeight: "700", fontFamily: "monospace", color: "#1e293b" }}>
                    #{selectedOrder.orderCode}
                  </span>
                </InfoRow>
                <InfoRow icon={<ShoppingBag size={14} />} label="Dịch vụ">
                  <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "500" }}>{selectedOrder.itemName}</span>
                </InfoRow>
                <InfoRow icon={<Banknote size={14} />} label="Số tiền">
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>
                    {formatVnd(Number(selectedOrder.finalPrice))}
                  </span>
                </InfoRow>
                <InfoRow icon={<Lock size={14} />} label="Trạng thái tiền">
                  <span style={{
                    fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                    background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", fontWeight: "600",
                  }}>
                    Đang bị treo
                  </span>
                </InfoRow>
                <InfoRow icon={<Clock size={14} />} label="Thời gian mua">
                  <span style={{ fontSize: "11px", color: "#475569" }}>{formatDate(selectedOrder.createdAt)}</span>
                </InfoRow>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>Không có thông tin đơn hàng</p>
            )}
          </div>

          {/* SLA Timer */}
          {selected.status === "IN_REVIEW" && (
            <>
              <div className="ht-divider" />
              <div className="ht-right-section">
                <h3 style={{
                  fontSize: "13px", fontWeight: "700", color: "#dc2626",
                  margin: "0 0 14px", display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <Clock size={13} />
                  Thời gian SLA phản hồi
                </h3>
                <SlaTimer
                  startAt={selected.chatRoom?.createdAt?.toISOString() ?? selected.createdAt.toISOString()}
                  durationMinutes={60}
                />
              </div>
            </>
          )}

          <div className="ht-divider" />
          <div className="ht-right-section">
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} style={{ color: "#16a34a" }} />
              Quyền lợi của bạn
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {[
                "Nhà bán hàng phải phản hồi trong 12 giờ",
                "Tự động hoàn tiền nếu seller không hỗ trợ",
                "Tối đa 20 tin nhắn để giải quyết",
                "Admin phán quyết khi không đồng thuận",
              ].map(r => (
                <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <circle cx="7" cy="7" r="7" fill="#dcfce7" />
                    <path d="M4 7.5L5.8 9.5L10 4.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "#475569", lineHeight: "1.45" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ht-right" />
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, lineHeight: 1, color: "#64748b", marginTop: "1px" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px" }}>{label}</p>
        {children}
      </div>
    </div>
  );
}
