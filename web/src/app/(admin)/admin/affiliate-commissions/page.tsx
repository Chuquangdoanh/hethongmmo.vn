import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CommissionBulkTable from "./_components/CommissionBulkTable";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  VOIDED: "Đã hủy",
};

const STATUS_FILTERS: Array<{ label: string; value?: "PENDING" | "APPROVED" | "VOIDED" }> = [
  { label: "Tất cả" },
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Đã hủy", value: "VOIDED" },
];

function reportDefaultFromDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

function TabNav({ tab }: { tab: "duyet" | "baocao" }) {
  const base = "px-4 py-2 text-sm font-medium border-b-2 -mb-px";
  const active = "border-violet-600 text-violet-700";
  const idle = "border-transparent text-gray-500 hover:text-gray-700";
  return (
    <div className="flex gap-2 border-b border-gray-200">
      <Link href="/admin/affiliate-commissions" className={`${base} ${tab === "duyet" ? active : idle}`}>
        Duyệt
      </Link>
      <Link href="/admin/affiliate-commissions?tab=baocao" className={`${base} ${tab === "baocao" ? active : idle}`}>
        Báo cáo
      </Link>
    </div>
  );
}

export default async function AdminAffiliateCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; status?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const tab: "duyet" | "baocao" = sp.tab === "baocao" ? "baocao" : "duyet";

  if (tab === "baocao") {
    const fromDate = sp.from ? new Date(sp.from) : reportDefaultFromDate();
    const toDate = sp.to ? new Date(sp.to) : new Date();

    const reportRows = await prisma.$queryRaw<Array<{ day: Date; order_count: bigint; commission_amount: string }>>`
      SELECT date_trunc('day', created_at) AS day,
             COUNT(*) AS order_count,
             COALESCE(SUM(amount), 0) AS commission_amount
      FROM affiliate_commissions
      WHERE created_at BETWEEN ${fromDate} AND ${toDate} AND status != 'VOIDED'
      GROUP BY day
      ORDER BY day DESC
    `;

    const totalCommission = reportRows.reduce((sum, r) => sum + Number(r.commission_amount), 0);
    const totalOrders = reportRows.reduce((sum, r) => sum + Number(r.order_count), 0);

    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Hoa hồng Affiliate</h1>
        <TabNav tab={tab} />

        <form className="flex gap-2" method="get">
          <input type="hidden" name="tab" value="baocao" />
          <input
            type="date"
            name="from"
            defaultValue={fromDate.toISOString().slice(0, 10)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="to"
            defaultValue={toDate.toISOString().slice(0, 10)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white">
            Lọc
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Tổng đơn hàng có hoa hồng</p>
            <p className="text-xl font-semibold">{totalOrders}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Tổng hoa hồng phát sinh</p>
            <p className="text-xl font-semibold text-violet-600">{formatVnd(totalCommission)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Số đơn</th>
                <th className="px-4 py-3">Hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportRows.map((r) => (
                <tr key={r.day.toISOString()}>
                  <td className="px-4 py-3">{r.day.toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3">{Number(r.order_count)}</td>
                  <td className="px-4 py-3 font-medium text-violet-600">{formatVnd(Number(r.commission_amount))}</td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    Không có dữ liệu trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── tab === "duyet" ───────────────────────────────────────────────
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const validStatus: "PENDING" | "APPROVED" | "VOIDED" | undefined =
    sp.status === "PENDING" || sp.status === "APPROVED" || sp.status === "VOIDED" ? sp.status : undefined;

  const where = validStatus ? { status: validStatus } : {};
  const [commissions, total] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where,
      include: {
        affiliate: { select: { fullName: true, affiliateCode: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.affiliateCommission.count({ where }),
  ]);

  const rows = commissions.map((c) => ({
    id: c.id,
    affiliate: c.affiliate.fullName,
    affiliateCode: c.affiliate.affiliateCode ?? "",
    customer: c.customer.fullName,
    orderAmount: formatVnd(Number(c.orderAmount)),
    amount: formatVnd(Number(c.amount)),
    status: c.status,
    statusLabel: STATUS_LABEL[c.status] ?? c.status,
    date: formatDate(c.createdAt),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Hoa hồng Affiliate</h1>
      <TabNav tab={tab} />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = validStatus === f.value || (!validStatus && !f.value);
          const href = f.value
            ? `/admin/affiliate-commissions?status=${f.value}`
            : "/admin/affiliate-commissions";
          return (
            <Link
              key={f.label}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white"
                  : "rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <CommissionBulkTable rows={rows} />

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        basePath="/admin/affiliate-commissions"
        searchParams={validStatus ? { status: validStatus } : {}}
      />
    </div>
  );
}
