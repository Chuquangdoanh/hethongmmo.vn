import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import { getSellerConfig, getSellerTierConfig, DEFAULT_SLOT_PACKAGES } from "@/lib/services/seller.service";
import {
  Package, ShoppingBag, TrendingUp, Wallet, Store, Lock,
  Plus, ChevronRight, Boxes, Info, AlertTriangle, Building2,
  ArrowDownToLine, Calendar,
} from "lucide-react";
import ProductActions from "./_components/ProductActions";
import UpgradeShopModal from "./_components/UpgradeShopModal";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import { r2Url } from "@/lib/utils/image-url";

export const metadata: Metadata = { title: "Quản lý bán hàng" };

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Đang xử lý",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  DONE:       { label: "Hoàn thành",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FROZEN:     { label: "Đã đóng băng", cls: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED:  { label: "Đã hủy",       cls: "bg-gray-50 text-gray-500 border-gray-200" },
  REFUNDED:   { label: "Hoàn tiền",    cls: "bg-red-50 text-red-600 border-red-200" },
  DISPUTED:   { label: "Khiếu nại",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const WITHDRAWAL_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Chờ duyệt", cls: "text-amber-600" },
  APPROVED:  { label: "Đã duyệt",  cls: "text-blue-600" },
  COMPLETED: { label: "Đã chuyển", cls: "text-emerald-600" },
  REJECTED:  { label: "Từ chối",   cls: "text-red-600" },
};

export default async function BanHangPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  // Fetch sellerTier trước để tính holdDate đúng theo hạng
  const sellerTierRow = await prisma.user.findUnique({ where: { id: me.id }, select: { sellerTier: true } });

  const [config, tierCfg] = await Promise.all([
    getSellerConfig(),
    getSellerTierConfig(sellerTierRow?.sellerTier ?? "STANDARD"),
  ]);

  const holdDays = tierCfg.hold_days;
  const feePercent = tierCfg.fee_percent;
  // eslint-disable-next-line react-hooks/purity
  const holdDate = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000);

  type QualifyingRow = { total: string };
  type ShopRow = { shop_locked: boolean };
  const [user, products, recentOrders, withdrawals, totalRevenueAgg, totalOrders, qualifyingRows, shopRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        sellerCategory: true,
        maxSellerProducts: true,
        balance: true,
        bankNameEnc: true,
        bankAccountNumberEnc: true,
        bankAccountHolderEnc: true,
      },
    }),
    prisma.sellerProduct.findMany({
      where: { sellerId: me.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, price: true, description: true, imageUrl: true,
        isActive: true, isHidden: true, isRestricted: true, createdAt: true,
        _count: {
          select: {
            orders: true,
            stockItems: { where: { status: "AVAILABLE" } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, itemName: true, finalPrice: true, status: true, createdAt: true },
    }),
    prisma.sellerWithdrawal.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, amount: true, netAmount: true, feeAmount: true,
        status: true, rejectReason: true, createdAt: true,
      },
    }),
    prisma.order.aggregate({ where: { sellerId: me.id, status: "DONE" }, _sum: { finalPrice: true } }),
    prisma.order.count({ where: { sellerId: me.id } }),
    prisma.$queryRaw<QualifyingRow[]>`
      SELECT COALESCE(SUM(final_price), 0)::text AS total
      FROM orders
      WHERE seller_id = ${me.id}
        AND status = 'DONE'
        AND withdrawn = false
        AND created_at < ${holdDate}
    `,
    prisma.$queryRaw<ShopRow[]>`SELECT shop_locked FROM users WHERE id = ${me.id}`,
  ]);

  const [availableSubCats, selectedSubCats] = await Promise.all([
    prisma.sellerSubCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        categoryName: true,
        showInKhoTaiNguyen: true,
        showInTaiNguyenMmo: true,
      },
      orderBy: [{ categoryName: "asc" }, { displayOrder: "asc" }],
    }),
    prisma.userSubCategory.findMany({
      where: { userId: me.id },
      select: { subCategoryId: true },
    }),
  ]);
  const selectedSubCatIds = selectedSubCats.map((s) => s.subCategoryId);

  const revenue = Number(totalRevenueAgg._sum.finalPrice ?? 0);
  const qualifyingGross = Number(qualifyingRows[0]?.total ?? 0);
  const shopLocked = shopRows[0]?.shop_locked ?? false;
  const qualifyingFee = Math.floor(qualifyingGross * feePercent / 100);
  const qualifyingNet = qualifyingGross - qualifyingFee;
  const maxProducts = user?.maxSellerProducts ?? 3;
  const productCount = products.length;
  const userBalance = Number(user?.balance ?? 0);
  const slotPackages = config.slot_packages ?? DEFAULT_SLOT_PACKAGES;

  // Decrypt bank info (server-side only)
  let bankName = "", bankAccountNumber = "", bankAccountHolder = "";
  try {
    if (user?.bankNameEnc) bankName = decrypt(Buffer.from(user.bankNameEnc));
    if (user?.bankAccountNumberEnc) bankAccountNumber = decrypt(Buffer.from(user.bankAccountNumberEnc));
    if (user?.bankAccountHolderEnc) bankAccountHolder = decrypt(Buffer.from(user.bankAccountHolderEnc));
  } catch { /* bank info not set */ }

  const hasBankInfo = !!(bankName && bankAccountNumber && bankAccountHolder);

  const STATS = [
    {
      Icon: Package,     label: "Sản phẩm",
      value: `${productCount} / ${maxProducts}`,
      sub: productCount > maxProducts
        ? `⚠ Vượt giới hạn ${productCount - maxProducts} slot`
        : `Còn ${maxProducts - productCount} slot`,
      valueColor: productCount > maxProducts ? "text-red-500" : "text-blue-600",
      iconBg: "bg-gray-100", iconColor: "text-gray-400",
    },
    {
      Icon: ShoppingBag, label: "Đơn hàng",
      value: totalOrders.toLocaleString("vi-VN"),
      sub: "Tổng đơn",
      valueColor: "text-purple-600", iconBg: "bg-gray-100", iconColor: "text-gray-400",
    },
    {
      Icon: TrendingUp,  label: "Doanh thu",
      value: formatVnd(revenue),
      sub: "Đơn hoàn thành",
      valueColor: "text-emerald-600", iconBg: "bg-gray-100", iconColor: "text-gray-400",
    },
    {
      Icon: Wallet,      label: "Có thể rút",
      value: formatVnd(qualifyingNet),
      sub: `Sau phí ${feePercent}%`,
      valueColor: "text-amber-600", iconBg: "bg-gray-100", iconColor: "text-gray-400",
    },
  ];

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="overview" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="space-y-6">

          {/* ── Shop locked banner ── */}
          {shopLocked && (
            <div className="flex items-center gap-4 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Lock size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">Hệ Thống MMO xin thông báo gian hàng của bạn đã bị khóa</p>
                <p className="text-xs text-red-500 mt-0.5">Sản phẩm đã ẩn khỏi trang công khai. Bạn không thể rút tiền. Liên hệ bộ phân cskh để được hỗ trợ mở khóa.</p>
              </div>
            </div>
          )}

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map(({ Icon, label, value, sub, valueColor, iconBg, iconColor }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon size={17} className={iconColor} />
                  </div>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Main grid: Products (left) + Orders + Store status (right) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-5">

            {/* ── Products panel ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Store size={15} className="text-gray-400" />
                  Sản phẩm của tôi
                </h2>
                <div className="flex items-center gap-2">
                  <UpgradeShopModal
                    packages={slotPackages}
                    currentSlots={maxProducts}
                    userBalance={userBalance}
                    sellerCategory={user?.sellerCategory ?? null}
                    availableSubCats={availableSubCats}
                    selectedSubCatIds={selectedSubCatIds}
                  />
                  {productCount < maxProducts ? (
                    <Link
                      href="/san-pham/tao-moi"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={12} /> Thêm
                    </Link>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Đã đạt giới hạn</span>
                  )}
                </div>
              </div>

              {productCount > 0 && (
                <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Bạn đang dùng <strong>{productCount}/{maxProducts}</strong> slot.
                    {productCount < maxProducts
                      ? ` Còn ${maxProducts - productCount} slot trống.`
                      : " Đã dùng hết slot."}
                  </p>
                </div>
              )}

              {products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Package size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Chưa có sản phẩm nào</p>
                  <Link href="/san-pham/tao-moi" className="text-xs text-blue-600 hover:underline">
                    Tạo sản phẩm đầu tiên →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 px-4 py-2">
                  {products.map((p) => {
                    const stockCount = p._count.stockItems;
                    return (
                      <div key={p.id} className="py-3">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r2Url(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={18} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/tai-nguyen-mmo/san-pham/${p.id}`}
                                className="text-sm font-semibold text-gray-800 hover:underline truncate"
                              >
                                {p.name}
                              </Link>
                              {p.isRestricted ? (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                                  Bị khóa
                                </span>
                              ) : (
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  p.isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {p.isActive ? "Đang bán" : "Ẩn"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-red-500 mt-0.5">{formatVnd(Number(p.price))}</p>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <ShoppingBag size={10} /> {p._count.orders} đơn
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {formatDate(p.createdAt)}
                              </span>
                              <span className={`flex items-center gap-1 ${stockCount === 0 ? "text-red-500 font-medium" : ""}`}>
                                <Boxes size={10} /> {stockCount === 0 ? "Hết hàng" : `${stockCount} trong kho`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ProductActions
                          productId={p.id}
                          productName={p.name}
                          isRestricted={p.isRestricted}
                          stockCount={stockCount}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {productCount > 0 && (
                <div className="px-5 py-3 border-t border-gray-50">
                  <Link href="/san-pham" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    Quản lý tất cả sản phẩm <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>

            {/* ── Right: Orders + Store status ── */}
            <div className="space-y-4">

              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingBag size={14} className="text-gray-400" />
                    Đơn hàng gần đây
                  </h2>
                  <Link href="/ban-hang/don-hang" className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                    Xem tất cả <ChevronRight size={12} />
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <ShoppingBag size={18} className="text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400">Chưa có đơn hàng nào</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      <span>Sản phẩm</span>
                      <span>Trạng thái</span>
                      <span className="text-right">Doanh thu</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {recentOrders.map((order) => {
                        const st = ORDER_STATUS[order.status] ?? ORDER_STATUS["PENDING"]!;
                        return (
                          <div key={order.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-2.5 hover:bg-gray-50 transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{order.itemName}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</p>
                            </div>
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${st.cls}`}>
                              {st.label}
                            </span>
                            <p className="text-xs font-semibold text-red-500 text-right">
                              +{formatVnd(Number(order.finalPrice))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Store status */}
              <div className={`rounded-2xl border shadow-sm p-5 ${shopLocked ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Trạng thái cửa hàng
                </h3>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${shopLocked ? "bg-red-100" : "bg-emerald-50"}`}>
                    {shopLocked
                      ? <Lock size={16} className="text-red-600" />
                      : <Store size={16} className="text-emerald-600" />
                    }
                  </div>
                  <p className={`text-sm font-bold ${shopLocked ? "text-red-700" : "text-gray-800"}`}>
                    {shopLocked ? "Đang bị khóa" : "Đang hoạt động"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Danh mục:</span>
                    <span className="text-emerald-600 font-semibold">{user?.sellerCategory ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Sản phẩm:</span>
                    <span className="text-gray-800 font-semibold">{productCount}/{maxProducts}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed border-t border-gray-100 pt-3">
                  ✓ Chỉ bạn mới xem được đơn hàng và doanh số của cửa hàng mình.
                </p>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </>
  );
}
