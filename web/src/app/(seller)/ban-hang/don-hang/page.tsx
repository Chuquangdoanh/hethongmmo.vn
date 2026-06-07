import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { ShoppingBag, ChevronRight } from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import SellerProfileHero from "@/components/shared/SellerProfileHero";

export const metadata: Metadata = { title: "Đơn hàng — Seller" };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Đang xử lý",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  DONE:       { label: "Hoàn thành",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FROZEN:     { label: "Đã đóng băng", cls: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED:  { label: "Đã hủy",       cls: "bg-gray-100 text-gray-500 border-gray-200" },
  REFUNDED:   { label: "Hoàn tiền",    cls: "bg-red-50 text-red-600 border-red-200" },
  DISPUTED:   { label: "Khiếu nại",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const PAGE_SIZE = 10;

const FILTER_TABS = [
  { key: "",         label: "Tất cả" },
  { key: "DONE",     label: "Hoàn thành" },
  { key: "FROZEN",   label: "Đóng băng" },
  { key: "DISPUTED", label: "Khiếu nại" },
];

export default async function SellerDonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;
  const { page, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    sellerId: me.id,
    ...(status ? { status: status as never } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderCode: true, itemName: true,
        finalPrice: true, status: true, createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="orders" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <ShoppingBag size={17} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
              <p className="text-xs text-gray-500">{total.toLocaleString("vi-VN")} đơn hàng</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={key ? `/ban-hang/don-hang?status=${key}` : "/ban-hang/don-hang"}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  status === key || (!status && !key)
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-gray-200 text-gray-500 hover:border-violet-400 hover:text-violet-600 bg-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-20">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={24} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-500">Chưa có đơn hàng</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Mã đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sản phẩm</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Giá</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => {
                      const st = STATUS_BADGES[order.status] ?? STATUS_BADGES["PENDING"]!;
                      return (
                        <tr
                          key={order.id}
                          className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}
                        >
                          <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{order.orderCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-40 truncate">{order.itemName}</td>
                          <td className="px-4 py-3 text-sm text-red-500 font-semibold">{formatVnd(Number(order.finalPrice))}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/ban-hang/don-hang"
                  searchParams={status ? { status } : {}}
                />
              )}
            </>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Link href="/ban-hang" className="hover:text-violet-600 transition-colors">Tổng quan</Link>
            <ChevronRight size={12} />
            <span className="text-gray-500">Đơn hàng</span>
          </div>
        </div>
      </div>
    </>
  );
}
