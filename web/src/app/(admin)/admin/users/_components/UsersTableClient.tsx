"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { Trash2 } from "lucide-react";
import InlineRoleCell from "./InlineRoleCell";
import InlineUserStatusCell from "./InlineUserStatusCell";

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng", SELLER: "Nhà bán", STAFF: "Nhân viên", ADMIN: "Admin",
};

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  balance: { toString(): string } | number | string;
  createdAt: Date;
  _count: { orders: number };
};

interface Props {
  users: User[];
  currentUserId: string;
  total: number;
  role?: string;
  q?: string;
}

export default function UsersTableClient({ users, currentUserId, total, role, q }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

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
    if (!window.confirm(`Xóa ${ids.length} tài khoản đã chọn? Hành động này không thể hoàn tác.`)) return;

    startTransition(async () => {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/users/${id}`, { method: "DELETE" }).then((r) => r.json())
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
        <table className="w-full min-w-[740px]">
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Số dư</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Đơn hàng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày tạo</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
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
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{u.fullName || "—"}</p>
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
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-[#A855F7]">
                    {u._count.orders.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
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
