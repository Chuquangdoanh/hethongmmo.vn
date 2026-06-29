import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CreateUserModal from "./_components/CreateUserModal";
import UsersTableClient from "./_components/UsersTableClient";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Quản lý người dùng" };

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng", SELLER: "Nhà bán", STAFF: "Nhân viên", ADMIN: "Admin",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; role?: string; depositMin?: string; depositMax?: string; sort?: string }>;
}) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser;

  const { page, q, role, depositMin, depositMax, sort } = await searchParams;
  const currentPage  = Math.max(1, parseInt(page ?? "1", 10));
  const depositMinNum = depositMin ? parseInt(depositMin, 10) : undefined;
  const depositMaxNum = depositMax ? parseInt(depositMax, 10) : undefined;
  const sortByDeposit = sort === "deposit";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q ?? "");
  // Strip # prefix khi admin gõ dạng "#a1b2c3d4"
  const uidQuery = q ? q.replace(/^#/, "").replace(/-/g, "") : "";

  const where = {
    deletedAt: null,
    ...(q ? { OR: [
      ...(isFullUuid ? [{ id: q }] : []),
      { uidPrefix: { contains: uidQuery, mode: "insensitive" as const } },
      { email:     { contains: q, mode: "insensitive" as const } },
      { fullName:  { contains: q, mode: "insensitive" as const } },
    ]} : {}),
    ...(role ? { role: role as never } : {}),
    ...(depositMinNum !== undefined || depositMaxNum !== undefined ? {
      totalDeposited: {
        ...(depositMinNum !== undefined ? { gte: depositMinNum } : {}),
        ...(depositMaxNum !== undefined ? { lte: depositMaxNum } : {}),
      },
    } : {}),
  };

  const [users, total, allTotal, newToday, sellerCount, staffAdminCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: sortByDeposit || depositMinNum !== undefined || depositMaxNum !== undefined
        ? { totalDeposited: "desc" }
        : { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, uidPrefix: true, email: true, fullName: true, role: true,
        status: true, balance: true,
        totalDeposited: true, discountPercent: true,
        createdAt: true,
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
      <AdminFilterBar
        basePath="/admin/users"
        search={{ placeholder: "Tìm theo email, tên, mã user (#a1b2c3d4)..." }}
        selects={[
          {
            paramKey: "role",
            label: "Vai trò",
            placeholder: "Tất cả vai trò",
            options: [
              { value: "USER", label: "Người dùng" },
              { value: "SELLER", label: "Nhà bán" },
              { value: "STAFF", label: "Nhân viên" },
              { value: "ADMIN", label: "Admin" },
            ],
          },
        ]}
      />

      {/* Table — serialize Decimal → number before passing to Client Component */}
      <UsersTableClient
        users={users.map((u) => ({
          ...u,
          uidPrefix: u.uidPrefix,
          balance: Number(u.balance),
          totalDeposited: Number(u.totalDeposited),
        }))}
        currentUserId={me?.id ?? ""}
        total={total}
        role={role}
        q={q}
        sort={sort}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/users"
          searchParams={{
            ...(q ? { q } : {}),
            ...(role ? { role } : {}),
            ...(depositMin ? { depositMin } : {}),
            ...(depositMax ? { depositMax } : {}),
            ...(sort ? { sort } : {}),
          }}
        />
      )}
    </div>
  );
}
