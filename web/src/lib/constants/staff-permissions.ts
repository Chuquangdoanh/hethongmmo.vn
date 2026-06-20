// Backward compat: StaffPermissionKey → PermissionCode (superset)
import type { PermissionCode } from "@/lib/constants/modules";
export type StaffPermissionKey = PermissionCode;

export interface StaffPermissionAction {
  key: StaffPermissionKey;
  label: string;
  type: "read" | "create" | "update" | "delete" | "approve" | "reject" | "reply" | "close";
}

export interface StaffPermissionGroup {
  key: string;
  label: string;
  color: string;
  bg: string;
  actions: StaffPermissionAction[];
}

export const STAFF_PERMISSION_GROUPS: StaffPermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    color: "#92400e",
    bg: "#fef3c7",
    actions: [
      { key: "dashboard:read", label: "Xem tổng quan / thống kê", type: "read" },
    ],
  },
  {
    key: "users",
    label: "Quản lý User",
    color: "#2563eb",
    bg: "#dbeafe",
    actions: [
      { key: "users:read",   label: "Xem danh sách người dùng",    type: "read"   },
      { key: "users:create", label: "Tạo tài khoản mới",           type: "create" },
      { key: "users:update", label: "Sửa thông tin / khóa tài khoản", type: "update" },
      { key: "users:delete", label: "Xóa tài khoản",               type: "delete" },
    ],
  },
  {
    key: "orders",
    label: "Đơn hàng",
    color: "#7c3aed",
    bg: "#ede9fe",
    actions: [
      { key: "orders:read",   label: "Xem danh sách đơn hàng",      type: "read"   },
      { key: "orders:update", label: "Cập nhật trạng thái đơn",     type: "update" },
      { key: "orders:delete", label: "Hủy / Xóa đơn hàng",         type: "delete" },
    ],
  },
  {
    key: "products",
    label: "Sản phẩm & Dịch vụ",
    color: "#7c3aed",
    bg: "#f5f3ff",
    actions: [
      { key: "products:read",   label: "Xem sản phẩm / dịch vụ",    type: "read"   },
      { key: "products:create", label: "Thêm sản phẩm mới",          type: "create" },
      { key: "products:update", label: "Sửa thông tin sản phẩm",     type: "update" },
      { key: "products:delete", label: "Xóa sản phẩm",               type: "delete" },
    ],
  },
  {
    key: "categories",
    label: "Danh mục",
    color: "#0d9488",
    bg: "#ccfbf1",
    actions: [
      { key: "categories:read",   label: "Xem danh mục",       type: "read"   },
      { key: "categories:create", label: "Tạo danh mục mới",   type: "create" },
      { key: "categories:update", label: "Sửa danh mục",       type: "update" },
      { key: "categories:delete", label: "Xóa danh mục",       type: "delete" },
    ],
  },
  {
    key: "finance",
    label: "Tài chính",
    color: "#16a34a",
    bg: "#dcfce7",
    actions: [
      { key: "finance:read",    label: "Xem nạp / rút tiền",   type: "read"    },
      { key: "finance:approve", label: "Duyệt giao dịch",      type: "approve" },
      { key: "finance:reject",  label: "Từ chối giao dịch",    type: "reject"  },
    ],
  },
  {
    key: "complaints",
    label: "Khiếu nại",
    color: "#ef4444",
    bg: "#fee2e2",
    actions: [
      { key: "complaints:read",   label: "Xem danh sách khiếu nại",  type: "read"   },
      { key: "complaints:reply",  label: "Trả lời / Trao đổi",       type: "reply"  },
      { key: "complaints:update", label: "Cập nhật trạng thái",      type: "update" },
      { key: "complaints:close",  label: "Đóng / Giải quyết khiếu nại", type: "close" },
    ],
  },
  {
    key: "chat",
    label: "Hỗ trợ Chat",
    color: "#0ea5e9",
    bg: "#e0f2fe",
    actions: [
      { key: "chat:read",  label: "Xem tin nhắn",      type: "read"  },
      { key: "chat:reply", label: "Trả lời tin nhắn",  type: "reply" },
    ],
  },
  {
    key: "content",
    label: "Nội dung & CMS",
    color: "#ea580c",
    bg: "#ffedd5",
    actions: [
      { key: "content:read",   label: "Xem nội dung / thông báo",  type: "read"   },
      { key: "content:create", label: "Đăng bài / Tạo thông báo",  type: "create" },
      { key: "content:update", label: "Sửa nội dung",              type: "update" },
      { key: "content:delete", label: "Xóa nội dung",              type: "delete" },
    ],
  },
  {
    key: "sellers",
    label: "Nhà bán hàng",
    color: "#ec4899",
    bg: "#fce7f3",
    actions: [
      { key: "sellers:read",    label: "Xem danh sách seller",       type: "read"   },
      { key: "sellers:approve", label: "Duyệt đăng ký bán hàng",    type: "approve" },
      { key: "sellers:update",  label: "Sửa thông tin / hạn mức",   type: "update" },
      { key: "sellers:delete",  label: "Xóa / Khóa seller",         type: "delete" },
    ],
  },
  {
    key: "seller_products",
    label: "Sản phẩm nhà bán hàng",
    color: "#f97316",
    bg: "#fff7ed",
    actions: [
      { key: "seller_products:read",   label: "Xem sản phẩm của seller",  type: "read"   },
      { key: "seller_products:update", label: "Sửa / Duyệt sản phẩm",    type: "update" },
      { key: "seller_products:delete", label: "Xóa sản phẩm của seller",  type: "delete" },
    ],
  },
  {
    key: "system",
    label: "Hệ thống",
    color: "#64748b",
    bg: "#f1f5f9",
    actions: [
      { key: "transactions:read", label: "Xem lịch sử giao dịch",  type: "read" },
      { key: "audit_logs:read",   label: "Xem nhật ký audit log",  type: "read" },
    ],
  },
];

export const ALL_STAFF_PERMISSIONS: StaffPermissionKey[] =
  STAFF_PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => a.key));

/** Màu badge theo loại action */
export const ACTION_TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  read:    { bg: "#dcfce7", text: "#16a34a", label: "R" },
  create:  { bg: "#ede9fe", text: "#7c3aed", label: "C" },
  update:  { bg: "#ffedd5", text: "#ea580c", label: "U" },
  delete:  { bg: "#fee2e2", text: "#dc2626", label: "D" },
  approve: { bg: "#dbeafe", text: "#2563eb", label: "A" },
  reject:  { bg: "#fee2e2", text: "#dc2626", label: "X" },
  reply:   { bg: "#e0f2fe", text: "#0ea5e9", label: "↩" },
  close:   { bg: "#f3f4f6", text: "#6b7280", label: "✓" },
};
