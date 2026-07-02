import { prisma } from "@/lib/db/prisma";
import { formatVnd } from "@/lib/utils/format";

function defaultFromDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

export default async function AdminAffiliateReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from ? new Date(from) : defaultFromDate();
  const toDate = to ? new Date(to) : new Date();

  const rows = await prisma.$queryRaw<Array<{ day: Date; order_count: bigint; commission_amount: string }>>`
    SELECT date_trunc('day', created_at) AS day,
           COUNT(*) AS order_count,
           COALESCE(SUM(amount), 0) AS commission_amount
    FROM affiliate_commissions
    WHERE created_at BETWEEN ${fromDate} AND ${toDate} AND status != 'VOIDED'
    GROUP BY day
    ORDER BY day DESC
  `;

  const totalCommission = rows.reduce((sum, r) => sum + Number(r.commission_amount), 0);
  const totalOrders = rows.reduce((sum, r) => sum + Number(r.order_count), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Báo cáo Affiliate theo ngày</h1>
      <form className="flex gap-2" method="get">
        <input type="date" name="from" defaultValue={fromDate.toISOString().slice(0, 10)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={toDate.toISOString().slice(0, 10)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white">Lọc</button>
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
            {rows.map((r) => (
              <tr key={r.day.toISOString()}>
                <td className="px-4 py-3">{r.day.toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3">{Number(r.order_count)}</td>
                <td className="px-4 py-3 font-medium text-violet-600">{formatVnd(Number(r.commission_amount))}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian này</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
