import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatDate, formatVnd } from "@/lib/utils/format";
import SellerApproveForm from "./SellerApproveForm";
import ShopLockAdminButton from "./ShopLockAdminButton";
import SellerTierForm from "./SellerTierForm";
import ImageZoom from "./ImageZoom";
import SellerCategoryManager from "./SellerCategoryManager";
import BankChangeRequestAdmin from "@/components/shared/BankChangeRequestAdmin";
import { getSellerBankChangeRequests } from "@/lib/services/bank-change-request.service";
import { decrypt } from "@/lib/security/encryption";
import AdminEscrowAdjust from "@/app/(admin)/admin/users/[id]/AdminEscrowAdjust";
import AdminEscrowRequiredForm from "@/app/(admin)/admin/users/[id]/AdminEscrowRequiredForm";
import AdminSellerReverify from "@/app/(admin)/admin/users/[id]/AdminSellerReverify";
import { getSellerReverifyRequests } from "@/lib/services/seller-reverify.service";
import ProductRevenueFilter from "./ProductRevenueFilter";
import { getSellerTierConfig } from "@/lib/services/seller.service";

export const metadata: Metadata = { title: "Duyệt Seller" };

function parseDateLocal(s: string): Date {
  const parts = s.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

export default async function AdminSellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const dateFrom = sp.dateFrom ?? "";
  const dateTo   = sp.dateTo   ?? "";

  let completedAtFilter: { gte: Date; lt: Date } | undefined;
  if (dateFrom && dateTo) {
    const [orderedFrom, orderedTo] = dateFrom <= dateTo ? [dateFrom, dateTo] : [dateTo, dateFrom];
    const periodStart = parseDateLocal(orderedFrom);
    const periodEnd   = parseDateLocal(orderedTo);
    periodEnd.setDate(periodEnd.getDate() + 1); // exclusive upper bound
    completedAtFilter = { gte: periodStart, lt: periodEnd };
  }

  const request = await prisma.sellerRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, email: true, fullName: true, phone: true,
          createdAt: true, totalDeposited: true, totalSpent: true,
          cccdImageUrl: true, portraitImageUrl: true, sellerTier: true,
        },
      },
    },
  });

  if (!request) notFound();

  const sellerSubCategories = await prisma.userSubCategory.findMany({
    where: { userId: request.userId },
    select: { subCategory: { select: { id: true, name: true, categoryName: true } } },
  });

  const sellerCategory = request.approvedCategory ?? request.category;

  type ShopRow = { shop_locked: boolean };
  const [shopRows, products, orderStats, withdrawalStats, allTiers, allSubCategories, productRevenueGroups, tierCfg] = await Promise.all([
    prisma.$queryRaw<ShopRow[]>`SELECT shop_locked FROM users WHERE id = ${request.userId}`,
    prisma.sellerProduct.findMany({
      where: { sellerId: request.userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        price: true,
        sellerCategory: true,
        isActive: true,
        isHidden: true,
        isRestricted: true,
        salesCount: true,
        revenue: true,
        createdAt: true,
        _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: request.userId, status: "DONE",
        ...(completedAtFilter ? { completedAt: completedAtFilter } : {}),
      },
      _sum: { finalPrice: true },
      _count: true,
    }),
    prisma.sellerWithdrawal.aggregate({
      where: {
        sellerId: request.userId, status: "COMPLETED",
        ...(completedAtFilter ? { processedAt: completedAtFilter } : {}),
      },
      _sum: { amount: true, netAmount: true },
    }),
    prisma.sellerTierDefinition.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, key: true, label: true, description: true, badgeColor: true },
    }),
    prisma.sellerSubCategory.findMany({
      where: { categoryName: sellerCategory, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // Doanh thu/số đơn thực tế theo từng sản phẩm — tính lại từ đơn hàng DONE
    // (không dùng cột sellerProduct.salesCount/revenue vì bị lệch khi đơn bị hoàn tiền/tranh chấp)
    prisma.order.groupBy({
      by: ["sellerProductId"],
      where: {
        sellerId: request.userId,
        sellerProductId: { not: null },
        status: "DONE",
        ...(completedAtFilter ? { completedAt: completedAtFilter } : {}),
      },
      _sum: { finalPrice: true },
      _count: { _all: true },
    }),
    getSellerTierConfig(request.user.sellerTier),
  ]);
  const shopLocked = shopRows[0]?.shop_locked ?? false;

  // "Có thể rút" — tính giống hệt công thức bên trang seller /rut-tien:
  // đơn DONE, chưa withdrawn, đã qua đủ ngày hold, trừ phí rút theo tier.
  const holdDate = new Date(Date.now() - tierCfg.hold_days * 24 * 60 * 60 * 1000);
  const withdrawableStats = await prisma.order.aggregate({
    where: {
      sellerId: request.userId,
      status: "DONE",
      withdrawn: false,
      createdAt: { lt: holdDate },
      ...(completedAtFilter ? { completedAt: completedAtFilter } : {}),
    },
    _sum: { finalPrice: true },
  });
  const withdrawableGross = Number(withdrawableStats._sum.finalPrice ?? 0);
  const withdrawableFee   = Math.floor(withdrawableGross * tierCfg.fee_percent / 100);
  const withdrawableNet   = withdrawableGross - withdrawableFee;

  const productRevenueMap = new Map<string, { orders: number; revenue: number }>();
  for (const g of productRevenueGroups) {
    if (!g.sellerProductId) continue;
    productRevenueMap.set(g.sellerProductId, {
      orders: g._count._all,
      revenue: Number(g._sum.finalPrice ?? 0),
    });
  }
  const filteredTotalRevenue = Array.from(productRevenueMap.values()).reduce((acc, v) => acc + v.revenue, 0);
  const filteredTotalOrders  = Array.from(productRevenueMap.values()).reduce((acc, v) => acc + v.orders, 0);

  const [bankChangeRequests, sellerUser, reverifyRequests] = await Promise.all([
    getSellerBankChangeRequests(request.userId),
    prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
        sellerEscrow: true, sellerEscrowRequired: true,
        sellerReverifyRequired: true, sellerReverifyApproved: true,
      },
    }),
    getSellerReverifyRequests(request.userId),
  ]);
  const currentBankName          = sellerUser?.bankNameEnc          ? decrypt(sellerUser.bankNameEnc          as unknown as Buffer) : null;
  const currentBankAccountNumber = sellerUser?.bankAccountNumberEnc ? decrypt(sellerUser.bankAccountNumberEnc as unknown as Buffer) : null;
  const currentBankAccountHolder = sellerUser?.bankAccountHolderEnc ? decrypt(sellerUser.bankAccountHolderEnc as unknown as Buffer) : null;

  const totalRevenue = Number(orderStats._sum.finalPrice ?? 0);
  const totalOrders  = orderStats._count;
  const totalWithdrawn    = Number(withdrawalStats._sum.amount    ?? 0);
  const totalWithdrawnNet = Number(withdrawalStats._sum.netAmount ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sellers" className="text-xs text-gray-500 hover:text-gray-500">← Sellers</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Yêu cầu Seller</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng doanh số",
            value: formatVnd(totalRevenue),
            sub: `${totalOrders.toLocaleString("vi-VN")} đơn hoàn thành`,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
            icon: "💰",
          },
          {
            label: "Tổng tiền rút",
            value: formatVnd(totalWithdrawn),
            sub: `Sau phí: ${formatVnd(totalWithdrawnNet)}`,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-200",
            icon: "🏦",
          },
          {
            label: "Doanh số chưa rút",
            value: formatVnd(Math.max(0, totalRevenue - totalWithdrawn)),
            sub: "Còn lại trong ví seller",
            color: "text-violet-600",
            bg: "bg-violet-50 border-violet-200",
            icon: "💳",
          },
          {
            label: "Có thể rút",
            value: formatVnd(withdrawableNet),
            sub: `Trước phí: ${formatVnd(withdrawableGross)} — đã qua ${tierCfg.hold_days} ngày hold`,
            color: "text-teal-600",
            bg: "bg-teal-50 border-teal-200",
            icon: "🔓",
          },
        ].map(({ label, value, sub, color, bg, icon }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT: applicant info + action + shop lock */}
        <div className="space-y-6">

          {/* Applicant info */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Thông tin người đăng ký</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Họ tên", value: request.user.fullName },
                { label: "Email", value: request.user.email },
                { label: "Điện thoại", value: request.user.phone ?? "—" },
                { label: "Danh mục chính", value: request.category },
                { label: "Ngày tạo TK", value: formatDate(request.user.createdAt) },
                { label: "Tổng nạp", value: `${Number(request.user.totalDeposited).toLocaleString("vi-VN")}đ` },
                { label: "Ngày đăng ký", value: formatDate(request.createdAt) },
                { label: "Phí đăng ký", value: `${Number(request.fee).toLocaleString("vi-VN")}đ` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-500">{value}</p>
                </div>
              ))}
            </div>

            {/* Sub-categories registered — editable by admin */}
            <SellerCategoryManager
              requestId={id}
              current={sellerSubCategories.map((r) => r.subCategory)}
              available={allSubCategories}
            />

            {/* ID documents */}
            {(request.user.cccdImageUrl || request.user.portraitImageUrl) && (
              <div className="mt-4 flex gap-4">
                {request.user.cccdImageUrl && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">CCCD</p>
                    <ImageZoom src={request.user.cccdImageUrl} alt="CCCD" />
                  </div>
                )}
                {request.user.portraitImageUrl && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Ảnh chân dung</p>
                    <ImageZoom src={request.user.portraitImageUrl} alt="Ảnh chân dung" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action form */}
          {request.status === "PENDING" ? (
            <SellerApproveForm
              requestId={id}
              category={request.category}
              subCategories={sellerSubCategories.map((r) => r.subCategory)}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Yêu cầu đã được xử lý: <span className="text-gray-900 font-medium">{request.status}</span>
                {request.approvedCategory && ` — Danh mục: ${request.approvedCategory}`}
                {request.rejectReason && ` — Lý do: ${request.rejectReason}`}
              </p>
            </div>
          )}

          {/* Shop lock management — only for approved sellers */}
          {request.status === "APPROVED" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Quản lý gian hàng</h2>
              <p className="text-xs text-gray-500 mb-4">
                Khóa gian hàng sẽ ẩn toàn bộ sản phẩm khỏi trang công khai và ngăn seller rút tiền.
              </p>
              <ShopLockAdminButton requestId={id} locked={shopLocked} />
            </div>
          )}

          {/* Seller tier — only for approved sellers */}
          {request.status === "APPROVED" && (
            <SellerTierForm
              sellerId={request.userId}
              currentTier={request.user.sellerTier}
              tiers={allTiers}
            />
          )}

          {/* Ký quỹ seller */}
          {request.status === "APPROVED" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Ký quỹ</h2>
              <AdminEscrowAdjust
                userId={request.userId}
                sellerEscrow={Number(sellerUser?.sellerEscrow ?? 0)}
              />
              <AdminEscrowRequiredForm
                userId={request.userId}
                sellerEscrow={Number(sellerUser?.sellerEscrow ?? 0)}
                sellerEscrowRequired={Number(sellerUser?.sellerEscrowRequired ?? 0)}
              />
            </div>
          )}

          {/* Xác minh lại danh tính seller — admin chỉ định seller cần nộp lại CCCD + ảnh chân dung trước khi rút tiền */}
          {request.status === "APPROVED" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Xác minh lại danh tính</h2>
              <AdminSellerReverify
                userId={request.userId}
                sellerReverifyRequired={sellerUser?.sellerReverifyRequired ?? false}
                sellerReverifyApproved={sellerUser?.sellerReverifyApproved ?? false}
                requests={reverifyRequests.map((r) => ({
                  id: r.id,
                  status: r.status,
                  rejectReason: r.rejectReason,
                  createdAt: r.createdAt.toISOString(),
                  reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
                  cccdImageUrl: r.cccdImageUrl,
                  portraitImageUrl: r.portraitImageUrl,
                }))}
              />
            </div>
          )}

          {/* Bank info & change requests */}
          {request.status === "APPROVED" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Thông tin ngân hàng hiện tại</h2>
                {currentBankName ? (
                  <div className="grid grid-cols-3 gap-3 text-sm rounded-lg bg-blue-50 border border-blue-100 p-3">
                    <div>
                      <p className="text-[10px] text-blue-400 mb-0.5">Ngân hàng</p>
                      <p className="font-semibold text-blue-900">{currentBankName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 mb-0.5">Số tài khoản</p>
                      <p className="font-mono font-bold text-blue-900 tracking-wider">{currentBankAccountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 mb-0.5">Chủ tài khoản</p>
                      <p className="font-semibold text-blue-900 uppercase">{currentBankAccountHolder}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Seller chưa có thông tin ngân hàng.</p>
                )}
              </div>
              <BankChangeRequestAdmin requests={bankChangeRequests} />
            </div>
          )}

        </div>

        {/* RIGHT: products table */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900">
                Sản phẩm ({products.length})
              </h2>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {dateFrom && dateTo ? "Doanh thu trong khoảng đã lọc" : "Doanh thu (tính lại từ đơn hàng)"}
                </p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatVnd(filteredTotalRevenue)}
                  <span className="text-xs font-normal text-gray-400"> · {filteredTotalOrders.toLocaleString("vi-VN")} đơn</span>
                </p>
              </div>
            </div>
            <ProductRevenueFilter requestId={id} dateFrom={dateFrom} dateTo={dateTo} />
            {products.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có sản phẩm nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-medium text-gray-500">Tên sản phẩm</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500">Danh mục</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500">Giá</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500">Tồn kho</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500">Đã bán</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500">Doanh thu</th>
                      <th className="pb-2 text-center text-xs font-medium text-gray-500">Trạng thái</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500">Ngày tạo</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((p) => {
                      const statusLabel = !p.isActive
                        ? { text: "Tắt", cls: "bg-gray-100 text-gray-500" }
                        : p.isRestricted
                        ? { text: "Hạn chế", cls: "bg-red-50 text-red-600" }
                        : p.isHidden
                        ? { text: "Ẩn", cls: "bg-yellow-50 text-yellow-600" }
                        : { text: "Hoạt động", cls: "bg-green-50 text-green-600" };

                      const revenueStats = productRevenueMap.get(p.id);
                      const recalculatedSalesCount = revenueStats?.orders  ?? 0;
                      const recalculatedRevenue     = revenueStats?.revenue ?? 0;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-3 font-medium text-gray-900 max-w-50 truncate">{p.name}</td>
                          <td className="py-2.5 pr-3 text-gray-500 text-xs">{p.sellerCategory}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-700">{formatVnd(Number(p.price))}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-700">{p._count.stockItems}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-700">{recalculatedSalesCount}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-700">{formatVnd(recalculatedRevenue)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusLabel.cls}`}>
                              {statusLabel.text}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-gray-400">{formatDate(p.createdAt)}</td>
                          <td className="py-2.5 pl-3">
                            <Link
                              href={`/admin/san-pham-ban/${p.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            >
                              Xem chi tiết →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
