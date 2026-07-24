import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import InlineStatusCell from "@/app/(admin)/admin/orders/_components/InlineStatusCell";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Admin — Bán tài nguyên" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý", PROCESSING: "Đang xử lý", DONE: "Hoàn thành",
  FROZEN: "Hủy đơn", REFUNDED: "Đã hoàn tiền", CANCELLED: "Đã hủy",
};

const PRODUCT_TYPES = [
  { key: "MMO_PRODUCT",      label: "Tài nguyên", icon: "💎", color: "#10B981", bg: "#10B981" },
  { key: "SELLER_PRODUCT",   label: "Nhà bán",    icon: "🏪", color: "#A855F7", bg: "#A855F7" },
  { key: "KHUONGFB_PRODUCT", label: "Khuongfb",   icon: "🔗", color: "#0891b2", bg: "#0891b2" },
] as const;

const PRODUCT_TYPE_KEYS = ["MMO_PRODUCT", "SELLER_PRODUCT", "KHUONGFB_PRODUCT"] as const;

const TYPE_COLORS: Record<string, string> = {
  MMO_PRODUCT:      "bg-[#10B981]/10 text-[#10B981]",
  SELLER_PRODUCT:   "bg-[#A855F7]/10 text-[#A855F7]",
  KHUONGFB_PRODUCT: "bg-[#0891b2]/10 text-[#0891b2]",
};

const STORE_SECTIONS = [
  { key: "TAI_NGUYEN_MMO", label: "Kho tài nguyên", icon: "🗂️" },
  { key: "KHO_TAI_NGUYEN", label: "Nguyên liệu",    icon: "🧱" },
] as const;

const STORE_SECTION_KEYS = ["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN"] as const;

export default async function BanTaiNguyenPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; status?: string; orderType?: string;
    dateFrom?: string; dateTo?: string; q?: string; limit?: string;
    section?: string;
  }>;
}) {
  const { page, status, orderType, dateFrom: dateFromParam, dateTo: dateToParam, q, limit: limitParam, section } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const _limit = parseInt(limitParam ?? "20", 10);
  const PAGE_SIZE = ([20, 50, 100] as number[]).includes(_limit) ? _limit : 20;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const isAllTime = dateFromParam === "all";
  const dateGte = isAllTime ? null : (dateFromParam ? new Date(dateFromParam + "T00:00:00") : todayStart);
  const dateLte = isAllTime ? null : (dateToParam && dateToParam !== "all" ? new Date(dateToParam + "T23:59:59") : todayEnd);
  const dateFilter = isAllTime ? {} : { createdAt: { gte: dateGte!, lte: dateLte! } };

  const validOrderType   = orderType && (PRODUCT_TYPE_KEYS as readonly string[]).includes(orderType) ? orderType : undefined;
  const validSection     = section && (STORE_SECTION_KEYS as readonly string[]).includes(section) ? section : undefined;

  // ── Build AND conditions ──────────────────────────────────────────────────
  const andConditions: object[] = [
    { orderType: validOrderType ? (validOrderType as never) : { in: PRODUCT_TYPE_KEYS as never } },
    ...(status ? [{ status: status as never }] : []),
    ...(isAllTime ? [] : [dateFilter]),
  ];

  // Section filter: chia theo orderType nếu đã chọn, otherwise OR
  if (validSection) {
    if (validOrderType === "MMO_PRODUCT") {
      andConditions.push({ mmoProduct: { section: validSection as never } });
    } else if (validOrderType === "SELLER_PRODUCT") {
      andConditions.push({ sellerProduct: { storeType: validSection as never } });
    } else if (validOrderType === "KHUONGFB_PRODUCT") {
      andConditions.push({ externalProduct: { displaySection: validSection as never } });
    } else {
      andConditions.push({
        OR: [
          { orderType: "MMO_PRODUCT",      mmoProduct:      { section:        validSection as never } },
          { orderType: "SELLER_PRODUCT",   sellerProduct:   { storeType:      validSection as never } },
          { orderType: "KHUONGFB_PRODUCT", externalProduct: { displaySection: validSection as never } },
        ],
      });
    }
  }

  // Search: mã đơn, email, externalOrderId
  if (q) {
    andConditions.push({
      OR: [
        { orderCode:       { contains: q, mode: "insensitive" as const } },
        { externalOrderId: { contains: q, mode: "insensitive" as const } },
        { user: { email:   { contains: q, mode: "insensitive" as const } } },
      ],
    });
  }

  const where = { AND: andConditions };

  const typeCountsWhere = {
    orderType: { in: PRODUCT_TYPE_KEYS as never },
    ...(status ? { status: status as never } : {}),
    ...dateFilter,
  };

  const kfbDateGteCondition = dateGte ? Prisma.sql`AND o.created_at >= ${dateGte}` : Prisma.empty;
  const kfbDateLteCondition = dateLte ? Prisma.sql`AND o.created_at <= ${dateLte}` : Prisma.empty;

  const [orders, total, processingCount, doneToday, revenueToday, typeCounts, kfbProfitRows] = await Promise.all([
    prisma.order.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderCode: true, itemName: true, orderType: true,
        originalPrice: true, finalPrice: true, status: true, createdAt: true,
        externalOrderId: true, partnerRefunded: true,
        coupon: { select: { code: true } },
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.order.count({ where: where as never }),
    prisma.order.count({ where: { status: "PROCESSING", orderType: { in: PRODUCT_TYPE_KEYS as never } } }),
    prisma.order.count({ where: { status: "DONE", orderType: validOrderType ? (validOrderType as never) : { in: PRODUCT_TYPE_KEYS as never }, ...dateFilter } }),
    prisma.order.aggregate({
      where: { status: "DONE", orderType: validOrderType ? (validOrderType as never) : { in: PRODUCT_TYPE_KEYS as never }, ...dateFilter } as never,
      _sum: { finalPrice: true },
    }),
    prisma.order.groupBy({
      by: ["orderType"],
      where: typeCountsWhere as never,
      _count: { id: true },
    }),
    validOrderType === "KHUONGFB_PRODUCT"
      ? prisma.$queryRaw<Array<{ total_profit: string | null }>>`
          SELECT COALESCE(SUM(
            o.final_price - ep.original_price * o.final_price / NULLIF(ep.sale_price, 0)
          ), 0)::text AS total_profit
          FROM orders o
          JOIN external_products ep ON o.external_product_id = ep.id
          WHERE o.order_type = 'KHUONGFB_PRODUCT'
            AND o.status = 'DONE'
            ${kfbDateGteCondition}
            ${kfbDateLteCondition}
        `
      : Promise.resolve(null as null),
  ]);

  const kfbTotalProfit = Array.isArray(kfbProfitRows) ? Number(kfbProfitRows[0]?.total_profit ?? 0) : 0;

  const typeCountMap: Record<string, number> = {};
  for (const row of typeCounts) {
    typeCountMap[row.orderType] = row._count.id;
  }
  const grandTotal  = Object.values(typeCountMap).reduce((a, b) => a + b, 0);
  const totalPages  = Math.ceil(total / PAGE_SIZE);

  const todayStr = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, "0")}-${String(todayStart.getDate()).padStart(2, "0")}`;
  const periodLabel = isAllTime
    ? "Tất cả"
    : !dateFromParam || (dateFromParam === todayStr && (!dateToParam || dateToParam === todayStr))
    ? "Hôm nay"
    : dateFromParam === dateToParam
    ? dateFromParam.split("-").reverse().join("/")
    : `${dateFromParam.split("-").reverse().join("/")} — ${(dateToParam ?? todayStr).split("-").reverse().join("/")}`;
  const selectedTypeLabel  = validOrderType ? PRODUCT_TYPES.find((t) => t.key === validOrderType)?.label : undefined;
  const selectedSectionLabel = validSection ? STORE_SECTIONS.find((s) => s.key === validSection)?.label : undefined;
  const periodCardLabel = [periodLabel, selectedTypeLabel, selectedSectionLabel].filter(Boolean).join(" · ");

  function buildUrl(overrides: {
    status?: string; orderType?: string; section?: string; page?: string;
  }) {
    const sp = new URLSearchParams();
    const s   = "status"    in overrides ? overrides.status    : status;
    const ot  = "orderType" in overrides ? overrides.orderType : validOrderType;
    const sec = "section"   in overrides ? overrides.section   : validSection;
    const pg  = "page"      in overrides ? overrides.page      : undefined;
    if (s)   sp.set("status",    s);
    if (ot)  sp.set("orderType", ot);
    if (sec) sp.set("section",   sec);
    if (dateFromParam) sp.set("dateFrom", dateFromParam);
    if (dateToParam)   sp.set("dateTo",   dateToParam);
    if (q)   sp.set("q", q);
    if (pg)  sp.set("page", pg);
    if (PAGE_SIZE !== 20) sp.set("limit", String(PAGE_SIZE));
    const qs = sp.toString();
    return qs ? `/admin/ban-tai-nguyen?${qs}` : "/admin/ban-tai-nguyen";
  }

  function limitUrl(n: number) {
    const sp = new URLSearchParams();
    if (status)        sp.set("status",    status);
    if (validOrderType) sp.set("orderType", validOrderType);
    if (validSection)  sp.set("section",   validSection);
    if (dateFromParam) sp.set("dateFrom",  dateFromParam);
    if (dateToParam)   sp.set("dateTo",    dateToParam);
    if (q)             sp.set("q", q);
    if (n !== 20)      sp.set("limit", String(n));
    const qs = sp.toString();
    return qs ? `/admin/ban-tai-nguyen?${qs}` : "/admin/ban-tai-nguyen";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bán tài nguyên</h1>
          <p className="text-sm text-gray-500 mt-1">Đơn hàng sản phẩm số — Tài nguyên MMO, Nhà bán, Khuongfb</p>
        </div>
        <span className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-600">
          {grandTotal.toLocaleString("vi-VN")} đơn
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Đang xử lý</p>
          <p className="text-3xl font-bold text-[#A855F7]">{processingCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Chờ fulfill</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Hoàn thành — {periodCardLabel}</p>
          <p className="text-3xl font-bold text-[#10B981]">{doneToday.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đơn thành công</p>
        </div>
        <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 p-5">
          <p className="text-xs font-medium text-[#2563eb] uppercase tracking-wide mb-2">Doanh thu — {periodCardLabel}</p>
          <p className="text-2xl font-bold text-[#2563eb]">{formatVnd(Number(revenueToday._sum.finalPrice ?? 0))}</p>
          {validOrderType === "KHUONGFB_PRODUCT" ? (
            <p className="text-xs text-amber-600 font-semibold mt-1.5">
              Lợi nhuận: {formatVnd(kfbTotalProfit)}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1.5">Từ đơn hoàn thành</p>
          )}
        </div>
      </div>

      {/* Product type tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link
          href={buildUrl({ orderType: undefined })}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
            !validOrderType
              ? "bg-gray-900 border-gray-900 text-white shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <span className="text-lg leading-none">📋</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Tất cả</p>
            <p className={`text-sm font-bold ${!validOrderType ? "text-white" : "text-gray-800"}`}>
              {grandTotal.toLocaleString("vi-VN")}
            </p>
          </div>
        </Link>

        {PRODUCT_TYPES.map((t) => {
          const count    = typeCountMap[t.key] ?? 0;
          const isActive = validOrderType === t.key;
          return (
            <Link
              key={t.key}
              href={buildUrl({ orderType: t.key })}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
                isActive
                  ? "border-current shadow-sm text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              style={isActive ? { backgroundColor: t.bg, borderColor: t.bg } : {}}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{t.label}</p>
                <p className={`text-sm font-bold ${isActive ? "text-white" : "text-gray-800"}`}>
                  {count.toLocaleString("vi-VN")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Store section filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Kho hàng:</span>
        <Link
          href={buildUrl({ section: undefined })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            !validSection
              ? "bg-gray-800 text-white"
              : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
          }`}
        >
          Tất cả
        </Link>
        {STORE_SECTIONS.map(({ key, label, icon }) => (
          <Link
            key={key}
            href={buildUrl({ section: key })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              validSection === key
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </div>

      {/* Search + Date filter */}
      <AdminFilterBar
        basePath="/admin/ban-tai-nguyen"
        search={{ placeholder: "Tìm mã đơn, Trans ID, email người mua..." }}
        dateRange={{ showQuickDates: true }}
        preserveParams={["status", "orderType", "section", "limit"]}
      />

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Trạng thái:</span>
        {[
          { key: "",           label: "Tất cả",       color: "#10B981" },
          { key: "PROCESSING", label: "Đang xử lý",   color: "#10B981" },
          { key: "DONE",       label: "Hoàn thành",   color: "#10B981" },
          { key: "FROZEN",     label: "Hủy đơn",      color: "#EF4444" },
          { key: "REFUNDED",   label: "Đã hoàn tiền", color: "#EF4444" },
          { key: "CANCELLED",  label: "Đã hủy",       color: "#10B981" },
        ].map(({ key, label, color }) => (
          <Link
            key={key}
            href={buildUrl({ status: key || undefined })}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:opacity-80"
            style={
              status === key || (!status && !key)
                ? { backgroundColor: color, color: "#FFFFFF" }
                : { backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", color: "#6B7280" }
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">
              {total.toLocaleString("vi-VN")} đơn hàng
              {validOrderType ? ` · ${PRODUCT_TYPES.find((t) => t.key === validOrderType)?.label ?? validOrderType}` : ""}
              {validSection ? ` · ${STORE_SECTIONS.find((s) => s.key === validSection)?.label ?? validSection}` : ""}
              {status ? ` · ${STATUS_LABELS[status] ?? status}` : ""}
              {q ? ` · "${q}"` : ""}
            </span>
            {validOrderType && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${TYPE_COLORS[validOrderType] ?? ""}`}>
                {PRODUCT_TYPES.find((t) => t.key === validOrderType)?.icon}{" "}
                {PRODUCT_TYPES.find((t) => t.key === validOrderType)?.label}
              </span>
            )}
            {validSection && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                {STORE_SECTIONS.find((s) => s.key === validSection)?.icon}{" "}
                {STORE_SECTIONS.find((s) => s.key === validSection)?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Hiển thị:</span>
            {[20, 50, 100].map((n) => (
              <Link
                key={n}
                href={limitUrl(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  PAGE_SIZE === n
                    ? "bg-[#10B981] border-[#10B981] text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-[#10B981] hover:text-[#10B981]"
                }`}
              >
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Người mua</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã giảm giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Thời gian</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="text-sm font-medium text-gray-600">Không có đơn hàng nào</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc</p>
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const typeInfo = PRODUCT_TYPES.find((t) => t.key === order.orderType);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono font-semibold text-gray-700">{order.orderCode}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[order.orderType] ?? "bg-gray-100 text-gray-500"}`}>
                        {typeInfo?.icon} {typeInfo?.label ?? order.orderType}
                      </span>
                      {order.externalOrderId && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-30">
                          {order.externalOrderId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-60">
                      <p className="text-sm text-gray-900 font-medium leading-snug line-clamp-2">{order.itemName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium text-gray-700 truncate max-w-35">{order.user.fullName || "—"}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-35 font-mono">{order.user.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm font-bold text-[#10B981]">{formatVnd(Number(order.finalPrice))}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {order.coupon ? (
                        <>
                          <p className="text-xs font-mono font-semibold text-[#2563eb]">{order.coupon.code}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            -{formatVnd(Number(order.originalPrice) - Number(order.finalPrice))}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <InlineStatusCell orderId={order.id} status={order.status} />
                      {order.partnerRefunded && (
                        <span className="mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#3B82F6]/10 text-[#3B82F6]">
                          Đã hoàn tiền
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        prefetch={false}
                        href={`/admin/ban-tai-nguyen/${order.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#10B981] bg-[#10B981]/8 hover:bg-[#10B981]/15 transition-colors"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/ban-tai-nguyen"
          searchParams={{
            ...(status ? { status } : {}),
            ...(validOrderType ? { orderType: validOrderType } : {}),
            ...(validSection ? { section: validSection } : {}),
            ...(dateFromParam ? { dateFrom: dateFromParam } : {}),
            ...(dateToParam ? { dateTo: dateToParam } : {}),
            ...(q ? { q } : {}),
            ...(PAGE_SIZE !== 20 ? { limit: String(PAGE_SIZE) } : {}),
          }}
        />
      )}
    </div>
  );
}
