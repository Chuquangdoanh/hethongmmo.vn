import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import StockKhoHangSection from "./_components/StockKhoHangSection";
import StockRowActions from "./_components/StockRowActions";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Admin — Quản lý kho MMO" };

const PAGE_SIZE = 50;

export default async function AdminMmoStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const [{ id }, { page, status }] = await Promise.all([params, searchParams]);
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const product = await prisma.mmoProduct.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!product) notFound();

  const statusFilter = (["AVAILABLE", "SOLD", "RESERVED"] as const).find((s) => s === status);
  const where = { productId: id, ...(statusFilter ? { status: statusFilter } : {}) };

  const [items, total, stats] = await Promise.all([
    prisma.mmoProductItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, status: true, valueEnc: true, soldToUserId: true, orderId: true, soldAt: true, createdAt: true },
    }),
    prisma.mmoProductItem.count({ where }),
    Promise.all([
      prisma.mmoProductItem.count({ where: { productId: id, status: "AVAILABLE" } }),
      prisma.mmoProductItem.count({ where: { productId: id, status: "SOLD" } }),
      prisma.mmoProductItem.count({ where: { productId: id, status: "RESERVED" } }),
    ]),
  ]);

  const [available, sold, reserved] = stats;

  const itemsWithContent = items.map((item) => {
    let content = "";
    try { content = decrypt(item.valueEnc as Buffer); } catch { content = "(lỗi giải mã)"; }
    return { ...item, content };
  });

  const soldUserIds = itemsWithContent.filter((i) => i.soldToUserId).map((i) => i.soldToUserId!);
  const buyers = soldUserIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: soldUserIds } }, select: { id: true, email: true } })
    : [];
  const buyerMap = new Map(buyers.map((b) => [b.id, b.email]));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/mmo-products" className="text-xs text-gray-500 hover:text-gray-500">← MMO Products</Link>
        <span className="text-[#2A2A38]">/</span>
        <Link href={`/admin/mmo-products/${id}/sua`} className="text-xs text-gray-500 hover:text-gray-500">Sửa</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kho: {product.name}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Có sẵn", value: available, color: "text-[#10B981]" },
          { label: "Đã bán", value: sold, color: "text-gray-500" },
          { label: "Đang giữ", value: reserved, color: "text-[#F59E0B]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString("vi-VN")}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Kho hàng: tab Upload TXT / Nhập tay */}
      <StockKhoHangSection productId={id} />

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["", "AVAILABLE", "SOLD", "RESERVED"].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/mmo-products/${id}/stock?status=${s}` : `/admin/mmo-products/${id}/stock`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === s || (!status && !s)
                ? "bg-[#7C3AED] text-white"
                : "border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-gray-900"
            }`}
          >
            {s || "Tất cả"}
          </Link>
        ))}
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-8">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nội dung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người mua</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày nhập</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày bán</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithContent.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Không có items</td>
              </tr>
            )}
            {itemsWithContent.map((item, i) => (
              <tr key={item.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50/60 transition-colors`}>
                <td className="px-4 py-3 text-xs text-gray-400">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-gray-700 break-all max-w-[320px]">
                    {item.content.length > 120 ? `${item.content.slice(0, 120)}…` : item.content}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    item.status === "AVAILABLE"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : item.status === "SOLD"
                      ? "bg-[#71717A]/10 text-gray-500"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}>
                    {item.status === "AVAILABLE" ? "Còn hàng" : item.status === "SOLD" ? "Đã bán" : "Đang giữ"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {item.soldToUserId
                    ? buyerMap.get(item.soldToUserId) ?? item.soldToUserId.slice(0, 8) + "…"
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.soldAt ? formatDate(item.soldAt) : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <StockRowActions
                    itemId={item.id}
                    productId={id}
                    content={item.content}
                    status={item.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/admin/mmo-products/${id}/stock`}
          searchParams={status ? { status } : {}}
        />
      )}
    </div>
  );
}
