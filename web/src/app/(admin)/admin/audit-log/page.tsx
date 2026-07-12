import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

const PAGE_SIZE = 30;

const ACTION_VI: Record<string, string> = {
  // Quản lý tài khoản người dùng
  ADMIN_BAN_USER:           "Khóa tài khoản người dùng",
  ADMIN_UNBAN_USER:         "Mở khóa tài khoản người dùng",
  ADMIN_CHANGE_ROLE:        "Thay đổi vai trò người dùng",
  ADMIN_ADJUST_BALANCE:     "Điều chỉnh số dư tài khoản",
  ADMIN_DEDUCT_BALANCE:     "Khấu trừ số dư tài khoản",
  ADMIN_REVOKE_SELLER:      "Thu hồi quyền bán hàng",
  ADMIN_SET_DISCOUNT:       "Cài đặt chiết khấu người dùng",
  ADMIN_CREATE_USER:        "Tạo tài khoản mới",
  ADMIN_UPDATE_ORDER_STATUS:"Cập nhật trạng thái đơn hàng (admin)",
  ADMIN_HARD_DELETE_USER:   "Xóa vĩnh viễn tài khoản",
  // Nạp tiền
  DEPOSIT_AUTO:             "Nạp tiền tự động",
  DEPOSIT_MANUAL:           "Nạp tiền thủ công",
  // Rút tiền (đầy đủ)
  WITHDRAWAL_REQUESTED:     "Yêu cầu rút tiền",
  // Xác thực & bảo mật
  USER_REGISTERED:          "Đăng ký tài khoản",
  PASSWORD_RESET:           "Đặt lại mật khẩu",
  "2FA_ENABLED":            "Bật xác thực 2 lớp",
  "2FA_DISABLED":           "Tắt xác thực 2 lớp",
  // Nhà bán hàng
  SELLER_REGISTRATION_REQUESTED: "Yêu cầu đăng ký nhà bán hàng",
  SELLER_SLOT_PURCHASE:     "Mua gói slot nhà bán hàng",
  SELLER_REQUEST_APPROVED:  "Duyệt đăng ký nhà bán hàng",
  SELLER_REQUEST_REJECTED:  "Từ chối đăng ký nhà bán hàng",
  SELLER_SHOP_LOCKED:       "Khóa cửa hàng nhà bán hàng",
  SELLER_SHOP_UNLOCKED:     "Mở khóa cửa hàng nhà bán hàng",
  SELLER_PRODUCT_UPDATE:    "Cập nhật sản phẩm nhà bán hàng",
  SELLER_PRODUCT_DELETE:    "Xóa sản phẩm nhà bán hàng",
  UPDATE_SELLER_SETTINGS:   "Cập nhật cài đặt nhà bán hàng",
  UPDATE_SELLER_TIER_CONFIG:"Cập nhật cấu hình hạng bán hàng",
  UPDATE_AFFILIATE_SETTINGS:"Cập nhật cấu hình affiliate",
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
  UPDATE_STAFF_PERMISSIONS:    "Cập nhật quyền CRUD nhân viên",
  UPDATE_PUBLIC_PAGE_CONFIGS:  "Cập nhật cấu hình trang công khai",
  UPDATE_SITE_CONTENT:         "Cập nhật nội dung trang",
  // Rút tiền
  WITHDRAWAL_APPROVED:      "Duyệt yêu cầu rút tiền",
  WITHDRAWAL_REJECTED:      "Từ chối yêu cầu rút tiền",
  WITHDRAWAL_COMPLETED:     "Hoàn tất rút tiền",
  // Đổi tài khoản ngân hàng
  BANK_CHANGE_REQUEST_APPROVED: "Duyệt đổi tài khoản ngân hàng",
  BANK_CHANGE_REQUEST_REJECTED: "Từ chối đổi tài khoản ngân hàng",
  // Khiếu nại (bổ sung)
  RESOLVE_COMPLAINT_SELLER:    "Giải quyết khiếu nại — nhà bán xác nhận",
  SELLER_CONFIRMED:            "Nhà bán hàng xác nhận đơn",
  RESOLVE_COMPLAINT_USER_DONE: "Giải quyết khiếu nại — người mua hoàn tất",
  DISPUTE_ROUND_2_FINAL:       "Kết thúc tranh chấp vòng 2",
  ADMIN_REJECT_COMPLAINT:      "Từ chối khiếu nại (hoàn tiền người mua)",
  ADMIN_OPEN_ROUND_2:          "Mở vòng 2 khiếu nại",
  AUTO_RESOLVE_COMPLAINT:      "Tự động giải quyết khiếu nại",
  AUTO_REJECT_COMPLAINT:       "Tự động từ chối khiếu nại",
  // Sản phẩm nhà bán hàng (bổ sung)
  SELLER_PRODUCT_IMAGE_CREATE:  "Thêm ảnh sản phẩm nhà bán",
  SELLER_PRODUCT_IMAGE_DELETE:  "Xóa ảnh sản phẩm nhà bán",
  SELLER_PRODUCT_VARIANT_CREATE:"Tạo biến thể sản phẩm nhà bán",
  SELLER_PRODUCT_VARIANT_UPDATE:"Cập nhật biến thể sản phẩm nhà bán",
  SELLER_PRODUCT_VARIANT_DELETE:"Xóa biến thể sản phẩm nhà bán",
  // Sản phẩm MMO (bổ sung)
  MMO_PRODUCT_VARIANT_CREATE:  "Tạo biến thể sản phẩm MMO",
  MMO_PRODUCT_VARIANT_UPDATE:  "Cập nhật biến thể sản phẩm MMO",
  MMO_PRODUCT_VARIANT_DELETE:  "Xóa biến thể sản phẩm MMO",
  MMO_STOCK_EDIT:               "Sửa kho sản phẩm MMO",
  MMO_STOCK_DELETE_SINGLE:      "Xóa 1 mục kho sản phẩm MMO",
  MMO_STOCK_IMPORT:             "Nhập kho sản phẩm MMO",
  MMO_PRODUCT_IMAGE_CREATE:     "Thêm ảnh sản phẩm MMO",
  MMO_PRODUCT_IMAGE_DELETE:     "Xóa ảnh sản phẩm MMO",
  // Số dư / escrow (bổ sung)
  ADMIN_ADJUST_ESCROW:      "Điều chỉnh số dư tạm giữ",
  ADMIN_SET_AGENT_DISCOUNT: "Cài đặt chiết khấu đại lý",
  ADMIN_SET_DISCOUNT_ALL:   "Cài đặt chiết khấu hàng loạt",
  ESCROW_DEPOSIT:           "Nạp tiền tạm giữ",
  // Mã giảm giá
  CREATE_COUPON: "Tạo mã giảm giá",
  UPDATE_COUPON: "Cập nhật mã giảm giá",
  DELETE_COUPON: "Xóa mã giảm giá",
  // Affiliate
  APPROVE:                          "Duyệt",
  AFFILIATE_WITHDRAWAL_REQUESTED:   "Yêu cầu rút hoa hồng affiliate",
  AFFILIATE_WITHDRAWAL_COMPLETED:   "Hoàn tất rút hoa hồng affiliate",
  AFFILIATE_COMMISSION_RULE_CREATED:"Tạo quy tắc hoa hồng affiliate",
  AFFILIATE_COMMISSION_RULE_UPDATED:"Cập nhật quy tắc hoa hồng affiliate",
  AFFILIATE_COMMISSION_RULE_DELETED:"Xóa quy tắc hoa hồng affiliate",
  AFFILIATE_STATUS_UPDATED:         "Cập nhật trạng thái affiliate",
  AFFILIATE_CUSTOMER_REASSIGNED:    "Chuyển khách hàng affiliate",
  AFFILIATE_ACCESS_GRANTED:         "Cấp quyền affiliate",
  // Sắp xếp danh mục
  REORDER_TUT_TRICK_CATEGORIES: "Sắp xếp danh mục Tut-Trick",
  REORDER_CATEGORY_STAFF:       "Sắp xếp danh mục nhân viên",
  REORDER_COURSE_CATEGORIES:    "Sắp xếp danh mục khóa học",
  REORDER_RESOURCE_CATEGORIES:  "Sắp xếp danh mục tài nguyên",
  REORDER_SERVICE_CATEGORIES:   "Sắp xếp danh mục dịch vụ",
  // Danh mục nhân viên
  CREATE_CATEGORY_STAFF: "Tạo danh mục nhân viên",
  UPDATE_CATEGORY_STAFF: "Cập nhật danh mục nhân viên",
  DELETE_CATEGORY_STAFF: "Xóa danh mục nhân viên",
  // KhuongFB (nguồn hàng ngoài)
  KHUONGFB_MANUAL_SYNC:         "Đồng bộ thủ công KhuongFB",
  UPDATE_KHUONGFB_PRODUCT:      "Cập nhật sản phẩm KhuongFB",
  UPDATE_KHUONGFB_CONFIG:       "Cập nhật cấu hình KhuongFB",
  KHUONGFB_PRODUCT_IMAGE_CREATE:"Thêm ảnh sản phẩm KhuongFB",
  KHUONGFB_PRODUCT_IMAGE_DELETE:"Xóa ảnh sản phẩm KhuongFB",
  ADD_EXTERNAL_PROVIDER:        "Thêm nhà cung cấp ngoài",
  UPDATE_EXTERNAL_PROVIDER:     "Cập nhật nhà cung cấp ngoài",
  DELETE_EXTERNAL_PROVIDER:     "Xóa nhà cung cấp ngoài",
  // Cấu hình hệ thống (bổ sung)
  UPDATE_DEPOSIT_BANK_CONFIG: "Cập nhật cấu hình ngân hàng nạp tiền",
  // Trang công khai (bổ sung)
  CREATE_PUBLIC_PAGE_CONFIG: "Tạo cấu hình trang công khai",
  DELETE_PUBLIC_PAGE_CONFIG: "Xóa cấu hình trang công khai",
  // Khiếu nại (bổ sung)
  DISPUTE_ROUND_1:          "Từ chối vòng 1 tranh chấp — chuyển admin xử lý",
  // Rút hoa hồng affiliate (bổ sung)
  AFFILIATE_WITHDRAWAL_APPROVED: "Duyệt rút hoa hồng affiliate",
  AFFILIATE_WITHDRAWAL_REJECTED: "Từ chối rút hoa hồng affiliate",
  // Hoa hồng affiliate (bổ sung)
  AFFILIATE_COMMISSION_APPROVED: "Duyệt hoa hồng affiliate",
  AFFILIATE_COMMISSION_VOIDED:   "Hủy hoa hồng affiliate",
  // Duyệt sản phẩm nhà bán hàng (bổ sung)
  SELLER_PRODUCT_APPROVED: "Duyệt sản phẩm nhà bán hàng",
  SELLER_PRODUCT_REJECTED: "Từ chối sản phẩm nhà bán hàng",
};

const TARGET_TYPE_VI: Record<string, string> = {
  User:              "Người dùng",
  Course:            "Khóa học",
  CourseCategory:    "Danh mục KH",
  Service:           "Dịch vụ",
  ServiceCategory:   "Danh mục DV",
  TutTrick:          "Tut-Trick",
  TutTrickCategory:  "Danh mục TT",
  MmoProduct:        "Sản phẩm MMO",
  SellerProduct:     "SP nhà bán",
  ResourceCategory:  "Danh mục TN",
  Order:             "Đơn hàng",
  Complaint:         "Khiếu nại",
  Review:            "Đánh giá",
  Withdrawal:        "Rút tiền",
  SellerTier:           "Hạng bán hàng",
  SellerTierDefinition: "Hạng bán hàng",
  PagePermission:       "Phân quyền",
  SiteContent:          "Nội dung trang",
  BankChangeRequest:    "Yêu cầu đổi ngân hàng",
  Coupon:               "Mã giảm giá",
  SellerWithdrawal:     "Rút tiền nhà bán",
  AffiliateWithdrawal:  "Rút hoa hồng affiliate",
  SellerRequest:        "Yêu cầu bán hàng",
  ChatRoom:             "Phòng chat",
  AffiliateCommission:     "Hoa hồng affiliate",
  AffiliateCommissionRule: "Quy tắc hoa hồng affiliate",
  CategoryStaff:        "Danh mục nhân viên",
  SellerProductVariant: "Biến thể SP nhà bán",
  SystemConfig:         "Cấu hình hệ thống",
  ProductImage:         "Ảnh sản phẩm",
  ExternalProduct:      "Sản phẩm KhuongFB",
  PublicPageConfig:     "Cấu hình trang công khai",
  MmoProductVariant:    "Biến thể SP MMO",
  MmoProductItem:       "Mục kho SP MMO",
};

const SITE_CONTENT_PAGE_VI: Record<string, string> = {
  page_tut_tricks:          "Tut & Tricks",
  page_tai_nguyen:          "Tài nguyên MMO",
  page_networks:            "Networks",
  page_quang_cao:           "Quảng cáo",
  page_quang_cao_why_choose:"Quảng cáo — Tại sao chọn",
  page_khoa_hoc:            "Khóa học",
  page_dich_vu:             "Dịch vụ",
  home_stats:               "Trang chủ — Thống kê",
  home_press:               "Trang chủ — Báo chí",
  home_faq:                 "Trang chủ — Câu hỏi",
  footer:                   "Footer",
  thank_you:                "Trang cảm ơn",
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
  if (!targetId) return label;
  if (targetType === "SiteContent") {
    return `${label} — ${SITE_CONTENT_PAGE_VI[targetId] ?? targetId}`;
  }
  return `${label} #${targetId.slice(0, 8)}`;
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
          <p className="text-xs text-gray-400 mt-0.5">Lưu 90 ngày gần nhất </p>
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} bản ghi</span>
      </div>

      <AdminFilterBar
        basePath="/admin/audit-log"
        search={{ placeholder: "Tìm theo tên hành động (vd: DEPOSIT, ORDER...)...", paramKey: "action" }}
      />

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
