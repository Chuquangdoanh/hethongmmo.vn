import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import OrderStatusForm from "./OrderStatusForm";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",  cls: "bg-[#F59E0B]/15 text-[#92400e]" },
  PROCESSING: { label: "Đang xử lý", cls: "bg-[#7C3AED]/15 text-[#5b21b6]" },
  DONE:       { label: "Hoàn thành", cls: "bg-[#10B981]/15 text-[#065f46]" },
  FROZEN:     { label: "Đóng băng",  cls: "bg-[#0891b2]/15 text-[#164e63]" },
};

const TX_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Mua hàng", REFUND: "Hoàn tiền",
  DEPOSIT: "Nạp tiền", WITHDRAWAL: "Rút tiền",
};

const NOTE_LABELS: Record<string, string> = {
  imei: "IMEI máy", link: "Link tài khoản",
  accountPass: "Tài khoản / Pass", gmailPass: "Gmail / Pass",
  zaloPhone: "SĐT Zalo liên hệ", accountType: "Loại tài khoản",
  phone: "Số điện thoại", name: "Họ tên",
  note: "Ghi chú", cccdUrl: "CCCD mặt trước",
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

  let noteData: Record<string, string> | null = null;
  if (order.customerNote) {
    try { noteData = JSON.parse(order.customerNote) as Record<string, string>; } catch { /* raw string */ }
  }

  const badge = STATUS_BADGES[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1.5">Chi tiết đơn hàng</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{order.orderCode}</p>
        </div>
        <span className={`mt-1 px-3 py-1.5 rounded-full text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── LEFT: 2/3 ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Thông tin đơn hàng */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Thông tin đơn hàng</h2>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <Row label="Mã đơn"        value={order.orderCode} mono />
                <Row label="Loại đơn"      value={order.orderType} />
                <Row label="Sản phẩm"      value={order.itemName} span />
                <Row label="Giá gốc"       value={formatVnd(Number(order.originalPrice))} />
                <Row label="Giá cuối"      value={formatVnd(Number(order.finalPrice))} highlight />
                <Row label="Hình thức TT"  value={order.paymentMethod} />
                {order.warrantyVariant && (
                  <Row label="Bảo hành" value={order.warrantyVariant} />
                )}
                <Row label="Ngày tạo"      value={formatDate(order.createdAt)} />
                {order.completedAt && (
                  <Row label="Hoàn thành" value={formatDate(order.completedAt)} />
                )}
              </div>
            </div>
          </div>

          {/* Thông tin khách gửi */}
          {noteData && Object.keys(noteData).filter(k => noteData![k]).length > 0 && (
            <div className="rounded-xl border border-[#7C3AED]/25 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#7C3AED]/15 bg-[#7C3AED]/5">
                <h2 className="text-sm font-semibold text-[#7C3AED]">Thông tin khách hàng gửi</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {Object.entries(noteData).map(([key, val]) => {
                  if (!val) return null;
                  const label = NOTE_LABELS[key] ?? key;

                  if (key === "cccdUrl") {
                    return (
                      <div key={key}>
                        <p className="text-xs text-gray-500 mb-2">{label}</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={val}
                          alt="CCCD mặt trước"
                          className="rounded-xl border border-gray-200 max-w-xs w-full object-contain"
                        />
                        <a
                          href={val} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-block text-xs text-[#7C3AED] underline underline-offset-2"
                        >
                          Xem full →
                        </a>
                      </div>
                    );
                  }

                  const display = key === "accountType"
                    ? (val === "chinh_chu" ? "Chính chủ" : "Không chính chủ")
                    : val;

                  return (
                    <div key={key} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-gray-500 shrink-0 text-xs">{label}</span>
                      <span className="text-gray-900 font-mono text-xs text-right break-all">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: 1/3 ── */}
        <div className="space-y-5">

          {/* Người mua */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Người mua</h2>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#7C3AED]">
                  {(order.user.fullName ?? order.user.email).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{order.user.fullName}</p>
                <p className="text-xs text-gray-400 truncate">{order.user.email}</p>
              </div>
              <Link
                href={`/admin/users/${order.user.id}`}
                className="text-xs text-[#7C3AED] hover:text-[#A855F7] shrink-0 transition-colors"
              >
                Xem →
              </Link>
            </div>
          </div>

          {/* Giao dịch liên quan */}
          {order.transactions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Giao dịch liên quan</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {order.transactions.map((tx) => (
                  <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-800 font-medium truncate">{tx.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {TX_TYPE_LABELS[tx.type] ?? tx.type} · {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#7C3AED] shrink-0">
                      {formatVnd(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cập nhật trạng thái */}
          <OrderStatusForm orderId={id} currentStatus={order.status} />
        </div>

      </div>
    </div>
  );
}

function Row({
  label, value, mono, highlight, span,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean; span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm break-all ${mono ? "font-mono text-gray-600" : ""} ${highlight ? "font-bold text-[#7C3AED]" : "font-medium text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}
