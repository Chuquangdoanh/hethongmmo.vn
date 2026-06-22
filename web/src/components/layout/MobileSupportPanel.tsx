"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageCircle, ChevronRight, RefreshCw } from "lucide-react";

interface TicketItem {
  id:             string;
  subject:        string;
  status:         string;
  updatedAt:      string;
  orderCode:      string | null;
  itemName:       string | null;
  buyerName?:     string | null;   // seller view only
  lastMsgSender:  string | null;
  lastMsgContent: string | null;
}

const DEFAULT_STATUS_LABEL: Record<string, string> = {
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
  REJECTED:      { bg: "#fef2f2", color: "#dc2626",  border: "#fecaca" },
};

const ticketCode = (id: string) => `#KN-${id.slice(0, 8).toUpperCase()}`;

interface Props {
  isOpen:        boolean;
  onNav:         () => void;
  apiUrl?:       string;                    // default: /api/user/complaints
  detailBase?:   string;                    // default: /ho-tro
  statusLabels?: Record<string, string>;    // override per-role
  emptyText?:    string;
}

export default function MobileSupportPanel({
  isOpen,
  onNav,
  apiUrl     = "/api/user/complaints",
  detailBase = "/ho-tro",
  statusLabels,
  emptyText  = "Khiếu nại đơn hàng để tạo ticket hỗ trợ",
}: Props) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const labels = statusLabels
    ? { ...DEFAULT_STATUS_LABEL, ...statusLabels }
    : DEFAULT_STATUS_LABEL;

  const fetchTickets = () => {
    setLoading(true);
    setError("");
    fetch(apiUrl)
      .then((r) => r.json())
      .then((r: { data?: TicketItem[] }) => {
        if (Array.isArray(r.data)) setTickets(r.data);
        else setError("Không thể tải danh sách ticket.");
      })
      .catch(() => setError("Lỗi kết nối, vui lòng thử lại."))
      .finally(() => setLoading(false));
  };

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) fetchTickets();
    prevOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (loading) {
    return (
      <div className="msup-state">
        <div className="msup-spinner" />
        <p className="msup-state-text">Đang tải danh sách...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="msup-state msup-state--error">
        <p className="msup-state-text">{error}</p>
        <button className="msup-retry" onClick={fetchTickets}>
          <RefreshCw size={14} />
          Thử lại
        </button>
      </div>
    );
  }

  if (!loading && tickets.length === 0) {
    return (
      <div className="msup-state">
        <MessageCircle size={36} className="msup-empty-icon" />
        <p className="msup-state-title">Chưa có khiếu nại nào</p>
        <p className="msup-state-text">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="msup-list">
      {tickets.map((ticket) => {
        const st   = STATUS_STYLE[ticket.status] ?? STATUS_STYLE["REJECTED"]!;
        const date = new Date(ticket.updatedAt).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit",
        });
        return (
          <Link
            key={ticket.id}
            href={`${detailBase}?id=${ticket.id}`}
            className="msup-row"
            onClick={onNav}
            prefetch={false}
          >
            <div className="msup-row-body">
              <div className="msup-row-top">
                <span className="msup-code">{ticketCode(ticket.id)}</span>
                <span
                  className="msup-badge"
                  style={{ background: st.bg, color: st.color, borderColor: st.border }}
                >
                  {labels[ticket.status] ?? ticket.status}
                </span>
                <span className="msup-date">{date}</span>
              </div>

              <p className="msup-item-name">
                {ticket.itemName ?? ticket.subject}
              </p>

              {ticket.buyerName && (
                <p className="msup-order-code">Khách: {ticket.buyerName}</p>
              )}

              {ticket.orderCode && !ticket.buyerName && (
                <p className="msup-order-code">Đơn #{ticket.orderCode}</p>
              )}

              {ticket.lastMsgContent && (
                <p className="msup-last-msg">
                  <span className="msup-last-sender">{ticket.lastMsgSender}:</span>{" "}
                  {ticket.lastMsgContent}
                </p>
              )}
            </div>
            <ChevronRight size={16} className="msup-chevron" />
          </Link>
        );
      })}
    </div>
  );
}
