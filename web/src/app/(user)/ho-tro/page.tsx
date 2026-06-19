import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { Search, Clock, CheckCircle, TicketCheck, MessageCircle } from "lucide-react";
import TicketChatPanel from "./_components/TicketChatPanel";
import SlaTimer from "./_components/SlaTimer";
import "./ho-tro.css";

export const metadata: Metadata = { title: "Ticket hỗ trợ" };

/* ─── Status display ──────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Chờ xử lý", IN_REVIEW: "Đang xử lý",
  RESOLVED: "Đã hoàn thành", REJECTED: "Đã đóng",
};
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:      { bg: "#fffbeb", color: "#b45309",  border: "#fde68a" },
  IN_REVIEW: { bg: "#eff6ff", color: "#1d4ed8",  border: "#bfdbfe" },
  RESOLVED:  { bg: "#f0fdf4", color: "#15803d",  border: "#bbf7d0" },
  REJECTED:  { bg: "#f8fafc", color: "#64748b",  border: "#e2e8f0" },
};
const defaultStyle = { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

/* ─── Progress steps builder ──────────────────────────────────── */
function buildSteps(
  status: string,
  createdAt: Date,
  chatRoomCreatedAt: Date | null,
  resolvedAt: Date | null,
) {
  const hasChatRoom = chatRoomCreatedAt != null;
  const isDone      = status === "RESOLVED" || status === "REJECTED";

  return [
    {
      n: 1, label: "Đã mở khiếu nại",
      sub: formatDate(createdAt),
      done: true, active: !hasChatRoom && !isDone,
    },
    {
      n: 2, label: "Seller phản hồi",
      sub: hasChatRoom ? formatDate(chatRoomCreatedAt!) : "Đang chờ phản hồi",
      done: hasChatRoom, active: hasChatRoom && !isDone,
    },
    {
      n: 3, label: "Đang xử lý",
      sub: "Trong thời gian SLA",
      done: isDone, active: status === "IN_REVIEW",
    },
    {
      n: 4, label: "Chờ phản hồi thêm",
      sub: "Nếu cần thiết",
      done: isDone, active: false,
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

  /* Auto-redirect to first active ticket */
  if (!activeId && complaints.length > 0) {
    const first =
      complaints.find(c => c.status === "OPEN" || c.status === "IN_REVIEW") ??
      complaints[0]!;
    redirect(`/ho-tro?id=${first.id}`);
  }

  /* Order info for list */
  const listOrderIds = complaints.map(c => c.orderId).filter(Boolean) as string[];
  const listOrders   = listOrderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: listOrderIds }, userId: me.id },
        select: { id: true, orderCode: true, itemName: true },
      })
    : [];
  const orderListMap = new Map(listOrders.map(o => [o.id, o]));

  /* ── Selected complaint (middle + right panels) ── */
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

  const chatRoomForPanel: {
    id: string;
    participants: Array<{ userId: string; label: string; userName: string }>;
    messages: Array<{ id: string; senderId: string; senderName: string; senderLabel: string; content: string; createdAt: string }>;
  } | null = selected?.chatRoom
    ? {
        id: selected.chatRoom.id,
        participants: selected.chatRoom.participants.map(p => ({
          userId:   p.userId,
          label:    p.label,
          userName: p.label === "Nhà bán hàng"
            ? `Seller #${p.userId.slice(0, 8).toUpperCase()}`
            : (p.user.fullName ?? p.user.email),
        })),
        messages: selected.chatRoom.messages.map(m => ({
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
    ? buildSteps(
        selected.status,
        selected.createdAt,
        selected.chatRoom?.createdAt ?? null,
        selected.resolvedAt ?? null,
      )
    : null;

  /* ── Status tab config ── */
  const STATUS_TABS = [
    { key: "IN_REVIEW", label: "Đang xử lý" },
    { key: "OPEN",      label: "Chờ khách hàng phản hồi" },
    { key: "RESOLVED",  label: "Đã xử lý thành công" },
    { key: "REJECTED",  label: "Đã xử lý thất bại" },
  ];

  return (
    <div className="ht-wrapper">

      {/* ══ LEFT — Danh sách ticket ═══════════════════════════════ */}
      <div className="ht-sidebar">

        {/* Header */}
        <div className="ht-sidebar-head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Danh sách hội thoại
            </span>
            <span style={{
              fontSize: "10px", padding: "2px 8px",
              background: "#f1f5f9", borderRadius: "20px",
              border: "1px solid #e2e8f0", color: "#64748b",
            }}>
              Tất cả
            </span>
          </div>
          <div className="ht-search">
            <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Tìm kiếm hội thoại...</span>
          </div>
        </div>

        {/* Ticket list */}
        <div className="ht-sidebar-list">
          {complaints.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <MessageCircle size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px", display: "block" }} />
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
                <Link
                  key={c.id}
                  href={`/ho-tro?id=${c.id}`}
                  className={`ht-ticket-item${isActive ? " ht-ticket-item--active" : ""}`}
                >
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "12px", fontWeight: "700",
                        color: isActive ? "#1d4ed8" : "#1e293b",
                        marginBottom: "2px",
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
                        {new Date(c.updatedAt).toLocaleDateString("vi-VN", {
                          day: "2-digit", month: "2-digit",
                        })}
                      </p>
                      <span style={{
                        display: "inline-block",
                        fontSize: "9px", padding: "2px 7px",
                        borderRadius: "10px", fontWeight: "600",
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.border}`,
                      }}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                  </div>
                </Link>
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
            <Link href="/" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none" }}>
              Trang chủ
            </Link>
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>›</span>
            <Link href="/ho-tro" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none" }}>
              Ticket hỗ trợ
            </Link>
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>›</span>
            <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "500" }}>
              Chi tiết khiếu nại
            </span>
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
                  <Link href="/don-hang" style={{ color: "#2563eb", textDecoration: "none" }}>
                    Xem chi tiết đơn hàng ↗
                  </Link>
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
                        <path d="M2.5 6.5L5 9L10.5 3.5"
                          stroke="white" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span style={{
                        fontSize: "11px", fontWeight: "700",
                        color: step.active ? "white" : "#94a3b8",
                      }}>
                        {step.n}
                      </span>
                    )}
                  </div>
                  <div className="ht-step-label">
                    <p style={{
                      fontSize: "10px",
                      fontWeight: step.active || step.done ? "600" : "400",
                      color: step.active || step.done ? "#1e293b" : "#94a3b8",
                      margin: 0,
                    }}>
                      {step.label}
                    </p>
                    <p style={{ fontSize: "9px", color: "#94a3b8", margin: "1px 0 0" }}>
                      {step.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status tabs (read-only) */}
          <div className="ht-status-tabs">
            <span style={{ fontSize: "11px", color: "#475569", fontWeight: "500", flexShrink: 0 }}>
              Trạng thái xử lý cuộc trò chuyện
            </span>
            {STATUS_TABS.map(tab => {
              const isActive = selected.status === tab.key;
              return (
                <span key={tab.key} style={{
                  fontSize: "10px", padding: "3px 10px",
                  borderRadius: "20px", fontWeight: "600",
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
            {/* Ticket summary bar */}
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

            {/* Chat or waiting state */}
            {chatRoomForPanel ? (
              <TicketChatPanel
                room={chatRoomForPanel}
                currentUserId={me.id}
                initialChatEnded={chatEnded}
              />
            ) : chatEnded ? (
              <div className="ht-state-box" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <CheckCircle size={22} style={{ color: "#16a34a", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#15803d", margin: "0 0 3px" }}>
                    Khiếu nại đã được xử lý
                  </p>
                  <p style={{ fontSize: "12px", color: "#166534" }}>
                    Bộ phận hỗ trợ đã xem xét và xử lý khiếu nại. Liên hệ thêm: Zalo 0393.118.789
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
                    Hệ Thống MMO đang xác minh đơn hàng. Vui lòng chờ đội ngũ hỗ trợ phản hồi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty middle */
        <div className="ht-middle ht-middle--empty">
          <TicketCheck size={44} style={{ color: "#cbd5e1" }} />
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>
            Chọn ticket để xem chi tiết
          </p>
          <p style={{ fontSize: "12px", color: "#cbd5e1" }}>
            Chọn một khiếu nại từ danh sách bên trái
          </p>
        </div>
      )}

      {/* ══ RIGHT — Thông tin đơn hàng + SLA ══════════════════════ */}
      {selected ? (
        <div className="ht-right">

          {/* Order info */}
          <div className="ht-right-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Thông tin đơn hàng
              </h3>
              <Link href="/don-hang" style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none" }}>
                Xem chi tiết
              </Link>
            </div>

            {selectedOrder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <InfoRow icon="📋" label="Mã đơn hàng">
                  <span style={{ fontSize: "12px", fontWeight: "700", fontFamily: "monospace", color: "#1e293b" }}>
                    #{selectedOrder.orderCode}
                  </span>
                </InfoRow>
                <InfoRow icon="🛍️" label="Dịch vụ">
                  <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "500" }}>
                    {selectedOrder.itemName}
                  </span>
                </InfoRow>
                <InfoRow icon="💰" label="Số tiền">
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>
                    {formatVnd(Number(selectedOrder.finalPrice))}
                  </span>
                </InfoRow>
                <InfoRow icon="✅" label="Thanh toán">
                  <span style={{
                    fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                    background: "#f0fdf4", color: "#15803d",
                    border: "1px solid #bbf7d0", fontWeight: "600",
                  }}>
                    Đã thanh toán
                  </span>
                </InfoRow>
                <InfoRow icon="🕐" label="Thời gian mua">
                  <span style={{ fontSize: "11px", color: "#475569" }}>
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </InfoRow>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>Không có thông tin đơn hàng</p>
            )}
          </div>

          {/* SLA Timer — chỉ hiện khi đang IN_REVIEW */}
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

          {/* Rights */}
          <div className="ht-divider" />
          <div className="ht-right-section">
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>
              ✅ Quyền lợi của bạn
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {[
                "Được hỗ trợ trong 60 phút",
                "Bảo vệ bởi hệ thống hoàn tiền",
                "Thông tin đơn hàng bảo mật tuyệt đối",
              ].map(r => (
                <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <circle cx="7" cy="7" r="7" fill="#dcfce7" />
                    <path d="M4 7.5L5.8 9.5L10 4.5"
                      stroke="#16a34a" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
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

/* ── Helper component ─────────────────────────────────────────── */
function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px" }}>{label}</p>
        {children}
      </div>
    </div>
  );
}
