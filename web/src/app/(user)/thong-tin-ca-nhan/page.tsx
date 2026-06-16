import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import {
  Mail, Phone, User, ShieldCheck, Store, CheckCircle,
  Clock, XCircle, Plus, Wallet, ExternalLink, Send,
} from "lucide-react";
import CopyButton from "@/components/shared/CopyButton";
import UserProfileHero from "@/components/shared/UserProfileHero";
import ProfileForm from "./ProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";
import SellerRegisterModal from "./_components/SellerRegisterModal";

export const metadata: Metadata = { title: "Hồ sơ cá nhân" };

const ROLE_LABELS: Record<string, string> = {
  USER:   "Thành viên",
  SELLER: "Nhà bán hàng",
  STAFF:  "Nhân viên",
  ADMIN:  "Quản trị viên",
};

export default async function ThongTinCaNhanPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  type SocialRow = { facebook_url: string | null; telegram_username: string | null };

  const [user, lastDeposit, socialRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true, email: true, fullName: true, phone: true, role: true,
        balance: true, totalDeposited: true, totalSpent: true,
        twoFactorEnabled: true, emailVerifiedAt: true,
        sellerStatus: true, sellerCategory: true, maxSellerProducts: true,
        uidPrefix: true, avatarUrl: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId: me.id, type: { in: ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.$queryRaw<SocialRow[]>`SELECT facebook_url, telegram_username FROM users WHERE id = ${me.id}`,
  ]);

  if (!user) return null;

  const facebookUrl      = socialRows[0]?.facebook_url ?? null;
  const telegramUsername = socialRows[0]?.telegram_username ?? null;

  const balance        = Number(user.balance);
  const totalDeposited = Number(user.totalDeposited);
  const totalSpent     = Number(user.totalSpent);
  const roleLabel      = ROLE_LABELS[user.role] ?? "Thành viên";
  const initials       = (user.fullName || user.email).slice(0, 2).toUpperCase();
  // Luôn derive từ UUID để tránh phụ thuộc vào cột uid_prefix (có thể rỗng với user cũ)
  const depositId      = user.id.replace(/-/g, "").slice(0, 8);

  const CONTACT_ROWS = [
    { Icon: Mail,         value: user.email,                    color: "text-blue-500" },
    { Icon: Phone,        value: user.phone ?? "Chưa cập nhật", color: "text-emerald-500" },
    { Icon: User,         value: roleLabel,                     color: "text-violet-500" },
    ...(facebookUrl      ? [{ Icon: ExternalLink, value: facebookUrl,      color: "text-blue-400" }] : []),
    ...(telegramUsername ? [{ Icon: Send,         value: telegramUsername, color: "text-sky-500"  }] : []),
  ];

  return (
    <>
      <UserProfileHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        uidPrefix={depositId}
        balance={balance}
        totalDeposited={totalDeposited}
        totalSpent={totalSpent}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="profile"
        avatarUrl={user.avatarUrl ?? null}
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Profile sidebar ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-5">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r2Url(user.avatarUrl)}
                    alt={user.fullName}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-md mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3">
                    {initials}
                  </div>
                )}
                <h2 className="text-base font-semibold text-gray-900">{user.fullName}</h2>
                {user.emailVerifiedAt && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                    <CheckCircle size={11} /> Đã xác minh
                  </p>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-2.5 mb-5">
                {CONTACT_ROWS.map(({ Icon, value, color }, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={13} />
                    </div>
                    <span className="text-xs text-gray-600 truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Balance box */}
              <div className="bg-blue-600 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet size={13} className="text-blue-200" />
                  <p className="text-[11px] text-blue-200">Số dư tài khoản</p>
                </div>
                <p className="text-2xl font-bold text-white">{formatVnd(balance)}</p>
                <Link
                  href="/nap-tien"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-white text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Plus size={13} /> Nạp tiền ngay
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right: Info cards ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Thông tin cá nhân (display) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
                Thông tin cá nhân
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Họ và tên</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                    {user.fullName}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">id </p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 font-mono flex items-center justify-between gap-2">
                    <span className="font-semibold tracking-wider">{depositId.toUpperCase()}</span>
                    <CopyButton text={depositId.toUpperCase()} className="shrink-0 px-1.5! py-0.5! text-[10px]!" />
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Địa chỉ email</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                    {user.email}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Số điện thoại</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                    {user.phone ?? "—"}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Tài khoản</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-blue-600 font-medium">
                    {roleLabel}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Facebook</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 truncate">
                    {facebookUrl ?? <span className="text-gray-400">—</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Telegram</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                    {telegramUsername ?? <span className="text-gray-400">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Bảo mật */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-emerald-600" />
                </div>
                Bảo mật tài khoản
              </h3>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <ShieldCheck size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Tài khoản được bảo vệ</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      Đăng nhập bằng Email &amp; Mật khẩu
                      {user.twoFactorEnabled
                        ? " · Bảo mật 2 lớp đang bật."
                        : " · Bảo mật 2 lớp khuyến nghị."}
                    </p>
                  </div>
                </div>
                <CheckCircle size={20} className="text-emerald-500 shrink-0" />
              </div>
            </div>

            {/* Đăng ký bán hàng */}
            <div id="seller-register" className="scroll-mt-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Store size={14} className="text-violet-600" />
                </div>
                Đăng ký bán hàng
              </h3>
              {user.sellerStatus === "APPROVED" ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Đã được phê duyệt</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Danh mục: {user.sellerCategory ?? "—"} · Tối đa {user.maxSellerProducts} sản phẩm
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/ban-hang"
                    className="shrink-0 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Quản lý bán hàng
                  </Link>
                </div>
              ) : user.sellerStatus === "PENDING" ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Đang chờ duyệt</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Đơn đăng ký đang được xem xét, vui lòng chờ.</p>
                  </div>
                </div>
              ) : user.sellerStatus === "REJECTED" ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <XCircle size={18} className="text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Đơn bị từ chối</p>
                      <p className="text-[11px] text-red-500 mt-0.5">Bạn có thể đăng ký lại bên dưới.</p>
                    </div>
                  </div>
                  <SellerRegisterModal
                    fullName={user.fullName}
                    phone={user.phone ?? null}
                    email={user.email}
                    balance={balance}
                    isReRegister
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Chưa đăng ký bán hàng</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Đăng ký để bắt đầu kinh doanh trên nền tảng.</p>
                  </div>
                  <SellerRegisterModal
                    fullName={user.fullName}
                    phone={user.phone ?? null}
                    email={user.email}
                    balance={balance}
                  />
                </div>
              )}
            </div>

            {/* Edit forms */}
            <ProfileForm
              id={user.id}
              email={user.email}
              fullName={user.fullName}
              phone={user.phone ?? ""}
              facebookUrl={facebookUrl ?? ""}
              telegramUsername={telegramUsername ?? ""}
              avatarUrl={user.avatarUrl ?? null}
            />
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </>
  );
}
