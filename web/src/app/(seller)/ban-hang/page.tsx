import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import { getSellerConfig, DEFAULT_SLOT_PACKAGES } from "@/lib/services/seller.service";
import {
  Package, ShoppingBag, TrendingUp, Wallet, Store, Lock,
  Plus, ChevronRight, Boxes, Info, AlertTriangle, Building2,
  ArrowDownToLine, Calendar,
} from "lucide-react";
import ProductActions from "./_components/ProductActions";
import RegisterSlotsModal from "./_components/RegisterSlotsModal";
import SellerProfileHero from "@/components/shared/SellerProfileHero";

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

  const config = await getSellerConfig();
  const holdDays = config.order_hold_days ?? 3;
  const feePercent = config.withdrawal_fee_percent ?? 5;
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
      sub: `Còn ${maxProducts - productCount} slot`,
      valueColor: "text-blue-600", iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      Icon: ShoppingBag, label: "Đơn hàng",
      value: totalOrders.toLocaleString("vi-VN"),
      sub: "Tổng đơn",
      valueColor: "text-purple-600", iconBg: "bg-purple-50", iconColor: "text-purple-600",
    },
    {
      Icon: TrendingUp,  label: "Doanh thu",
      value: formatVnd(revenue),
      sub: "Đơn hoàn thành",
      valueColor: "text-emerald-600", iconBg: "bg-emerald-50", iconColor: "text-emerald-600",
    },
    {
      Icon: Wallet,      label: "Có thể rút",
      value: formatVnd(qualifyingNet),
      sub: `Sau phí ${feePercent}%`,
      valueColor: "text-amber-600", iconBg: "bg-amber-50", iconColor: "text-amber-600",
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
                <p className="text-sm font-semibold text-red-700">Gian hàng đang bị khóa bởi Admin</p>
                <p className="text-xs text-red-500 mt-0.5">Sản phẩm đã ẩn khỏi trang công khai. Bạn không thể rút tiền. Liên hệ admin để được mở khóa.</p>
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
                  <RegisterSlotsModal
                    packages={slotPackages}
                    currentSlots={maxProducts}
                    userBalance={userBalance}
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
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
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

          {/* ── Withdrawal section ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <ArrowDownToLine size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Rút tiền</h2>
              <span className="text-[11px] font-normal text-gray-400">(Đơn hoàn thành trên {holdDays} ngày mới đủ điều kiện)</span>
            </div>
            {shopLocked ? (
              <div className="p-6 flex items-center gap-4 bg-red-50 rounded-b-2xl">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Lock size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Không thể rút tiền khi shop bị khóa</p>
                  <p className="text-xs text-red-500 mt-0.5">Mở khóa gian hàng trong mục Trạng thái cửa hàng ở trên để tiếp tục rút tiền.</p>
                </div>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Balance + form */}
                <div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-4">
                    <p className="text-[11px] text-gray-500 mb-1">Doanh thu đủ điều kiện rút</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatVnd(qualifyingGross)}</p>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Phí dịch vụ ({feePercent}%):</span>
                      <span className="text-gray-700 font-medium">{formatVnd(qualifyingFee)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>Thực nhận:</span>
                      <span className="text-emerald-600 font-semibold">{formatVnd(qualifyingNet)}</span>
                    </div>
                  </div>

                  {!hasBankInfo ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle size={18} className="text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Chưa có thông tin ngân hàng</p>
                      <p className="text-xs text-amber-600 mb-3">Cập nhật trong hồ sơ để rút tiền</p>
                      <Link
                        href="/thong-tin-ca-nhan"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Cập nhật hồ sơ →
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5 mb-4">
                        {[
                          { label: "Ngân hàng", value: bankName, Icon: Building2 },
                          { label: "Số tài khoản", value: bankAccountNumber, Icon: Wallet },
                          { label: "Chủ tài khoản", value: bankAccountHolder, Icon: Info },
                        ].map(({ label, value, Icon }) => (
                          <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                              <Icon size={10} /> {label}
                            </p>
                            <p className="text-sm text-gray-800 font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/rut-tien"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                      >
                        <ArrowDownToLine size={15} />
                        Rút tiền ngay
                      </Link>
                    </>
                  )}
                </div>

                {/* Right: Withdrawal history */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Lịch sử rút tiền
                  </h3>
                  {withdrawals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <ArrowDownToLine size={20} className="text-gray-300" />
                      </div>
                      <p className="text-xs font-medium text-gray-500">Chưa có lịch sử</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Yêu cầu rút tiền sẽ hiển thị tại đây</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {withdrawals.map((w) => {
                        const st = WITHDRAWAL_STATUS[w.status] ?? WITHDRAWAL_STATUS["PENDING"]!;
                        return (
                          <div key={w.id} className="py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{formatVnd(Number(w.amount))}</p>
                              <p className="text-[11px] text-gray-400">
                                Nhận: {formatVnd(Number(w.netAmount))} · Phí: {formatVnd(Number(w.feeAmount))}
                              </p>
                              {w.rejectReason && (
                                <p className="text-[11px] text-red-500 mt-0.5">Lý do: {w.rejectReason}</p>
                              )}
                              <p className="text-[11px] text-gray-400">{formatDate(w.createdAt)}</p>
                            </div>
                            <span className={`shrink-0 text-xs font-semibold ${st.cls}`}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                      <div className="pt-2">
                        <Link href="/rut-tien" className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                          Xem tất cả <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
