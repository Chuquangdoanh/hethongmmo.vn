import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import OrderStatusForm from "./OrderStatusForm";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",  cls: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  PROCESSING: { label: "Đang xử lý", cls: "bg-[#7C3AED]/10 text-[#A855F7]" },
  DONE:       { label: "Hoàn thành", cls: "bg-[#10B981]/10 text-[#10B981]" },
  FROZEN:     { label: "Đóng băng",  cls: "bg-[#0891b2]/10 text-[#0891b2]" },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true, orderCode: true, orderType: true, itemName: true,
      originalPrice: true, finalPrice: true, warrantyVariant: true,
      paymentMethod: true, status: true, customerNote: true,
      createdAt: true, completedAt: true,
      user: { select: { id: true, email: true, fullName: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, amount: true, description: true, createdAt: true },
      },
    },
  });

  if (!order) notFound();

  // Parse customerNote JSON (submitted by user during order)
  let noteData: Record<string, string> | null = null;
  if (order.customerNote) {
    try { noteData = JSON.parse(order.customerNote) as Record<string, string>; } catch { /* raw string */ }
  }

  const NOTE_LABELS: Record<string, string> = {
    imei: "IMEI máy", link: "Link tài khoản",
    accountPass: "Tài khoản / Pass", gmailPass: "Gmail / Pass",
    zaloPhone: "SĐT Zalo liên hệ", accountType: "Loại tài khoản",
    phone: "Số điện thoại", name: "Họ tên",
    note: "Ghi chú", cccdUrl: "CCCD mặt trước",
  };

  const rows = [
    { label: "Mã đơn", value: order.orderCode },
    { label: "Loại đơn", value: order.orderType },
    { label: "Sản phẩm", value: order.itemName },
    { label: "Giá gốc", value: formatVnd(Number(order.originalPrice)) },
    { label: "Giá cuối", value: formatVnd(Number(order.finalPrice)) },
    { label: "Hình thức TT", value: order.paymentMethod },
    order.warrantyVariant ? { label: "Bảo hành", value: order.warrantyVariant } : null,
    { label: "Ngày tạo", value: formatDate(order.createdAt) },
    order.completedAt ? { label: "Ngày hoàn thành", value: formatDate(order.completedAt) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="text-xs text-gray-500 hover:text-gray-500">← Đơn hàng</Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[order.status]?.cls ?? "bg-gray-100 text-gray-500"}`}>
          {STATUS_BADGES[order.status]?.label ?? order.status}
        </span>
      </div>

      {/* Buyer info */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Người mua</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900">{order.user.fullName}</p>
            <p className="text-xs text-gray-500">{order.user.email}</p>
          </div>
          <Link
            href={`/admin/users/${order.user.id}`}
            className="text-xs text-[#7C3AED] hover:text-[#A855F7]"
          >
            Xem tài khoản →
          </Link>
        </div>
      </div>

      {/* Order details */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h2>
        <div className="space-y-2.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-500 font-mono text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      {order.transactions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Giao dịch liên quan</h2>
          </div>
          {order.transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={`flex items-center justify-between px-5 py-3 ${i !== 0 ? "border-t border-gray-200" : ""}`}
            >
              <div>
                <p className="text-xs text-gray-900">{tx.description}</p>
                <p className="text-[10px] text-gray-500">{tx.type} · {formatDate(tx.createdAt)}</p>
              </div>
              <span className="text-sm text-[#A855F7] font-medium">
                {formatVnd(Number(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Customer note / submitted info */}
      {noteData && Object.keys(noteData).length > 0 && (
        <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5">
          <h2 className="text-sm font-semibold text-[#7C3AED] mb-4">Thông tin khách hàng gửi</h2>
          <div className="space-y-3">
            {Object.entries(noteData).map(([key, val]) => {
              if (!val) return null;
              const label = NOTE_LABELS[key] ?? key;
              if (key === "cccdUrl") {
                return (
                  <div key={key}>
                    <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={val}
                      alt="CCCD mặt trước"
                      className="rounded-xl border border-gray-200 max-w-xs w-full object-contain"
                    />
                    <a href={val} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[#7C3AED] underline">
                      Xem full →
                    </a>
                  </div>
                );
              }
              const display = key === "accountType"
                ? (val === "chinh_chu" ? "Chính chủ" : "Không chính chủ")
                : val;
              return (
                <div key={key} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="text-gray-900 font-mono text-xs text-right break-all">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status management */}
      <OrderStatusForm orderId={id} currentStatus={order.status} />
    </div>
  );
}
