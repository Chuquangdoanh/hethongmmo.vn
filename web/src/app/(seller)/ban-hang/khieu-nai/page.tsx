import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  Search, Clock, CheckCircle, MessageCircleWarning,
  ClipboardList, ShoppingBag, Banknote, ShieldCheck,
} from "lucide-react";
import TicketChatPanel from "@/app/(user)/ho-tro/_components/TicketChatPanel";
import TicketScrollLink from "@/app/(user)/ho-tro/_components/TicketScrollLink";
import ScrollToTop from "@/components/shared/ScrollToTop";
import BackBtn from "@/components/shared/BackBtn";
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

  /* ── Selected complaint (middle + right panel) ── */
  const selected = activeId
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

  if (activeId && !selected) redirect("/ban-hang/khieu-nai");

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

      {/* ══ LEFT — Danh sách khiếu nại ═══════════════════════════ */}
      <div className="ht-sidebar">
        <div className="ht-sidebar-head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Khiếu nại từ khách
            </span>
            <span style={{
              fontSize: "10px", padding: "2px 8px", background: "#f1f5f9",
              borderRadius: "20px", border: "1px solid #e2e8f0", color: "#64748b",
            }}>
              {complaints.length} khiếu nại
            </span>
          </div>
          <div className="ht-search">
            <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Tìm kiếm...</span>
          </div>
        </div>

        <div className="ht-sidebar-list">
          {complaints.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <MessageCircleWarning size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px", display: "block" }} />
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có khiếu nại nào</p>
              <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                Tiếp tục duy trì chất lượng sản phẩm tốt nhé!
              </p>
            </div>
          ) : (
            complaints.map((c) => {
              const o        = c.orderId ? orderListMap.get(c.orderId) : null;
              const isActive = c.id === activeId;
              const lastMsg  = c.chatRoom?.messages[0];
              const st       = STATUS_STYLE[c.status] ?? defaultStyle;
              const buyerName = c.user.fullName ?? c.user.email;

              return (
                <TicketScrollLink
                  key={c.id}
                  href={`/ban-hang/khieu-nai?id=${c.id}`}
                  className={`ht-ticket-item${isActive ? " ht-ticket-item--active" : ""}`}
                >
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "12px", fontWeight: "700",
                        color: isActive ? "#ea580c" : "#1e293b", marginBottom: "2px",
                      }}>
                        {ticketCode(c.id)}
                      </p>
                      <p style={{
                        fontSize: "11px", color: "#475569",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: "1px",
                      }}>
                        Từ: {buyerName}
                      </p>
                      <p style={{
                        fontSize: "11px", color: "#64748b",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {o ? `Đơn #${o.orderCode} · ${o.itemName}` : c.subject}
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
                        {new Date(c.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
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
      ) : (
        <div className="ht-middle ht-middle--empty">
          <MessageCircleWarning size={44} style={{ color: "#cbd5e1" }} />
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Chọn khiếu nại để xem chi tiết</p>
          <p style={{ fontSize: "12px", color: "#cbd5e1" }}>Chọn một khiếu nại từ danh sách bên trái</p>
        </div>
      )}

      {/* ══ RIGHT — Thông tin đơn hàng ═══════════════════════════ */}
      {selected ? (
        <div className="ht-right">
          {selectedOrder && (
            <div className="ht-right-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Thông tin đơn hàng</h3>
                <Link href="/ban-hang/don-hang" style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none" }}>
                  Xem chi tiết ↗
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <InfoRow icon={<ClipboardList size={14} />} label="Mã đơn hàng">
                  <span style={{ fontSize: "12px", fontWeight: "700", fontFamily: "monospace", color: "#1e293b" }}>
                    #{selectedOrder.orderCode}
                  </span>
                </InfoRow>
                <InfoRow icon={<ShoppingBag size={14} />} label="Sản phẩm">
                  <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "500" }}>{selectedOrder.itemName}</span>
                </InfoRow>
                <InfoRow icon={<Banknote size={14} />} label="Giá trị đơn">
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>
                    {formatVnd(Number(selectedOrder.finalPrice))}
                  </span>
                </InfoRow>
                <InfoRow icon={<Clock size={14} />} label="Ngày mua">
                  <span style={{ fontSize: "11px", color: "#475569" }}>{formatDate(selectedOrder.createdAt)}</span>
                </InfoRow>
              </div>
            </div>
          )}

          <div className="ht-divider" />

          <div className="ht-right-section">
            <h3 style={{
              fontSize: "13px", fontWeight: "700", color: "#0f172a",
              margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px",
            }}>
              <ShieldCheck size={14} style={{ color: "#f59e0b" }} />
              Hướng dẫn xử lý
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {[
                "Phản hồi trong 12 giờ để tránh tự động hoàn tiền",
                "Cung cấp bằng chứng xác nhận đã giao hàng đúng",
                "Sau 20 tin nhắn: bấm xác nhận đơn hoàn thành",
                "Nếu hai bên không đồng ý, admin sẽ phân xử",
              ].map((r) => (
                <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <circle cx="7" cy="7" r="7" fill="#fef3c7" />
                    <path d="M4 7.5L5.8 9.5L10 4.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
