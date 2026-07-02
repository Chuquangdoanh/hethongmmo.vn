"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatVnd, formatDate } from "@/lib/utils/format";

interface CustomerOrder {
  id: string;
  orderCode: string;
  orderType: string;
  itemName: string;
  finalPrice: string;
  status: string;
  createdAt: string;
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  SERVICE: "Dịch vụ",
  COURSE: "Khóa học",
  TUTTRICK: "Tut / Tricks",
  MMO_PRODUCT: "Tài nguyên MMO",
  SELLER_PRODUCT: "Sản phẩm Seller",
  KHUONGFB_PRODUCT: "Sản phẩm Khuongfb",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang xử lý",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
  DISPUTED: "Đang tranh chấp",
  FROZEN: "Tạm khóa",
};

export default function CustomerOrdersRow({
  affiliateId,
  customerId,
  fullName,
  email,
  joinedAt,
}: {
  affiliateId: string;
  customerId: string;
  fullName: string;
  email: string;
  joinedAt: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && orders === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/affiliates/${affiliateId}/customers/${customerId}/orders`);
        const json = (await res.json()) as { data?: CustomerOrder[] };
        setOrders(json.data ?? []);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={handleToggle}>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {fullName}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500">{email}</td>
        <td className="px-4 py-3 text-gray-500">{joinedAt ? formatDate(joinedAt) : "—"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className="px-4 pb-3 pt-0 bg-gray-50">
            {loading ? (
              <p className="text-xs text-gray-400 py-2">Đang tải đơn hàng...</p>
            ) : orders && orders.length > 0 ? (
              <table className="w-full text-xs border border-gray-200 rounded-md overflow-hidden">
                <thead className="bg-gray-100 text-left text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Mã đơn</th>
                    <th className="px-3 py-2">Loại</th>
                    <th className="px-3 py-2">Sản phẩm</th>
                    <th className="px-3 py-2">Giá trị</th>
                    <th className="px-3 py-2">Trạng thái</th>
                    <th className="px-3 py-2">Ngày mua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2 font-mono">{o.orderCode}</td>
                      <td className="px-3 py-2">{ORDER_TYPE_LABEL[o.orderType] ?? o.orderType}</td>
                      <td className="px-3 py-2">{o.itemName}</td>
                      <td className="px-3 py-2">{formatVnd(Number(o.finalPrice))}</td>
                      <td className="px-3 py-2">{STATUS_LABEL[o.status] ?? o.status}</td>
                      <td className="px-3 py-2">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 py-2">Khách hàng này chưa có đơn hàng nào</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
