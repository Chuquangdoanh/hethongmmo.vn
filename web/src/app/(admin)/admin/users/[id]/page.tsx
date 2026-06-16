import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { formatVnd, formatDate } from "@/lib/utils/format";
import AdminUserActions from "./AdminUserActions";

export const metadata: Metadata = { title: "Chi tiết người dùng" };

const ROLE_BADGE: Record<string, string> = {
  USER:   "bg-gray-100 text-gray-600",
  SELLER: "bg-emerald-50 text-emerald-700",
  STAFF:  "bg-amber-50 text-amber-700",
  ADMIN:  "bg-red-50 text-red-600",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:               "bg-emerald-50 text-emerald-700",
  BANNED:               "bg-red-50 text-red-600",
  PENDING_VERIFICATION: "bg-amber-50 text-amber-700",
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  PENDING:    "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  DONE:       "bg-emerald-50 text-emerald-700",
  CANCELLED:  "bg-gray-100 text-gray-500",
  REFUNDED:   "bg-purple-50 text-purple-700",
  DISPUTED:   "bg-red-50 text-red-600",
};

const SELLER_STATUS_BADGE: Record<string, string> = {
  NONE:     "bg-gray-100 text-gray-500",
  PENDING:  "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
};

const TX_TYPE_LABEL: Record<string, string> = {
  DEPOSIT_AUTO:       "Nạp tự động",
  DEPOSIT_MANUAL:     "Nạp thủ công",
  BUY_SERVICE:        "Mua dịch vụ",
  BUY_COURSE:         "Mua khóa học",
  BUY_TUTTRICK:       "Mua Tut/Trick",
  BUY_MMO_PRODUCT:    "Mua MMO",
  BUY_SELLER_PRODUCT: "Mua SP Seller",
  REFUND:             "Hoàn tiền",
  SELLER_REGISTRATION:"Đăng ký Seller",
  SELLER_PAYOUT:      "Nhận tiền Seller",
  WITHDRAWAL_FEE:     "Phí rút tiền",
  ADMIN_ADJUSTMENT:   "Điều chỉnh Admin",
};

function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>{text}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 w-36">{label}</span>
      <span className="text-xs text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id ?? "";

  type SocialRow = { facebook_url: string | null; telegram_username: string | null };

  const [user, socialRows] = await Promise.all([
    prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      balance: true,
      totalDeposited: true,
      totalSpent: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      lastLoginAt: true,
      lastLoginIp: true,
      failedLoginCount: true,
      lockedUntil: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      sellerStatus: true,
      sellerCategory: true,
      maxSellerProducts: true,
      uidPrefix: true,
      discountPercent: true,
      cccdImageUrl: true,
      portraitImageUrl: true,
      sellerRequest: {
        select: {
          category: true,
          fee: true,
          status: true,
          approvedCategory: true,
          rejectReason: true,
          createdAt: true,
          approvedAt: true,
          rejectedAt: true,
        },
      },
    },
  }),
    prisma.$queryRaw<SocialRow[]>`SELECT facebook_url, telegram_username FROM users WHERE id = ${id}`,
  ]);

  if (!user) notFound();

  const facebookUrl      = socialRows[0]?.facebook_url ?? null;
  const telegramUsername = socialRows[0]?.telegram_username ?? null;

  const [recentOrders, recentTransactions, recentLoginAttempts, orderCount, txCount] =
    await Promise.all([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, orderCode: true, itemName: true, finalPrice: true,
          status: true, orderType: true, createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, type: true, amount: true, description: true,
          balanceBefore: true, balanceAfter: true, createdAt: true,
        },
      }),
      prisma.loginAttempt.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, ipAddress: true, userAgent: true,
          success: true, failReason: true, createdAt: true,
        },
      }),
      prisma.order.count({ where: { userId: id } }),
      prisma.transaction.count({ where: { userId: id } }),
    ]);

  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link href="/admin/users" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
        ← Quản lý người dùng
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái — Hồ sơ & thông tin */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Header */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-lg font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{user.fullName || "—"}</h1>
                  <Badge text={user.role} className={ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-600"} />
                  <Badge text={user.status} className={STATUS_BADGE[user.status] ?? "bg-gray-100 text-gray-600"} />
                  {user.deletedAt && <Badge text="Đã xóa" className="bg-red-50 text-red-600" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>{orderCount} đơn hàng</span>
              <span>{txCount} giao dịch</span>
              <span>Tham gia {formatDate(user.createdAt)}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AdminUserActions
                userId={user.id}
                currentRole={user.role}
                currentStatus={user.status}
                balance={Number(user.balance)}
                discountPercent={user.discountPercent}
                isSelf={user.id === meId}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Số dư hiện tại", value: formatVnd(Number(user.balance)), color: "text-gray-900" },
              { label: "Tổng nạp", value: formatVnd(Number(user.totalDeposited)), color: "text-emerald-600" },
              { label: "Tổng chi", value: formatVnd(Number(user.totalSpent)), color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Thông tin cá nhân */}
          <SectionCard title="Thông tin cá nhân">
            <InfoRow label="ID" value={<span className="font-mono text-[11px]">{user.id}</span>} />
            <InfoRow label="UID Prefix" value={<span className="font-mono">{user.uidPrefix}</span>} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Họ tên" value={user.fullName || "—"} />
            <InfoRow label="Số điện thoại" value={user.phone ?? "—"} />
            <InfoRow label="Facebook"  value={facebookUrl ?? "—"} />
            <InfoRow label="Telegram"  value={telegramUsername ?? "—"} />
            <InfoRow label="Ngày tạo" value={formatDate(user.createdAt)} />
            <InfoRow label="Cập nhật lần cuối" value={formatDate(user.updatedAt)} />
            {user.deletedAt && (
              <InfoRow label="Ngày xóa" value={<span className="text-red-600">{formatDate(user.deletedAt)}</span>} />
            )}
          </SectionCard>

          {/* Bảo mật & Đăng nhập */}
          <SectionCard title="Bảo mật & Đăng nhập">
            <InfoRow
              label="Xác minh email"
              value={
                user.emailVerifiedAt
                  ? <span className="text-emerald-600">{formatDate(user.emailVerifiedAt)}</span>
                  : <span className="text-amber-600">Chưa xác minh</span>
              }
            />
            <InfoRow
              label="Xác thực 2 lớp"
              value={
                user.twoFactorEnabled
                  ? <Badge text="Đã bật" className="bg-emerald-50 text-emerald-700" />
                  : <Badge text="Chưa bật" className="bg-gray-100 text-gray-500" />
              }
            />
            <InfoRow label="Đăng nhập cuối" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"} />
            <InfoRow label="IP đăng nhập cuối" value={user.lastLoginIp ?? "—"} />
            <InfoRow
              label="Đăng nhập sai"
              value={
                user.failedLoginCount > 0
                  ? <span className="text-red-600">{user.failedLoginCount} lần</span>
                  : <span>0 lần</span>
              }
            />
            <InfoRow
              label="Tài khoản khóa đến"
              value={
                user.lockedUntil
                  ? <span className="text-red-600">{formatDate(user.lockedUntil)}</span>
                  : <span className="text-gray-400">Không bị khóa</span>
              }
            />
          </SectionCard>

          {/* Seller info */}
          {user.sellerStatus !== "NONE" && (
            <SectionCard title="Thông tin Seller">
              <InfoRow
                label="Trạng thái Seller"
                value={<Badge text={user.sellerStatus} className={SELLER_STATUS_BADGE[user.sellerStatus] ?? "bg-gray-100 text-gray-500"} />}
              />
              <InfoRow label="Danh mục" value={user.sellerCategory ?? "—"} />
              <InfoRow label="Giới hạn sản phẩm" value={`${user.maxSellerProducts} sản phẩm`} />
              {user.sellerRequest && (
                <>
                  <InfoRow label="Danh mục đăng ký" value={user.sellerRequest.category} />
                  <InfoRow label="Phí đã nộp" value={formatVnd(Number(user.sellerRequest.fee))} />
                  <InfoRow label="Ngày đăng ký" value={formatDate(user.sellerRequest.createdAt)} />
                  {user.sellerRequest.approvedAt && (
                    <InfoRow label="Ngày duyệt" value={<span className="text-emerald-600">{formatDate(user.sellerRequest.approvedAt)}</span>} />
                  )}
                  {user.sellerRequest.rejectedAt && (
                    <InfoRow label="Ngày từ chối" value={<span className="text-red-600">{formatDate(user.sellerRequest.rejectedAt)}</span>} />
                  )}
                  {user.sellerRequest.rejectReason && (
                    <InfoRow label="Lý do từ chối" value={<span className="text-red-600">{user.sellerRequest.rejectReason}</span>} />
                  )}
                </>
              )}
              {(user.cccdImageUrl || user.portraitImageUrl) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
                  {user.cccdImageUrl && (
                    <a href={user.cccdImageUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-600 hover:underline">
                      Xem ảnh CCCD →
                    </a>
                  )}
                  {user.portraitImageUrl && (
                    <a href={user.portraitImageUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-600 hover:underline">
                      Xem ảnh chân dung →
                    </a>
                  )}
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* Cột phải — Hoạt động */}
        <div className="lg:col-span-2 space-y-6">

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Giao dịch gần đây</h2>
            <span className="text-xs text-gray-400">{txCount} tổng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Loại</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Mô tả</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Số tiền</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Số dư sau</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, i) => {
                  const isPositive = Number(tx.amount) > 0;
                  return (
                    <tr key={tx.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}>
                      <td className="px-5 py-2.5">
                        <span className="text-[11px] text-gray-600">
                          {TX_TYPE_LABEL[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 max-w-[200px]">
                        <span className="text-xs text-gray-500 truncate block">{tx.description}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}{formatVnd(Number(tx.amount))}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className="text-xs text-gray-500">{formatVnd(Number(tx.balanceAfter))}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className="text-[11px] text-gray-400">{formatDate(tx.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Đơn hàng gần đây</h2>
            <span className="text-xs text-gray-400">{orderCount} tổng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Mã đơn</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Sản phẩm</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Loại</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Trạng thái</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Giá</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={order.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] font-mono text-gray-500">#{order.orderCode}</span>
                    </td>
                    <td className="px-5 py-2.5 max-w-[200px]">
                      <span className="text-xs text-gray-900 truncate block">{order.itemName}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] text-gray-500">{order.orderType}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge
                        text={order.status}
                        className={ORDER_STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-500"}
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-xs font-medium text-violet-600">{formatVnd(Number(order.finalPrice))}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Login attempts */}
      {recentLoginAttempts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Lịch sử đăng nhập gần đây</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Kết quả</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">IP</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Lý do thất bại</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium text-gray-400">Thiết bị</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium text-gray-400">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {recentLoginAttempts.map((attempt, i) => (
                  <tr key={attempt.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}>
                    <td className="px-5 py-2.5">
                      <Badge
                        text={attempt.success ? "Thành công" : "Thất bại"}
                        className={attempt.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] font-mono text-gray-600">{attempt.ipAddress}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] text-gray-400">{attempt.failReason ?? "—"}</span>
                    </td>
                    <td className="px-5 py-2.5 max-w-[180px]">
                      <span className="text-[11px] text-gray-400 truncate block">{attempt.userAgent ?? "—"}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-[11px] text-gray-400">{formatDate(attempt.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
