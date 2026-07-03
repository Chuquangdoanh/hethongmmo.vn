"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { Trash2, ArrowDownUp, ArrowDown } from "lucide-react";
import InlineRoleCell from "./InlineRoleCell";
import InlineUserStatusCell from "./InlineUserStatusCell";

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng", SELLER: "Nhà bán", STAFF: "Nhân viên", ADMIN: "Admin",
};

type User = {
  id: string;
  uidPrefix: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  balance: { toString(): string } | number | string;
  totalDeposited: number;
  discountPercent: number;
  createdAt: Date;
  _count: { orders: number };
};

function getDiscountDisplay(totalDeposited: number, discountPercent: number) {
  if (discountPercent > 0) return { pct: discountPercent, label: "Override", isOverride: true };
  if (totalDeposited >= 200_000_000) return { pct: 10, label: "Gold",   isOverride: false };
  if (totalDeposited >= 100_000_000) return { pct: 7,  label: "Silver", isOverride: false };
  if (totalDeposited >= 50_000_000)  return { pct: 5,  label: "Thẻ",    isOverride: false };
  return { pct: 0, label: "Thường", isOverride: false };
}

interface Props {
  users: User[];
  currentUserId: string;
  total: number;
  role?: string;
  q?: string;
  sort?: string;
}

export default function UsersTableClient({ users, currentUserId, total, role, q, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const isSortedByDeposit = sort === "deposit";
  const isSortedByBalance = sort === "balance";

  function handleDepositSort() {
    const params = new URLSearchParams(searchParams.toString());
    if (isSortedByDeposit) {
      params.delete("sort");
    } else {
      params.set("sort", "deposit");
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleBalanceSort() {
    const params = new URLSearchParams(searchParams.toString());
    if (isSortedByBalance) {
      params.delete("sort");
    } else {
      params.set("sort", "balance");
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const deletableIds = users
    .filter((u) => u.id !== currentUserId && u.role !== "ADMIN")
    .map((u) => u.id);

  const allChecked = deletableIds.length > 0 && deletableIds.every((id) => selected.has(id));
  const someChecked = deletableIds.some((id) => selected.has(id));

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deletableIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Xóa vĩnh viễn ${ids.length} tài khoản khỏi database?\n\nToàn bộ đơn hàng, giao dịch, đánh giá liên quan cũng sẽ bị xóa. Không thể hoàn tác.`)) return;

    startTransition(async () => {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/users/${id}`, { credentials: "include", method: "DELETE" }).then((r) => r.json())
        )
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Table header bar */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">
          {total.toLocaleString("vi-VN")} người dùng
          {role ? ` · ${ROLE_LABELS[role] ?? role}` : ""}
          {q ? ` · "${q}"` : ""}
        </span>

        {selected.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Đã chọn <strong>{selected.size}</strong></span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={13} strokeWidth={2} />
              {isPending ? "Đang xóa..." : "Xóa được chọn"}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                <button
                  onClick={handleBalanceSort}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-violet-600 ${isSortedByBalance ? "text-violet-600" : "text-gray-500"}`}
                >
                  Số dư
                  {isSortedByBalance ? (
                    <ArrowDown size={13} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownUp size={12} strokeWidth={2} className="opacity-40" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                <button
                  onClick={handleDepositSort}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-violet-600 ${isSortedByDeposit ? "text-violet-600" : "text-gray-500"}`}
                >
                  Tổng nạp
                  {isSortedByDeposit ? (
                    <ArrowDown size={13} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownUp size={12} strokeWidth={2} className="opacity-40" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Giảm giá</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đơn hàng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày tạo</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-sm font-medium text-gray-600">Không tìm thấy người dùng</p>
                  <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa tìm kiếm</p>
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isDeletable = u.id !== currentUserId && u.role !== "ADMIN";
              const isSelected = selected.has(u.id);
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-violet-50/40" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    {isDeletable ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(u.id)}
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                    ) : (
                      <span className="w-4 h-4 block" />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7] text-xs font-bold flex-shrink-0">
                        {(u.fullName || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-35">{u.fullName || "—"}</p>
                          <span className="text-[9px] font-mono font-semibold text-violet-500 bg-violet-50 px-1 py-0.5 rounded shrink-0">#{u.uidPrefix}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[160px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <InlineRoleCell userId={u.id} role={u.role as never} isSelf={u.id === currentUserId} />
                  </td>
                  <td className="px-4 py-3.5">
                    <InlineUserStatusCell userId={u.id} status={u.status as never} isSelf={u.id === currentUserId} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm font-bold ${Number(u.balance) > 0 ? "text-[#10B981]" : "text-gray-400"}`}>
                      {formatVnd(Number(u.balance))}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm font-bold ${u.totalDeposited > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                      {formatVnd(u.totalDeposited)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {(() => {
                      const d = getDiscountDisplay(u.totalDeposited, u.discountPercent);
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.isOverride            ? "bg-amber-100 text-amber-700" :
                          d.pct === 0             ? "bg-gray-100 text-gray-500"   :
                                                    "bg-emerald-100 text-emerald-700"
                        }`}>
                          {d.pct}% {d.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-[#A855F7]">
                    {u._count.orders.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      prefetch={false}
                      href={`/admin/users/${u.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 transition-colors"
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
  );
}
