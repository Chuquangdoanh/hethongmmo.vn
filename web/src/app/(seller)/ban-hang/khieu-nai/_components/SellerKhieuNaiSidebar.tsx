"use client";

import { useState } from "react";
import { Search, MessageCircleWarning } from "lucide-react";
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

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

interface Props {
  complaints: ComplaintListItem[];
  activeId?: string;
}

export default function SellerKhieuNaiSidebar({ complaints, activeId }: Props) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? complaints.filter((c) => {
        const q = query.toLowerCase();
        return (
          ticketCode(c.id).toLowerCase().includes(q) ||
          c.buyerName.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          (c.orderCode?.toLowerCase().includes(q) ?? false) ||
          (c.itemName?.toLowerCase().includes(q) ?? false)
        );
      })
    : complaints;

  return (
    <>
      <div className="ht-sidebar-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
            Khiếu nại từ khách
          </span>
          <span style={{
            fontSize: "10px", padding: "2px 8px", background: "#f1f5f9",
            borderRadius: "20px", border: "1px solid #e2e8f0", color: "#64748b",
          }}>
            {query.trim() ? `${filtered.length}/${complaints.length}` : `${complaints.length}`} khiếu nại
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
              {query.trim() ? "Không tìm thấy khiếu nại nào" : "Chưa có khiếu nại nào"}
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
          filtered.map((c) => {
            const isActive = c.id === activeId;
            const st = STATUS_STYLE[c.status] ?? defaultStyle;

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
                      Từ: {c.buyerName}
                    </p>
                    <p style={{
                      fontSize: "11px", color: "#64748b",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {c.orderCode ? `Đơn #${c.orderCode} · ${c.itemName}` : c.subject}
                    </p>
                    {c.lastMsgContent && (
                      <p style={{
                        fontSize: "10px", color: "#94a3b8", marginTop: "2px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.lastMsgSenderName}: {c.lastMsgContent}
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
    </>
  );
}
