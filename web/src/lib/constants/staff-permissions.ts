export type StaffPermissionKey =
  | "users:read"    | "users:create"    | "users:update"    | "users:delete"
  | "orders:read"   | "orders:update"   | "orders:delete"
  | "products:read" | "products:create" | "products:update" | "products:delete"
  | "finance:read"  | "finance:approve" | "finance:reject"
  | "content:read"  | "content:create"  | "content:update"  | "content:delete";

export interface StaffPermissionAction {
  key: StaffPermissionKey;
  label: string;
  type: "read" | "create" | "update" | "delete" | "approve" | "reject";
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
    key: "users",
    label: "Quản lý User",
    color: "#2563eb",
    bg: "#dbeafe",
    actions: [
      { key: "users:read",   label: "Xem danh sách",       type: "read"   },
      { key: "users:create", label: "Tạo tài khoản",       type: "create" },
      { key: "users:update", label: "Sửa thông tin",       type: "update" },
      { key: "users:delete", label: "Xóa / Khóa tài khoản", type: "delete" },
    ],
  },
  {
    key: "orders_products",
    label: "Đơn hàng & Sản phẩm",
    color: "#7c3aed",
    bg: "#ede9fe",
    actions: [
      { key: "orders:read",    label: "Xem đơn hàng",             type: "read"   },
      { key: "orders:update",  label: "Cập nhật trạng thái đơn",  type: "update" },
      { key: "orders:delete",  label: "Hủy / Xóa đơn hàng",      type: "delete" },
      { key: "products:read",   label: "Xem sản phẩm / dịch vụ", type: "read"   },
      { key: "products:create", label: "Thêm sản phẩm mới",       type: "create" },
      { key: "products:update", label: "Sửa thông tin sản phẩm",  type: "update" },
      { key: "products:delete", label: "Xóa sản phẩm",            type: "delete" },
    ],
  },
  {
    key: "finance",
    label: "Tài chính",
    color: "#16a34a",
    bg: "#dcfce7",
    actions: [
      { key: "finance:read",    label: "Xem nạp / rút tiền",  type: "read"    },
      { key: "finance:approve", label: "Duyệt giao dịch",     type: "approve" },
      { key: "finance:reject",  label: "Từ chối giao dịch",   type: "reject"  },
    ],
  },
  {
    key: "content",
    label: "Nội dung & Thông báo",
    color: "#ea580c",
    bg: "#ffedd5",
    actions: [
      { key: "content:read",   label: "Xem nội dung / thông báo", type: "read"   },
      { key: "content:create", label: "Đăng bài / Tạo thông báo", type: "create" },
      { key: "content:update", label: "Sửa nội dung",             type: "update" },
      { key: "content:delete", label: "Xóa nội dung",             type: "delete" },
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
};
