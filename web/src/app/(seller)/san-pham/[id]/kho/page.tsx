import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { formatDate } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { Boxes, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import StockManagerClient from "./_components/StockManagerClient";

export const metadata: Metadata = { title: "Quản lý kho hàng" };

const PAGE_SIZE = 30;

export default async function KhoHangPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ id }, { status: rawStatus, page: rawPage }] = await Promise.all([params, searchParams]);

  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const product = await prisma.sellerProduct.findFirst({
    where: { id, sellerId: me.id, deletedAt: null },
    select: { id: true, name: true, isRestricted: true },
  });
  if (!product) notFound();

  const activeStatus = rawStatus === "SOLD" ? "SOLD" : "AVAILABLE";
  const page = Math.max(1, parseInt(rawPage ?? "1", 10));

  const statusFilter =
    activeStatus === "SOLD" ? { status: "SOLD" as const } :
    { status: "AVAILABLE" as const };

  const where = { productId: id, ...statusFilter };

  const [rows, total, counts] = await Promise.all([
    prisma.sellerProductStock.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, contentEnc: true, status: true, soldAt: true, createdAt: true },
    }),
    prisma.sellerProductStock.count({ where }),
    prisma.sellerProductStock.groupBy({
      by: ["status"],
      where: { productId: id },
      _count: { id: true },
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const items = rows.map((r) => ({
    id: r.id,
    content: decrypt(r.contentEnc as unknown as Buffer),
    status: r.status as "AVAILABLE" | "SOLD" | "RESERVED",
    soldAt: r.soldAt ? formatDate(r.soldAt) : null,
    createdAt: formatDate(r.createdAt),
  }));

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="products" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/san-pham" className="hover:text-gray-700 transition-colors flex items-center gap-0.5">
              <ChevronLeft size={13} /> Sản phẩm
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <Link href={`/san-pham/${id}/sua`} className="hover:text-gray-700 transition-colors truncate max-w-40">
              {product.name}
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-700 font-medium">Kho hàng</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Boxes size={17} className="text-gray-500" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý kho hàng</h1>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{product.name}</p>
              </div>
            </div>
            {product.isRestricted && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600 font-medium">Sản phẩm bị hạn chế — không thể thêm/sửa kho</span>
              </div>
            )}
          </div>

          {/* Stat badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "Còn hàng",  key: "AVAILABLE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Đã bán",    key: "SOLD",      color: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Đang giữ",  key: "RESERVED",  color: "bg-amber-50 text-amber-700 border-amber-200" },
            ].map(({ label, key, color }) => (
              <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
                {label}: {countMap[key] ?? 0}
              </span>
            ))}
          </div>

          <StockManagerClient
            productId={id}
            isRestricted={product.isRestricted}
            initialItems={items}
            initialTotal={total}
            initialTotalPages={totalPages}
            initialPage={page}
            initialStatus={activeStatus}
          />
        </div>
      </div>
    </>
  );
}
