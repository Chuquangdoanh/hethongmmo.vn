import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

const PAGE_SIZE = 30;

const ACTION_VI: Record<string, string> = {
  // Quản lý tài khoản người dùng
  ADMIN_BAN_USER:           "Khóa tài khoản người dùng",
  ADMIN_UNBAN_USER:         "Mở khóa tài khoản người dùng",
  ADMIN_CHANGE_ROLE:        "Thay đổi vai trò người dùng",
  ADMIN_ADJUST_BALANCE:     "Điều chỉnh số dư tài khoản",
  ADMIN_REVOKE_SELLER:      "Thu hồi quyền bán hàng",
  ADMIN_SET_DISCOUNT:       "Cài đặt chiết khấu người dùng",
  ADMIN_CREATE_USER:        "Tạo tài khoản mới",
  ADMIN_UPDATE_ORDER_STATUS:"Cập nhật trạng thái đơn hàng (admin)",
  ADMIN_HARD_DELETE_USER:   "Xóa vĩnh viễn tài khoản",
  // Xác thực & bảo mật
  USER_REGISTERED:          "Đăng ký tài khoản",
  PASSWORD_RESET:           "Đặt lại mật khẩu",
  "2FA_ENABLED":            "Bật xác thực 2 lớp",
  "2FA_DISABLED":           "Tắt xác thực 2 lớp",
  // Nhà bán hàng
  SELLER_REQUEST_APPROVED:  "Duyệt đăng ký nhà bán hàng",
  SELLER_REQUEST_REJECTED:  "Từ chối đăng ký nhà bán hàng",
  SELLER_SHOP_LOCKED:       "Khóa cửa hàng nhà bán hàng",
  SELLER_SHOP_UNLOCKED:     "Mở khóa cửa hàng nhà bán hàng",
  SELLER_PRODUCT_UPDATE:    "Cập nhật sản phẩm nhà bán hàng",
  SELLER_PRODUCT_DELETE:    "Xóa sản phẩm nhà bán hàng",
  UPDATE_SELLER_SETTINGS:   "Cập nhật cài đặt nhà bán hàng",
  UPDATE_SELLER_TIER_CONFIG:"Cập nhật cấu hình hạng bán hàng",
  CREATE_SELLER_TIER:       "Tạo hạng nhà bán hàng",
  UPDATE_SELLER_TIER:       "Cập nhật hạng nhà bán hàng",
  DELETE_SELLER_TIER:       "Xóa hạng nhà bán hàng",
  PRODUCT_RESTRICTED:       "Hạn chế sản phẩm nhà bán hàng",
  PRODUCT_UNRESTRICTED:     "Bỏ hạn chế sản phẩm nhà bán hàng",
  // Khóa học
  COURSE_CATEGORY_CREATE:   "Tạo danh mục khóa học",
  COURSE_CATEGORY_UPDATE:   "Cập nhật danh mục khóa học",
  COURSE_CATEGORY_DELETE:   "Xóa danh mục khóa học",
  COURSE_BULK_DELETE:       "Xóa hàng loạt khóa học",
  COURSE_BULK_HIDE:         "Ẩn hàng loạt khóa học",
  COURSE_BULK_SHOW:         "Hiện hàng loạt khóa học",
  COURSE_CREATE:            "Tạo khóa học",
  COURSE_UPDATE:            "Cập nhật khóa học",
  COURSE_DELETE:            "Xóa khóa học",
  // Dịch vụ
  CREATE_SERVICE_CATEGORY:  "Tạo danh mục dịch vụ",
  UPDATE_SERVICE_CATEGORY:  "Cập nhật danh mục dịch vụ",
  DELETE_SERVICE_CATEGORY:  "Xóa danh mục dịch vụ",
  SERVICE_CATEGORY_CREATE:  "Tạo danh mục dịch vụ",
  SERVICE_CATEGORY_UPDATE:  "Cập nhật danh mục dịch vụ",
  SERVICE_CATEGORY_DELETE:  "Xóa danh mục dịch vụ",
  SERVICE_BULK_DELETE:      "Xóa hàng loạt dịch vụ",
  SERVICE_BULK_HIDE:        "Ẩn hàng loạt dịch vụ",
  SERVICE_BULK_SHOW:        "Hiện hàng loạt dịch vụ",
  SERVICE_CREATE:           "Tạo dịch vụ",
  SERVICE_UPDATE:           "Cập nhật dịch vụ",
  SERVICE_DELETE:           "Xóa dịch vụ",
  // Tut-Trick
  CREATE_TUT_TRICK_CATEGORY:"Tạo danh mục Tut-Trick",
  UPDATE_TUT_TRICK_CATEGORY:"Cập nhật danh mục Tut-Trick",
  DELETE_TUT_TRICK_CATEGORY:"Xóa danh mục Tut-Trick",
  TUT_TRICK_CATEGORY_CREATE:"Tạo danh mục Tut-Trick",
  TUT_TRICK_CATEGORY_UPDATE:"Cập nhật danh mục Tut-Trick",
  TUT_TRICK_CATEGORY_DELETE:"Xóa danh mục Tut-Trick",
  TUT_TRICK_BULK_DELETE:    "Xóa hàng loạt Tut-Trick",
  TUT_TRICK_BULK_HIDE:      "Ẩn hàng loạt Tut-Trick",
  TUT_TRICK_BULK_SHOW:      "Hiện hàng loạt Tut-Trick",
  TUT_TRICK_CREATE:         "Tạo Tut-Trick",
  TUT_TRICK_UPDATE:         "Cập nhật Tut-Trick",
  TUT_TRICK_DELETE:         "Xóa Tut-Trick",
  // Sản phẩm MMO
  MMO_PRODUCT_CREATE:       "Tạo sản phẩm MMO",
  MMO_PRODUCT_UPDATE:       "Cập nhật sản phẩm MMO",
  MMO_PRODUCT_DELETE:       "Xóa sản phẩm MMO",
  MMO_STOCK_ADD:            "Thêm kho sản phẩm MMO",
  MMO_STOCK_DELETE:         "Xóa kho sản phẩm MMO",
  // Tài nguyên
  CREATE_RESOURCE_CATEGORY: "Tạo danh mục tài nguyên",
  UPDATE_RESOURCE_CATEGORY: "Cập nhật danh mục tài nguyên",
  DELETE_RESOURCE_CATEGORY: "Xóa danh mục tài nguyên",
  // Đơn hàng & khiếu nại
  ORDER_STATUS_UPDATE:      "Cập nhật trạng thái đơn hàng",
  CREATE_CHAT_ROOM:         "Tạo phòng chat khiếu nại",
  CONFIRM_ORDER_COMPLAINT:  "Xác nhận đơn hàng khiếu nại",
  RESOLVE_COMPLAINT_FREEZE: "Giải quyết khiếu nại đóng băng",
  // Đánh giá
  UPDATE_REVIEW:            "Cập nhật đánh giá",
  DELETE_REVIEW:            "Xóa đánh giá",
  // Cấu hình hệ thống
  UPDATE_PAGE_PERMISSIONS:     "Cập nhật phân quyền trang",
  UPDATE_PUBLIC_PAGE_CONFIGS:  "Cập nhật cấu hình trang công khai",
  // Rút tiền
  WITHDRAWAL_APPROVED:      "Duyệt yêu cầu rút tiền",
  WITHDRAWAL_REJECTED:      "Từ chối yêu cầu rút tiền",
  WITHDRAWAL_COMPLETED:     "Hoàn tất rút tiền",
};

const TARGET_TYPE_VI: Record<string, string> = {
  User:            "Người dùng",
  Course:          "Khóa học",
  CourseCategory:  "Danh mục KH",
  Service:         "Dịch vụ",
  ServiceCategory: "Danh mục DV",
  TutTrick:        "Tut-Trick",
  TutTrickCategory:"Danh mục TT",
  MmoProduct:      "Sản phẩm MMO",
  SellerProduct:   "SP nhà bán",
  ResourceCategory:"Danh mục TN",
  Order:           "Đơn hàng",
  Complaint:       "Khiếu nại",
  Review:          "Đánh giá",
  Withdrawal:      "Rút tiền",
  SellerTier:      "Hạng bán hàng",
  PagePermission:  "Phân quyền",
};

const ROLE_VI: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Quản trị viên", className: "bg-red-100 text-red-700" },
  STAFF: { label: "Nhân viên", className: "bg-blue-100 text-blue-700" },
};

function describeAction(action: string): string {
  return ACTION_VI[action] ?? action.replace(/_/g, " ").toLowerCase();
}

function describeTarget(targetType: string | null, targetId: string | null): string {
  if (!targetType) return "—";
  const label = TARGET_TYPE_VI[targetType] ?? targetType;
  return targetId ? `${label} #${targetId.slice(0, 8)}` : label;
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { page, action } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const roleFilter = {
    OR: [
      { actor: { role: { in: ["ADMIN" as const, "STAFF" as const] } } },
      { actorId: null },
    ],
  };

  const where = action
    ? { AND: [roleFilter, { action: { contains: action, mode: "insensitive" as const } }] }
    : roleFilter;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { email: true, fullName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động</h1>
          <p className="text-xs text-gray-400 mt-0.5">Chỉ lưu 7 ngày gần nhất · Tự động xóa bản ghi cũ</p>
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} bản ghi</span>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Thời gian</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người thực hiện</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mô tả</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Đối tượng</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  Chưa có nhật ký nào
                </td>
              </tr>
            )}
            {logs.map((log, i) => {
              const roleInfo = log.actor?.role ? ROLE_VI[log.actor.role] : undefined;
              return (
                <tr key={log.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50`}>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div>{log.actor?.fullName ?? "Hệ thống"}</div>
                    {log.actor?.email && (
                      <div className="text-gray-400">{log.actor.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {roleInfo ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${roleInfo.className}`}>
                        {roleInfo.label}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                        Hệ thống
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{describeAction(log.action)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {describeTarget(log.targetType ?? null, log.targetId ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/audit-log" />
      )}
    </div>
  );
}
