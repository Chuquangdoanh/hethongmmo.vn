import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd } from "@/lib/utils/format";
import { Package, Plus } from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import { r2Url } from "@/lib/utils/image-url";

export const metadata: Metadata = { title: "Quản lý sản phẩm" };

const PAGE_SIZE = 10;

export default async function SellerSanPhamPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;
  const { page, q: rawQ } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const q = rawQ?.trim() || undefined;

  const where = {
    sellerId: me.id,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.sellerProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, price: true, imageUrl: true, isActive: true,
        isRestricted: true, createdAt: true,
        _count: {
          select: {
            orders: true,
            stockItems: { where: { status: "AVAILABLE" } },
          },
        },
      },
    }),
    prisma.sellerProduct.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="products" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package size={17} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sản phẩm</h1>
                <p className="text-xs text-gray-500">{total} sản phẩm</p>
              </div>
            </div>
            <Link
              href="/san-pham/tao-moi"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Plus size={15} /> Thêm sản phẩm
            </Link>
          </div>

          {/* Search */}
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Tìm theo tên sản phẩm..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Tìm
            </button>
            {q && (
              <a href="/san-pham" className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-gray-300 transition-colors">
                Xóa
              </a>
            )}
          </form>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-20">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Package size={24} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-500 mb-2">Chưa có sản phẩm nào</p>
              <Link href="/san-pham/tao-moi" className="text-sm text-violet-600 hover:text-violet-700">
                Tạo sản phẩm đầu tiên
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sản phẩm</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Giá</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Kho</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={r2Url(p.imageUrl)}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-gray-800 font-medium truncate">{p.name}</p>
                              {p.isRestricted && (
                                <span
                                  title="Sản phẩm bị hạn chế bởi quản trị viên. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết."
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-red-600 border border-red-200 cursor-help"
                                >
                                  Bị khóa
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-red-500 font-semibold">{formatVnd(Number(p.price))}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p._count.orders}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {p._count.stockItems === 0
                            ? <span className="text-red-500 text-xs font-medium">Hết hàng</span>
                            : p._count.stockItems}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {p.isActive ? "Đang bán" : "Ẩn"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/san-pham/${p.id}/kho`}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                              Kho
                            </Link>
                            <Link
                              href={`/san-pham/${p.id}/sua`}
                              className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
                            >
                              Sửa
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/san-pham" searchParams={q ? { q } : {}} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
