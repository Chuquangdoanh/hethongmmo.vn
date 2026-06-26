import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import {
  CheckCircle, Clock, XCircle, Store, Package, ChevronRight,
  AlertCircle, Boxes, Tag, CalendarDays, ShoppingBag, ArrowRight,
  Phone, Globe, Send,
} from "lucide-react";
import SellerRegisterModal from "../thong-tin-ca-nhan/_components/SellerRegisterModal";

export const metadata: Metadata = { title: "Đăng ký bán hàng" };

const STORE_TYPE_LABELS: Record<string, string> = {
  TAI_NGUYEN_MMO: "Tài Nguyên MMO (Nguyên liệu)",
  KHO_TAI_NGUYEN: "Kho Tài Nguyên",
};

const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: React.FC<{ size?: number; className?: string }>;
}> = {
  NONE:     { label: "Chưa đăng ký",  bg: "bg-gray-50",   border: "border-gray-200",  text: "text-gray-700",  icon: Store },
  PENDING:  { label: "Đang chờ duyệt", bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700", icon: Clock },
  APPROVED: { label: "Đã duyệt",       bg: "bg-green-50",  border: "border-green-200", text: "text-green-700", icon: CheckCircle },
  REJECTED: { label: "Bị từ chối",     bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",   icon: XCircle },
  REVOKED:  { label: "Đã bị thu hồi",  bg: "bg-orange-50", border: "border-orange-200",text: "text-orange-700",icon: AlertCircle },
};

export default async function DangKyBanHangPage() {
  const session = await auth();
  const me = requireUser(session);

  const [user, request, subCategoryRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true, email: true, fullName: true, phone: true,
        facebookUrl: true, telegramUsername: true,
        balance: true, sellerStatus: true, sellerCategory: true,
        maxSellerProducts: true,
      },
    }),
    prisma.sellerRequest.findUnique({
      where: { userId: me.id },
      select: {
        id: true, category: true, storeType: true, fee: true,
        status: true, approvedCategory: true, rejectReason: true,
        createdAt: true, approvedAt: true, rejectedAt: true,
      },
    }),
    prisma.userSubCategory.findMany({
      where: { userId: me.id },
      select: { subCategory: { select: { id: true, name: true, categoryName: true } } },
    }),
  ]);

  if (!user) return null;

  const balance        = Number(user.balance);
  const sellerStatus   = user.sellerStatus ?? "NONE";
  const statusCfg      = STATUS_CONFIG[sellerStatus] ?? STATUS_CONFIG["NONE"]!;
  const StatusIcon     = statusCfg.icon;
  const subCats        = subCategoryRows.map((r) => r.subCategory);
  const canReRegister      = sellerStatus === "REJECTED" || sellerStatus === "REVOKED";
  const missingProfileFields = [
    !user.phone            && { key: "phone",    label: "Số điện thoại", Icon: Phone    },
    !user.facebookUrl      && { key: "facebook", label: "Facebook",      Icon: Globe    },
    !user.telegramUsername && { key: "telegram", label: "Telegram",      Icon: Send     },
  ].filter(Boolean) as { key: string; label: string; Icon: typeof Phone }[];
  const hasRequiredProfile = missingProfileFields.length === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
        <ChevronRight size={12} />
        <Link href="/thong-tin-ca-nhan" className="hover:text-blue-600 transition-colors">Hồ sơ</Link>
        <ChevronRight size={12} />
        <span className="text-gray-900 font-semibold">Đăng ký bán hàng</span>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Đăng ký bán hàng</h1>
            <p className="text-white/60 text-xs mt-0.5">Trở thành nhà bán hàng — kinh doanh tài nguyên số trên nền tảng</p>
          </div>
        </div>
        {sellerStatus === "APPROVED" && (
          <Link
            href="/ban-hang"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            <ShoppingBag size={14} /> Vào quản lý bán hàng <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-5 ${statusCfg.bg} ${statusCfg.border}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <StatusIcon size={20} className={statusCfg.text} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-base ${statusCfg.text}`}>{statusCfg.label}</p>
            {sellerStatus === "NONE" && (
              <p className="text-sm text-gray-600 mt-1">Bạn chưa đăng ký bán hàng. Đăng ký ngay để bắt đầu kinh doanh tài nguyên số.</p>
            )}
            {sellerStatus === "PENDING" && (
              <p className="text-sm text-amber-700 mt-1">Đơn đăng ký đang được xem xét. Chúng tôi sẽ thông báo kết quả qua email.</p>
            )}
            {sellerStatus === "APPROVED" && (
              <p className="text-sm text-green-700 mt-1">
                Tài khoản seller đã được kích hoạt. Bạn có thể quản lý sản phẩm và đơn hàng ngay bây giờ.
              </p>
            )}
            {sellerStatus === "REJECTED" && (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-red-700">Đơn đăng ký đã bị từ chối.</p>
                {request?.rejectReason && (
                  <div className="mt-2 bg-red-100/60 rounded-xl border border-red-200 px-3 py-2.5">
                    <p className="text-xs font-semibold text-red-700 mb-1">Lý do từ chối:</p>
                    <p className="text-sm text-red-800">{request.rejectReason}</p>
                  </div>
                )}
              </div>
            )}
            {sellerStatus === "REVOKED" && (
              <p className="text-sm text-orange-700 mt-1">Quyền bán hàng đã bị thu hồi. Liên hệ hỗ trợ để biết thêm chi tiết.</p>
            )}
          </div>
        </div>

        {/* Re-register button */}
        {(sellerStatus === "NONE" || canReRegister) && (
          <div className="mt-4 pt-4 border-t border-current/10">
            {hasRequiredProfile ? (
              <SellerRegisterModal
                fullName={user.fullName}
                phone={user.phone ?? null}
                email={user.email}
                balance={balance}
                isReRegister={canReRegister}
              />
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  ⚠️ Vui lòng điền đầy đủ thông tin cá nhân trước khi đăng ký bán hàng
                </p>
                <p className="text-xs text-amber-700 mb-3">Cần bổ sung các thông tin sau:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {missingProfileFields.map(({ key, label, Icon }) => (
                    <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800">
                      <Icon size={12} strokeWidth={2} />
                      {label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/thong-tin-ca-nhan"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                >
                  Cập nhật hồ sơ <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registration details */}
      {request && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={14} className="text-blue-600" />
            </div>
            Chi tiết đơn đăng ký
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Store type */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Loại cửa hàng</p>
              <div className="flex items-center gap-1.5">
                <Boxes size={14} className="text-violet-500 shrink-0" />
                <p className="text-sm font-semibold text-gray-800">
                  {STORE_TYPE_LABELS[request.storeType] ?? request.storeType}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Danh mục đăng ký</p>
              <div className="flex items-center gap-1.5">
                <Tag size={14} className="text-blue-500 shrink-0" />
                <p className="text-sm font-semibold text-gray-800 truncate">{request.category}</p>
              </div>
            </div>

            {/* Submitted date */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Ngày nộp đơn</p>
              <div className="flex items-center gap-1.5">
                <CalendarDays size={14} className="text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">{formatDate(request.createdAt)}</p>
              </div>
            </div>

            {/* Approved/Rejected date */}
            {request.approvedAt && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Ngày duyệt</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                  <p className="text-sm text-green-700">{formatDate(request.approvedAt)}</p>
                </div>
              </div>
            )}
            {request.rejectedAt && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">Ngày từ chối</p>
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{formatDate(request.rejectedAt)}</p>
                </div>
              </div>
            )}

            {/* Fee */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Phí đăng ký</p>
              <p className="text-sm font-bold text-gray-800">{formatVnd(Number(request.fee))}</p>
            </div>

            {/* Approved category (if different) */}
            {request.approvedCategory && request.approvedCategory !== request.category && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Danh mục được duyệt</p>
                <div className="flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-500 shrink-0" />
                  <p className="text-sm font-semibold text-blue-800">{request.approvedCategory}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sub-categories */}
          {subCats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2.5">Danh mục con đã đăng ký ({subCats.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {subCats.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approved seller stats */}
      {sellerStatus === "APPROVED" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store size={14} className="text-emerald-600" />
            </div>
            Thông tin seller
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {user.sellerCategory && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Danh mục bán</p>
                <p className="text-sm font-semibold text-gray-800">{user.sellerCategory}</p>
              </div>
            )}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Slot sản phẩm</p>
              <p className="text-sm font-bold text-gray-800">{user.maxSellerProducts} sản phẩm</p>
            </div>
          </div>
          <Link
            href="/ban-hang/san-pham"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            <Package size={14} /> Quản lý sản phẩm <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Help note */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Cần hỗ trợ?</span>{" "}
          Liên hệ chúng tôi qua{" "}
          <Link href="/ho-tro" className="font-semibold underline hover:text-blue-900">Ticket hỗ trợ</Link>{" "}
          nếu bạn có thắc mắc về đơn đăng ký bán hàng.
        </p>
      </div>
    </div>
  );
}
