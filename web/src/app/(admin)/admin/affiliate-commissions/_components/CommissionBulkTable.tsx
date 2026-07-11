"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommissionActionButtons from "./CommissionActionButtons";

interface CommissionRow {
  id: string;
  affiliate: string;
  affiliateCode: string;
  customer: string;
  orderId: string;
  orderCode: string;
  orderStatusLabel: string;
  orderAmount: string;
  amount: string;
  status: string;
  statusLabel: string;
  date: string;
}

export default function CommissionBulkTable({ rows }: { rows: CommissionRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const pendingIds = rows.filter((r) => r.status === "PENDING").map((r) => r.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (pendingIds.every((id) => prev.has(id)) ? new Set() : new Set(pendingIds)));
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/affiliate-commissions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "APPROVE" }),
          }),
        ),
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
          <span className="text-sm text-gray-700">
            Đã chọn <strong>{selected.size}</strong> khoản chờ duyệt
          </span>
          <button
            type="button"
            disabled={bulkLoading}
            onClick={handleBulkApprove}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {bulkLoading ? "Đang duyệt..." : `Duyệt nhanh ${selected.size} mục`}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleAll}
                  disabled={pendingIds.length === 0}
                  aria-label="Chọn tất cả khoản chờ duyệt"
                />
              </th>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Mã đơn hàng</th>
              <th className="px-4 py-3">Trạng thái đơn hàng</th>
              <th className="px-4 py-3">Giá trị đơn</th>
              <th className="px-4 py-3">Hoa hồng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  {r.status === "PENDING" && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label="Chọn khoản hoa hồng"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.affiliate} <span className="text-xs text-gray-400">({r.affiliateCode})</span>
                </td>
                <td className="px-4 py-3">{r.customer}</td>
                <td className="px-4 py-3">
                  <Link
                    prefetch={false}
                    href={`/admin/orders/${r.orderId}`}
                    className="font-mono text-xs text-violet-600 hover:underline"
                  >
                    {r.orderCode}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.orderStatusLabel}</td>
                <td className="px-4 py-3">{r.orderAmount}</td>
                <td className="px-4 py-3 font-medium text-violet-600">{r.amount}</td>
                <td className="px-4 py-3">{r.statusLabel}</td>
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3">
                  <CommissionActionButtons commissionId={r.id} status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  Không có hoa hồng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
