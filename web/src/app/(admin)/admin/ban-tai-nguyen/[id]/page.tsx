import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import { khuongfbGetOrder } from "@/lib/khuongfb/client";
import OrderStatusForm from "@/app/(admin)/admin/orders/[id]/OrderStatusForm";
import CopyButton from "@/components/shared/CopyButton";

export const metadata: Metadata = { title: "Chi tiết đơn — Bán tài nguyên" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",    cls: "bg-[#F59E0B]/15 text-[#92400e]" },
  PROCESSING: { label: "Đang xử lý",   cls: "bg-[#7C3AED]/15 text-[#5b21b6]" },
  DONE:       { label: "Hoàn thành",   cls: "bg-[#10B981]/15 text-[#065f46]" },
  REFUNDED:   { label: "Đã hoàn tiền", cls: "bg-[#0891b2]/15 text-[#164e63]" },
  CANCELLED:  { label: "Đã hủy",       cls: "bg-gray-100 text-gray-500" },
};

const TYPE_LABELS: Record<string, string> = {
  MMO_PRODUCT:      "💎 Tài nguyên MMO",
  SELLER_PRODUCT:   "🏪 Sản phẩm nhà bán",
  KHUONGFB_PRODUCT: "🔗 Khuongfb",
};

const TX_TYPE_LABELS: Record<string, string> = {
  BUY_MMO_PRODUCT:      "Mua tài nguyên",
  BUY_SELLER_PRODUCT:   "Mua sản phẩm nhà bán",
  BUY_KHUONGFB_PRODUCT: "Mua Khuongfb",
  REFUND:               "Hoàn tiền",
};

const KFB_STATUS_LABELS: Record<string, string> = {
  pending:     "Chờ xử lý",
  processing:  "Đang xử lý",
  in_progress: "Đang thực hiện",
  completed:   "Hoàn thành",
  partial:     "Hoàn thành một phần",
  canceled:    "Đã hủy",
  cancelled:   "Đã hủy",
  error:       "Lỗi",
};

export default async function BanTaiNguyenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true, orderCode: true, orderType: true, itemName: true,
      originalPrice: true, finalPrice: true,
      status: true, customerNote: true, externalOrderId: true, externalSource: true,
      createdAt: true, completedAt: true,
      deliveredItemId: true,
      user: { select: { id: true, email: true, fullName: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, amount: true, description: true, createdAt: true },
      },
    },
  });

  if (!order) notFound();

  // ── Fetch nội dung đã giao ────────────────────────────────────────────────
  let deliveredContent: string | null = null;
  let kfbStatus: { status?: string; remains?: number; charge?: string | number } | null = null;

  if (order.status === "DONE" && order.deliveredItemId) {
    if (order.orderType === "MMO_PRODUCT") {
      const item = await prisma.mmoProductItem.findUnique({
        where: { id: order.deliveredItemId },
        select: { valueEnc: true },
      });
      if (item) deliveredContent = decrypt(item.valueEnc as unknown as Buffer);
    } else if (order.orderType === "SELLER_PRODUCT") {
      const stock = await prisma.sellerProductStock.findUnique({
        where: { id: order.deliveredItemId },
        select: { contentEnc: true },
      });
      if (stock) deliveredContent = decrypt(stock.contentEnc as unknown as Buffer);
    }
  }

  if (order.status === "DONE" && order.orderType === "KHUONGFB_PRODUCT" && order.externalOrderId) {
    try {
      const res = await khuongfbGetOrder(order.externalOrderId);
      kfbStatus = res.data ?? null;
    } catch {
      // silent — hiển thị fallback
    }
  }

  const badge = STATUS_BADGES[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/ban-tai-nguyen" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Quay lại bán tài nguyên
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1.5">Chi tiết đơn hàng</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{order.orderCode}</p>
        </div>
        <span className={`mt-1 px-3 py-1.5 rounded-full text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── LEFT ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Thông tin đơn hàng */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Thông tin đơn hàng</h2>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <Row label="Mã đơn"   value={order.orderCode} mono />
                <Row label="Loại đơn" value={TYPE_LABELS[order.orderType] ?? order.orderType} />
                <Row label="Sản phẩm" value={order.itemName} span />
                <Row label="Giá gốc"  value={formatVnd(Number(order.originalPrice))} />
                <Row label="Giá cuối" value={formatVnd(Number(order.finalPrice))} highlight />
                <Row label="Ngày tạo" value={formatDate(order.createdAt)} />
                {order.completedAt && (
                  <Row label="Hoàn thành" value={formatDate(order.completedAt)} />
                )}
              </div>
            </div>
          </div>

          {/* Nội dung đã giao — MMO / Seller */}
          {deliveredContent && (
            <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50">
                <h2 className="text-sm font-semibold text-emerald-700">Nội dung đã giao</h2>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <code className="flex-1 text-xs text-gray-900 font-mono break-all whitespace-pre-wrap">
                    {deliveredContent}
                  </code>
                  <CopyButton text={deliveredContent} />
                </div>
              </div>
            </div>
          )}

          {/* Nội dung đã giao — KFB */}
          {order.orderType === "KHUONGFB_PRODUCT" && order.externalOrderId && (
            <div className="rounded-xl border border-[#0891b2]/25 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#0891b2]/15 bg-[#0891b2]/5">
                <h2 className="text-sm font-semibold text-[#0891b2]">Thông tin đơn Khuongfb</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Trans ID */}
                <div>
                  <p className="text-[11px] text-gray-400 mb-1.5">Mã giao dịch (trans_id)</p>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <span className="flex-1 text-sm font-mono text-gray-800 break-all select-all">
                      {order.externalOrderId}
                    </span>
                    <CopyButton text={order.externalOrderId} />
                  </div>
                </div>

                {/* Live status từ Khuongfb */}
                {kfbStatus ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {kfbStatus.status && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Trạng thái KFB</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {KFB_STATUS_LABELS[kfbStatus.status.toLowerCase()] ?? kfbStatus.status}
                        </p>
                      </div>
                    )}
                    {kfbStatus.remains !== undefined && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Còn lại</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {kfbStatus.remains.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}
                    {kfbStatus.charge !== undefined && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Chi phí</p>
                        <p className="text-sm font-semibold text-gray-800">{kfbStatus.charge}</p>
                      </div>
                    )}
                  </div>
                ) : order.status === "DONE" ? (
                  <p className="text-xs text-gray-400 italic">Không lấy được trạng thái từ Khuongfb lúc này.</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Ghi chú khách hàng */}
          {order.customerNote && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Ghi chú khách hàng</h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.customerNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-5">

          {/* Người mua */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Người mua</h2>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#10B981]">
                  {(order.user.fullName ?? order.user.email).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{order.user.fullName}</p>
                <p className="text-xs text-gray-400 truncate">{order.user.email}</p>
              </div>
              <Link
                href={`/admin/users/${order.user.id}`}
                className="text-xs text-[#10B981] hover:text-[#059669] shrink-0 transition-colors"
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
                    <span className={`text-sm font-semibold shrink-0 ${Number(tx.amount) < 0 ? "text-red-500" : "text-[#10B981]"}`}>
                      {Number(tx.amount) > 0 ? "+" : ""}{formatVnd(Number(tx.amount))}
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
      <p className={`text-sm break-all ${mono ? "font-mono text-gray-600" : ""} ${highlight ? "font-bold text-[#10B981]" : "font-medium text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}
