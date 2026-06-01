import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CreateUserModal from "./_components/CreateUserModal";
import InlineRoleCell from "./_components/InlineRoleCell";
import InlineUserStatusCell from "./_components/InlineUserStatusCell";

export const metadata: Metadata = { title: "Quản lý người dùng" };

const PAGE_SIZE = 20;

const ROLE_BADGES: Record<string, string> = {
  USER:   "bg-gray-100 text-gray-600",
  SELLER: "bg-[#10B981]/10 text-[#10B981]",
  STAFF:  "bg-[#F59E0B]/10 text-[#F59E0B]",
  ADMIN:  "bg-[#EF4444]/10 text-[#EF4444]",
};
const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng", SELLER: "Nhà bán", STAFF: "Nhân viên", ADMIN: "Admin",
};
const STATUS_BADGES: Record<string, string> = {
  ACTIVE:   "bg-[#10B981]/10 text-[#10B981]",
  BANNED:   "bg-[#EF4444]/10 text-[#EF4444]",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; role?: string }>;
}) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const { page, q, role } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    deletedAt: null,
    ...(q ? { OR: [
      { email: { contains: q, mode: "insensitive" as const } },
      { fullName: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
    ...(role ? { role: role as never } : {}),
  };

  const [users, total, allTotal, newToday, sellerCount, staffAdminCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, balance: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
    prisma.user.count({ where: { deletedAt: null, role: "SELLER" } }),
    prisma.user.count({ where: { deletedAt: null, role: { in: ["STAFF", "ADMIN"] as never[] } } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">Toàn bộ tài khoản đã đăng ký trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-600">
            {allTotal.toLocaleString("vi-VN")} thành viên
          </span>
          <CreateUserModal />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng người dùng</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Mới hôm nay</p>
          <p className="text-3xl font-bold text-[#10B981]">{newToday.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đăng ký mới</p>
        </div>
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-5">
          <p className="text-xs font-medium text-[#A855F7] uppercase tracking-wide mb-2">Nhà bán hàng</p>
          <p className="text-3xl font-bold text-[#A855F7]">{sellerCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Role SELLER</p>
        </div>
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide mb-2">Staff / Admin</p>
          <p className="text-3xl font-bold text-[#F59E0B]">{staffAdminCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Quản trị hệ thống</p>
        </div>
      </div>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex gap-2 flex-1">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Tìm theo email hoặc tên..."
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
          />
          {role && <input type="hidden" name="role" value={role} />}
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
            Tìm
          </button>
          {(q || role) && (
            <Link href="/admin/users" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
              Xóa
            </Link>
          )}
        </form>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "", label: "Tất cả" },
            { key: "USER", label: "Người dùng" },
            { key: "SELLER", label: "Nhà bán" },
            { key: "STAFF", label: "Nhân viên" },
            { key: "ADMIN", label: "Admin" },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={key ? `/admin/users?role=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                role === key || (!role && !key)
                  ? "bg-[#7C3AED] text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {total.toLocaleString("vi-VN")} người dùng
            {role ? ` · ${ROLE_LABELS[role] ?? role}` : ""}
            {q ? ` · "${q}"` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
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
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-4xl mb-3">👤</p>
                    <p className="text-sm font-medium text-gray-600">Không tìm thấy người dùng</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa tìm kiếm</p>
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
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
                    <InlineRoleCell userId={u.id} role={u.role} isSelf={u.id === me?.id} />
                  </td>
                  <td className="px-4 py-3.5">
                    <InlineUserStatusCell userId={u.id} status={u.status} isSelf={u.id === me?.id} />
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/users"
          searchParams={{ ...(q ? { q } : {}), ...(role ? { role } : {}) }}
        />
      )}
    </div>
  );
}
