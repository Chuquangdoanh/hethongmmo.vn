import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CreateUserModal from "./_components/CreateUserModal";
import UsersTableClient from "./_components/UsersTableClient";

export const metadata: Metadata = { title: "Quản lý người dùng" };

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng", SELLER: "Nhà bán", STAFF: "Nhân viên", ADMIN: "Admin",
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
      <UsersTableClient
        users={users}
        currentUserId={me?.id ?? ""}
        total={total}
        role={role}
        q={q}
      />

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
