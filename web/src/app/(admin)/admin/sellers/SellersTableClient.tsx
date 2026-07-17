"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ShopLockAdminButton from "./[id]/ShopLockAdminButton";
import { formatDate, formatVnd } from "@/lib/utils/format";

export interface SellerRowData {
  requestId: string;
  userId: string;
  fullName: string;
  email: string;
  category: string;
  storeType: string;
  status: string;
  tierLabel: string;
  tierColorClass: string;
  productUsed: number;
  productMax: number;
  revenue: number;
  escrowAmount: number;
  avgRating: number;
  reviewCount: number;
  shopLocked: boolean;
  bankStatus: "PENDING" | "APPROVED" | "NONE";
  reverifyStatus: "IN_PROGRESS" | "VERIFIED" | "NONE";
  createdAt: string;
}

const BANK_STATUS_LABEL: Record<SellerRowData["bankStatus"], string> = {
  PENDING:  "Chờ duyệt",
  APPROVED: "Đã duyệt",
  NONE:     "Chưa có STK",
};
const BANK_STATUS_STYLES: Record<SellerRowData["bankStatus"], string> = {
  PENDING:  "text-amber-600 bg-amber-50 border-amber-200",
  APPROVED: "text-emerald-600 bg-emerald-50 border-emerald-200",
  NONE:     "text-gray-400 bg-gray-50 border-gray-200",
};

const REVERIFY_STATUS_LABEL: Record<SellerRowData["reverifyStatus"], string> = {
  IN_PROGRESS: "Đang xác minh",
  VERIFIED:    "Đã xác minh",
  NONE:        "—",
};
const REVERIFY_STATUS_STYLES: Record<SellerRowData["reverifyStatus"], string> = {
  IN_PROGRESS: "text-amber-600 bg-amber-50 border-amber-200",
  VERIFIED:    "text-emerald-600 bg-emerald-50 border-emerald-200",
  NONE:        "text-gray-400 bg-gray-50 border-gray-200",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-[#F59E0B]/10 text-[#F59E0B]",
  APPROVED: "bg-[#10B981]/10 text-[#10B981]",
  REJECTED: "bg-[#EF4444]/10 text-[#EF4444]",
  REVOKED:  "bg-[#71717A]/10 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt", APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",  REVOKED: "Thu hồi",
};

interface Props {
  rows: SellerRowData[];
  revenueSortHref: string;
  ratingSortHref: string;
  escrowSortHref: string;
  activeSort?: string;
}

export default function SellersTableClient({ rows, revenueSortHref, ratingSortHref, escrowSortHref, activeSort }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const approvedIds = rows.filter((r) => r.status === "APPROVED").map((r) => r.requestId);
  const allSelected = approvedIds.length > 0 && approvedIds.every((id) => selected.has(id));
  const someSelected = !allSelected && approvedIds.some((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(approvedIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkLock(lock: boolean) {
    setBulkError(null);
    const requestIds = Array.from(selected);
    const res = await fetch("/api/admin/sellers/bulk-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestIds, lock }),
    });
    const json = (await res.json()) as { error?: string; data?: { updated: number } };
    if (!res.ok) { setBulkError(json.error ?? "Lỗi không xác định"); return; }
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  const selectedCount = selected.size;

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl flex-wrap">
          <span className="text-xs font-semibold text-violet-700">{selectedCount} gian hàng được chọn</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              onClick={() => { void bulkLock(true); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Khóa {selectedCount} gian hàng
            </button>
            <button
              onClick={() => { void bulkLock(false); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Mở khóa {selectedCount}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
          {bulkError && <p className="w-full text-xs text-red-500 mt-1">{bulkError}</p>}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    title="Chọn tất cả gian hàng đã duyệt"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Ngày đăng ký</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Danh mục</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hạng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Slot gian hàng</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                  <Link
                    href={revenueSortHref}
                    className="inline-flex items-center gap-1 justify-end hover:text-violet-600 transition-colors"
                  >
                    Doanh số
                    <span className="text-gray-400 text-[10px]">
                      {activeSort === "revenue_desc" ? "↓" : activeSort === "revenue_asc" ? "↑" : "↕"}
                    </span>
                  </Link>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">
                  <Link
                    href={escrowSortHref}
                    className="inline-flex items-center gap-1 justify-end hover:text-violet-600 transition-colors"
                  >
                    Kí quỹ
                    <span className="text-gray-400 text-[10px]">
                      {activeSort === "escrow_desc" ? "↓" : activeSort === "escrow_asc" ? "↑" : "↕"}
                    </span>
                  </Link>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <Link
                    href={ratingSortHref}
                    className="inline-flex items-center gap-1 hover:text-violet-600 transition-colors"
                  >
                    Đánh giá TB
                    <span className="text-gray-400 text-[10px]">
                      {activeSort === "rating_desc" ? "↓" : activeSort === "rating_asc" ? "↑" : "↕"}
                    </span>
                  </Link>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Xác minh tài khoản</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <p className="text-sm text-gray-500">Không có dữ liệu</p>
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const isApproved = r.status === "APPROVED";
                const isChecked = selected.has(r.requestId);
                const full = r.productUsed >= r.productMax;
                return (
                  <tr
                    key={r.requestId}
                    className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50 transition-colors ${isChecked ? "bg-violet-50/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      {isApproved ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(r.requestId)}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                      ) : (
                        <div className="w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(new Date(r.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{r.fullName}</p>
                      <p className="text-[11px] text-gray-500">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{r.category}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-semibold ${
                        r.storeType === "KHO_TAI_NGUYEN"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-violet-50 text-violet-600"
                      }`}>
                        {r.storeType === "KHO_TAI_NGUYEN" ? "Kho TN" : "TN MMO"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isApproved ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.tierColorClass}`}>
                          {r.tierLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isApproved ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          full
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {r.productUsed}/{r.productMax}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isApproved ? (
                        <span className="text-sm font-semibold text-emerald-700">{formatVnd(r.revenue)}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isApproved ? (
                        <span className={`text-sm font-semibold ${r.escrowAmount > 0 ? "text-[#F59E0B]" : "text-gray-400"}`}>
                          {r.escrowAmount > 0 ? formatVnd(r.escrowAmount) : "—"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isApproved && r.reviewCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-sm leading-none">★</span>
                          <span className="text-xs font-semibold text-amber-500">{r.avgRating.toFixed(1)}</span>
                          <span className="text-[10px] text-gray-400">({r.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isApproved ? (
                        <ShopLockAdminButton requestId={r.requestId} locked={r.shopLocked} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/sellers/${r.requestId}`}>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${REVERIFY_STATUS_STYLES[r.reverifyStatus]}`}>
                          {REVERIFY_STATUS_LABEL[r.reverifyStatus]}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/sellers/${r.requestId}`} className="text-xs text-[#7C3AED] hover:text-[#A855F7]">
                        {r.status === "PENDING" ? "Duyệt" : "Chi tiết"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
