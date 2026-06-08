import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { Package, ShoppingBag } from "lucide-react";
import UserProfileHero from "@/components/shared/UserProfileHero";
import Pagination from "@/components/shared/Pagination";
import OrderActions from "./_components/OrderActions";

export const metadata: Metadata = { title: "Lịch sử mua hàng" };

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Chờ xử lý",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Đang xử lý",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  DONE:       { label: "Hoàn thành",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED:  { label: "Đã hủy",       cls: "bg-gray-50 text-gray-500 border-gray-200" },
  REFUNDED:   { label: "Hoàn tiền",    cls: "bg-red-50 text-red-600 border-red-200" },
  DISPUTED:   { label: "Đã khiếu nại", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  FROZEN:     { label: "Đóng băng",    cls: "bg-red-50 text-red-600 border-red-200" },
};

const TAB_TYPES = {
  khoahoc:   ["COURSE"] as never[],
  tuttrick:  ["TUTTRICK"] as never[],
  tainguyen: ["MMO_PRODUCT", "SELLER_PRODUCT"] as never[],
  dichvu:    ["SERVICE"] as never[],
};

const TAB_LABELS: Record<string, string> = {
  khoahoc:   "Khóa học",
  tuttrick:  "Tut & Trick",
  tainguyen: "Tài nguyên",
  dichvu:    "Dịch vụ",
};

const HAS_ACTIONS = new Set(["tuttrick", "tainguyen"]);
// Các tab này chỉ hiển thị đơn trong 7 ngày gần nhất
const EXPIRES_7_DAYS = new Set(["tuttrick", "tainguyen"]);

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;
  const { tab, page } = await searchParams;

  const activeTab = (tab && tab in TAB_TYPES) ? tab : "khoahoc";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const orderTypeFilter = TAB_TYPES[activeTab as keyof typeof TAB_TYPES];

  // Đơn tài nguyên / tut-trick chỉ hiện trong 7 ngày
  // eslint-disable-next-line react-hooks/purity -- Server Component, Date.now() is safe per-request
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateFilter = EXPIRES_7_DAYS.has(activeTab) ? { createdAt: { gte: sevenDaysAgo } } : {};
  const ordersWhere = { userId: me.id, orderType: { in: orderTypeFilter }, ...dateFilter };

  const [user, lastDeposit, orders, total,
    khoahocCount, dichvuCount, tuttrickCount, tainguyenCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        balance: true, totalDeposited: true, totalSpent: true,
        uidPrefix: true, fullName: true, email: true, role: true, avatarUrl: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId: me.id, type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] as never[] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.order.findMany({
      where: ordersWhere,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderCode: true, itemName: true,
        orderType: true, finalPrice: true, status: true, createdAt: true,
      },
    }),
    prisma.order.count({ where: ordersWhere }),
    // Badge counts — tài nguyên & tut-trick lọc 7 ngày
    prisma.order.count({ where: { userId: me.id, orderType: "COURSE" as never } }),
    prisma.order.count({ where: { userId: me.id, orderType: "SERVICE" as never } }),
    prisma.order.count({ where: { userId: me.id, orderType: "TUTTRICK" as never, createdAt: { gte: sevenDaysAgo } } }),
    prisma.order.count({ where: { userId: me.id, orderType: { in: ["MMO_PRODUCT", "SELLER_PRODUCT"] as never[] }, createdAt: { gte: sevenDaysAgo } } }),
  ]);

  if (!user) return null;

  const complainedOrderIds = new Set<string>();
  if (orders.length > 0) {
    const complaints = await prisma.complaint.findMany({
      where: { userId: me.id, orderId: { in: orders.map((o) => o.id) } },
      select: { orderId: true },
    });
    for (const c of complaints) {
      if (c.orderId) complainedOrderIds.add(c.orderId);
    }
  }

  const balance        = Number(user.balance);
  const totalDeposited = Number(user.totalDeposited);
  const totalSpent     = Number(user.totalSpent);
  const totalPages     = Math.ceil(total / PAGE_SIZE);

  const tabCounts: Record<string, number> = {
    khoahoc:   khoahocCount,
    tuttrick:  tuttrickCount,
    tainguyen: tainguyenCount,
    dichvu:    dichvuCount,
  };

  const showActions = HAS_ACTIONS.has(activeTab);

  return (
    <>
      <UserProfileHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        uidPrefix={user.uidPrefix}
        balance={balance}
        totalDeposited={totalDeposited}
        totalSpent={totalSpent}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="orders"
        avatarUrl={user.avatarUrl ?? null}
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">

        {/* Category sub-tabs */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {Object.entries(TAB_LABELS).map(([key, label]) => {
            const count = tabCounts[key] ?? 0;
            const isActive = activeTab === key;
            return (
              <Link
                key={key}
                href={`/don-hang?tab=${key}`}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {label}
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Orders table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Package size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Chưa có đơn hàng nào</p>
              <p className="text-xs text-gray-400 mt-1">Mục này sẽ hiển thị sau khi bạn mua hàng</p>
            </div>
          ) : (
            <>
              {/* Table header — desktop only */}
              <div className={`hidden md:grid gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                showActions ? "grid-cols-[1fr_140px_100px_110px_180px]" : "grid-cols-[1fr_140px_100px_110px]"
              }`}>
                <span className="flex items-center gap-1.5">
                  <ShoppingBag size={11} />
                  {activeTab === "tainguyen" ? "Tên tài nguyên" : "Tên sản phẩm"}
                </span>
                <span>Thời gian</span>
                <span>Trạng thái</span>
                <span className="text-right">Số tiền</span>
                {showActions && <span className="text-center">Thao tác</span>}
              </div>

              {/* Table rows */}
              <div className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const st = STATUS_STYLES[order.status] ?? STATUS_STYLES["PENDING"]!;
                  const isMMO    = order.orderType === "MMO_PRODUCT";
                  const isSeller = order.orderType === "SELLER_PRODUCT";
                  const isDone   = order.status === "DONE";
                  const hasComplaint = complainedOrderIds.has(order.id);

                  return (
                    <div
                      key={order.id}
                      className={`md:grid gap-3 items-center px-5 py-3.5 hover:bg-gray-50/80 transition-colors ${
                        showActions ? "md:grid-cols-[1fr_140px_100px_110px_180px]" : "md:grid-cols-[1fr_140px_100px_110px]"
                      }`}
                    >
                      {/* Name + badge */}
                      <div className="flex items-start gap-2 min-w-0 mb-2 md:mb-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 truncate">{order.itemName}</span>
                            {isMMO && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Hệ Thống MMO</span>
                            )}
                            {isSeller && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Nhà bán hàng</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">#{order.orderCode}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mb-2 md:mb-0">{formatDate(order.createdAt)}</p>

                      <div className="mb-2 md:mb-0">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-emerald-600 md:text-right mb-2 md:mb-0">
                        {formatVnd(Number(order.finalPrice))}
                      </p>

                      {showActions && (
                        <div className="flex md:justify-center">
                          <OrderActions
                            orderId={order.id}
                            itemName={order.itemName}
                            isDone={isDone}
                            hasComplaint={hasComplaint}
                            allowComplaint={activeTab === "tainguyen"}
                            orderCreatedAt={order.createdAt.toISOString()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/don-hang"
              searchParams={{ tab: activeTab }}
            />
          </div>
        )}
      </div>
    </>
  );
}
