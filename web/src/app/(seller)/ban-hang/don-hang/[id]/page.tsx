import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import {
  ArrowLeft, Package, FileText, Clock,
  CheckCircle, XCircle, AlertTriangle, Snowflake, MessageCircle,
} from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import { getOrderConversationLinks } from "@/lib/services/order-conversation.service";

export const metadata: Metadata = { title: "Chi tiết đơn hàng — Seller" };

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string; iconCls: string }> = {
  PENDING:    { label: "Chờ xử lý",    icon: Clock,          cls: "bg-amber-50 border-amber-200 text-amber-700",   iconCls: "text-amber-500" },
  PROCESSING: { label: "Đang xử lý",   icon: Clock,          cls: "bg-blue-50 border-blue-200 text-blue-700",      iconCls: "text-blue-500" },
  DONE:       { label: "Hoàn thành",   icon: CheckCircle,    cls: "bg-emerald-50 border-emerald-200 text-emerald-700", iconCls: "text-emerald-500" },
  FROZEN:     { label: "Đã đóng băng", icon: Snowflake,      cls: "bg-red-50 border-red-200 text-red-700",         iconCls: "text-red-500" },
  CANCELLED:  { label: "Đã hủy",       icon: XCircle,        cls: "bg-gray-100 border-gray-200 text-gray-500",     iconCls: "text-gray-400" },
  REFUNDED:   { label: "Hoàn tiền",    icon: XCircle,        cls: "bg-red-50 border-red-200 text-red-600",         iconCls: "text-red-400" },
  DISPUTED:   { label: "Đang khiếu nại", icon: AlertTriangle, cls: "bg-orange-50 border-orange-200 text-orange-700", iconCls: "text-orange-500" },
};

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderCode: true,
      sellerId: true,
      itemName: true,
      originalPrice: true,
      finalPrice: true,
      warrantyVariant: true,
      customerNote: true,
      status: true,
      orderType: true,
      withdrawn: true,
      createdAt: true,
      completedAt: true,
      updatedAt: true,
      user: { select: { email: true, fullName: true } },
      sellerProduct: { select: { id: true, name: true } },
    },
  });

  // IDOR protection — seller chỉ xem được đơn của mình
  if (!order || order.sellerId !== me.id) notFound();

  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["PENDING"]!;
  const StatusIcon = st.icon;

  // Lấy item đã giao (nếu có)
  const stockItem = await prisma.sellerProductStock.findFirst({
    where: { orderId: id },
    select: { contentEnc: true, soldAt: true },
  });

  let deliveredContent: string | null = null;
  if (stockItem?.contentEnc) {
    try {
      deliveredContent = decrypt(stockItem.contentEnc as unknown as Buffer);
    } catch {
      deliveredContent = null;
    }
  }

  const fee = Number(order.originalPrice) - Number(order.finalPrice);
  const conversationLink = (await getOrderConversationLinks([order.id])).get(order.id);

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="orders" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-5">

          {/* Breadcrumb + back */}
          <div className="flex items-center gap-2">
            <Link
              href="/ban-hang/don-hang"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-700 transition-colors"
            >
              <ArrowLeft size={14} /> Danh sách đơn hàng
            </Link>
          </div>

          {/* Header card — mã đơn, tên, trạng thái, giá, thời gian */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-mono text-gray-400 mb-1">Mã đơn: #{order.orderCode}</p>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{order.itemName}</h1>
                {order.warrantyVariant && (
                  <p className="text-xs text-gray-500 mt-0.5">Phân loại: {order.warrantyVariant}</p>
                )}
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 ${st.cls}`}>
                <StatusIcon size={12} className={st.iconCls} />
                {st.label}
              </span>
            </div>

            {/* Giá */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Giá bán</p>
                <p className="text-sm font-semibold text-gray-700">{formatVnd(Number(order.originalPrice))}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Phí nền tảng</p>
                <p className="text-sm font-semibold text-red-500">−{formatVnd(fee)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Thực nhận</p>
                <p className="text-sm font-bold text-emerald-600">{formatVnd(Number(order.finalPrice))}</p>
              </div>
            </div>

            {/* Thời gian mua */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock size={13} className="text-gray-400" />
                <span>Đặt hàng:</span>
                <span className="font-medium text-gray-800">{formatDate(order.createdAt)}</span>
              </div>
              {order.completedAt && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <CheckCircle size={13} className="text-emerald-500" />
                  <span>Hoàn thành:</span>
                  <span className="font-medium text-emerald-700">{formatDate(order.completedAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-500 ml-auto">
                <span>Doanh thu:</span>
                <span className={order.withdrawn ? "font-medium text-emerald-700" : "text-gray-400"}>
                  {order.withdrawn ? "Đã rút" : "Chưa rút"}
                </span>
              </div>
            </div>
          </div>

          {/* Khiếu nại / Chat hỗ trợ liên quan đơn này */}
          {conversationLink && (
            <Link
              href={`/ban-hang/khieu-nai?id=${conversationLink}`}
              className="flex items-center gap-2.5 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:border-violet-300 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <MessageCircle size={15} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Xem khiếu nại / chat hỗ trợ đơn này</p>
                <p className="text-xs text-gray-400">Mở hội thoại với người mua trong trang Khiếu nại</p>
              </div>
            </Link>
          )}

          {/* Nội dung sản phẩm đã giao */}
          {(order.status === "DONE" || order.status === "FROZEN" || order.status === "DISPUTED") && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Nội dung sản phẩm đã giao</h2>
                {stockItem?.soldAt && (
                  <span className="ml-auto text-[11px] text-gray-400">{formatDate(stockItem.soldAt)}</span>
                )}
              </div>
              {deliveredContent ? (
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap break-all font-mono leading-relaxed max-h-96 overflow-y-auto border border-gray-100">
                  {deliveredContent}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">Không tìm thấy nội dung giao hàng.</p>
              )}
            </div>
          )}

          {/* Xem sản phẩm */}
          {order.sellerProduct && (
            <div className="flex">
              <Link
                href={`/san-pham/${order.sellerProduct.id}`}
                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium hover:underline"
              >
                <FileText size={14} />
                Xem trang sản phẩm: {order.sellerProduct.name}
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
