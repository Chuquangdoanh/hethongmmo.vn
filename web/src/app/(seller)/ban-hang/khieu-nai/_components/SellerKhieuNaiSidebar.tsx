"use client";

import { useState } from "react";
import { Search, MessageCircleWarning, MessageCircle } from "lucide-react";
import TicketScrollLink from "@/app/(user)/ho-tro/_components/TicketScrollLink";

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

export interface ComplaintListItem {
  id: string;
  status: string;
  updatedAt: string;
  buyerName: string;
  orderCode?: string;
  itemName?: string;
  subject: string;
  lastMsgSenderName?: string;
  lastMsgContent?: string;
}

export interface SupportTicketListItem {
  id: string;
  updatedAt: string;
  buyerName: string;
  orderCode: string;
  itemName: string;
  lastMsgSenderName?: string;
  lastMsgContent?: string;
}

export interface PreSaleChatListItem {
  id: string;
  updatedAt: string;
  buyerName: string;
  orderCode?: string;
  itemName?: string;
  lastMsgSenderName?: string;
  lastMsgContent?: string;
}

export type ConversationItem =
  | ({ kind: "complaint" } & ComplaintListItem)
  | ({ kind: "support" } & SupportTicketListItem)
  | ({ kind: "presale" } & PreSaleChatListItem);

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

function codeLabel(item: ConversationItem): string {
  if (item.kind === "complaint") return ticketCode(item.id);
  if (item.kind === "support") return `Đơn #${item.orderCode}`;
  return "Tư vấn mua hàng";
}

interface Props {
  items: ConversationItem[];
  activeId?: string;
}

export default function SellerKhieuNaiSidebar({ items, activeId }: Props) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          codeLabel(item).toLowerCase().includes(q) ||
          item.buyerName.toLowerCase().includes(q) ||
          (item.kind === "complaint" && item.subject.toLowerCase().includes(q)) ||
          (item.orderCode?.toLowerCase().includes(q) ?? false) ||
          (item.itemName?.toLowerCase().includes(q) ?? false)
        );
      })
    : items;

  return (
    <>
      <div className="ht-sidebar-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
            Danh sách hội thoại
          </span>
          <span style={{
            fontSize: "10px", padding: "2px 8px", background: "#f1f5f9",
            borderRadius: "20px", border: "1px solid #e2e8f0", color: "#64748b",
          }}>
            {query.trim() ? `${filtered.length}/${items.length}` : `${items.length}`} hội thoại
          </span>
        </div>
        <div className="ht-search">
          <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã, tên, đơn hàng..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "12px", color: "#1e293b",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                border: "none", background: "none", cursor: "pointer",
                color: "#94a3b8", fontSize: "14px", lineHeight: 1, padding: 0,
                flexShrink: 0,
              }}
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="ht-sidebar-list">
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <MessageCircleWarning size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              {query.trim() ? "Không tìm thấy hội thoại nào" : "Chưa có hội thoại nào"}
            </p>
            {query.trim() ? (
              <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                Thử tìm bằng mã đơn, tên khách hoặc mã khiếu nại
              </p>
            ) : (
              <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                Tiếp tục duy trì chất lượng sản phẩm tốt nhé!
              </p>
            )}
          </div>
        ) : (
          filtered.map((item) => {
            const id =
              item.kind === "complaint" ? item.id
              : item.kind === "support"  ? `st-${item.id}`
              : `pc-${item.id}`;
            const isActive = id === activeId;

            return (
              <TicketScrollLink
                key={`${item.kind}-${item.id}`}
                href={`/ban-hang/khieu-nai?id=${id}`}
                className={`ht-ticket-item${isActive ? " ht-ticket-item--active" : ""}`}
              >
                <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "12px", fontWeight: "700",
                      color: isActive ? "#ea580c" : "#1e293b", marginBottom: "2px",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}>
                      {item.kind !== "complaint" && <MessageCircle size={11} style={{ flexShrink: 0 }} />}
                      {codeLabel(item)}
                    </p>
                    <p style={{
                      fontSize: "11px", color: "#475569",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      marginBottom: "1px",
                    }}>
                      Từ: {item.buyerName}
                    </p>
                    <p style={{
                      fontSize: "11px", color: "#64748b",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.kind === "complaint"
                        ? (item.orderCode ? `Đơn #${item.orderCode} · ${item.itemName}` : item.subject)
                        : item.kind === "support"
                          ? item.itemName
                          : "Trước khi đặt mua"}
                    </p>
                    {item.lastMsgContent && (
                      <p style={{
                        fontSize: "10px", color: "#94a3b8", marginTop: "2px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.lastMsgSenderName}: {item.lastMsgContent}
                      </p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "5px" }}>
                      {new Date(item.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
                    </p>
                    {item.kind === "complaint" ? (
                      <span style={{
                        display: "inline-block", fontSize: "9px", padding: "2px 7px",
                        borderRadius: "10px", fontWeight: "600",
                        background: (STATUS_STYLE[item.status] ?? defaultStyle).bg,
                        color: (STATUS_STYLE[item.status] ?? defaultStyle).color,
                        border: `1px solid ${(STATUS_STYLE[item.status] ?? defaultStyle).border}`,
                      }}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-block", fontSize: "9px", padding: "2px 7px",
                        borderRadius: "10px", fontWeight: "600",
                        background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                      }}>
                        {item.kind === "presale" ? "Tư vấn" : "Chat hỗ trợ"}
                      </span>
                    )}
                  </div>
                </div>
              </TicketScrollLink>
            );
          })
        )}
      </div>
    </>
  );
}
