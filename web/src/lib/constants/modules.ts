// Danh sách toàn bộ modules và permissions của hệ thống
// Dùng làm nguồn seed data — sync với DB qua script seed

export type PermissionCode =
  | "dashboard:read"
  | "users:read"       | "users:create"       | "users:update"       | "users:delete"
  | "orders:read"      | "orders:update"      | "orders:delete"
  | "products:read"    | "products:create"    | "products:update"    | "products:delete"
  | "services:read"    | "services:create"    | "services:update"    | "services:delete"
  | "courses:read"     | "courses:create"     | "courses:update"     | "courses:delete"
  | "tut_tricks:read"  | "tut_tricks:create"  | "tut_tricks:update"  | "tut_tricks:delete"
  | "resources:read"   | "resources:create"   | "resources:update"   | "resources:delete"
  | "categories:read"  | "categories:create"  | "categories:update"  | "categories:delete"
  | "finance:read"     | "finance:approve"    | "finance:reject"
  | "complaints:read"  | "complaints:reply"   | "complaints:update"  | "complaints:close"
  | "chat:read"        | "chat:reply"
  | "content:read"     | "content:create"     | "content:update"     | "content:delete"
  | "sellers:read"     | "sellers:approve"    | "sellers:update"     | "sellers:delete"
  | "seller_products:read" | "seller_products:update" | "seller_products:delete"
  | "transactions:read" | "audit_logs:read";

export interface ModuleSeed {
  code: string;
  label: string;
  icon?: string;
  description?: string;
  sortOrder: number;
}

export interface PermissionSeed {
  code: PermissionCode;
  module: string;
  action: string;
  label: string;
  description?: string;
  sortOrder: number;
}

export const MODULES: ModuleSeed[] = [
  { code: "dashboard",        label: "Dashboard",              icon: "layout-dashboard",   sortOrder: 0  },
  { code: "users",            label: "Quản lý User",           icon: "users",              sortOrder: 1  },
  { code: "orders",           label: "Đơn hàng",               icon: "shopping-cart",      sortOrder: 2  },
  { code: "products",         label: "Sản phẩm / Dịch vụ",    icon: "package",            sortOrder: 3  },
  { code: "services",         label: "Dịch vụ",                icon: "briefcase",          sortOrder: 4  },
  { code: "courses",          label: "Khóa học",               icon: "graduation-cap",     sortOrder: 5  },
  { code: "tut_tricks",       label: "Tut Trick",              icon: "lightbulb",          sortOrder: 6  },
  { code: "resources",        label: "Tài nguyên MMO",         icon: "database",           sortOrder: 7  },
  { code: "categories",       label: "Danh mục",               icon: "folder",             sortOrder: 8  },
  { code: "finance",          label: "Tài chính",              icon: "banknote",           sortOrder: 9  },
  { code: "complaints",       label: "Khiếu nại",             icon: "alert-triangle",     sortOrder: 10 },
  { code: "chat",             label: "Trò chuyện",             icon: "message-square",     sortOrder: 11 },
  { code: "content",          label: "Nội dung & Thông báo",  icon: "file-text",          sortOrder: 12 },
  { code: "sellers",          label: "Quản lý Seller",         icon: "store",              sortOrder: 13 },
  { code: "seller_products",  label: "Sản phẩm Seller",        icon: "tag",                sortOrder: 14 },
  { code: "transactions",     label: "Giao dịch & Logs",       icon: "activity",           sortOrder: 15 },
];

export const PERMISSIONS: PermissionSeed[] = [
  // Dashboard
  { code: "dashboard:read",   module: "dashboard", action: "read",   label: "Xem dashboard",                sortOrder: 0 },

  // Users
  { code: "users:read",       module: "users",     action: "read",   label: "Xem danh sách user",           sortOrder: 0 },
  { code: "users:create",     module: "users",     action: "create", label: "Tạo tài khoản",                sortOrder: 1 },
  { code: "users:update",     module: "users",     action: "update", label: "Sửa thông tin user",           sortOrder: 2 },
  { code: "users:delete",     module: "users",     action: "delete", label: "Xóa / khóa user",             sortOrder: 3 },

  // Orders
  { code: "orders:read",      module: "orders",    action: "read",   label: "Xem đơn hàng",                sortOrder: 0 },
  { code: "orders:update",    module: "orders",    action: "update", label: "Cập nhật trạng thái đơn",     sortOrder: 1 },
  { code: "orders:delete",    module: "orders",    action: "delete", label: "Hủy / xóa đơn hàng",         sortOrder: 2 },

  // Products
  { code: "products:read",    module: "products",  action: "read",   label: "Xem sản phẩm / dịch vụ",     sortOrder: 0 },
  { code: "products:create",  module: "products",  action: "create", label: "Thêm sản phẩm mới",           sortOrder: 1 },
  { code: "products:update",  module: "products",  action: "update", label: "Sửa thông tin sản phẩm",      sortOrder: 2 },
  { code: "products:delete",  module: "products",  action: "delete", label: "Xóa sản phẩm",               sortOrder: 3 },

  // Services (Dịch vụ)
  { code: "services:read",    module: "services",   action: "read",   label: "Xem dịch vụ",                 sortOrder: 0 },
  { code: "services:create",  module: "services",   action: "create", label: "Thêm dịch vụ mới",            sortOrder: 1 },
  { code: "services:update",  module: "services",   action: "update", label: "Sửa thông tin dịch vụ",       sortOrder: 2 },
  { code: "services:delete",  module: "services",   action: "delete", label: "Xóa dịch vụ",                 sortOrder: 3 },

  // Courses (Khóa học)
  { code: "courses:read",     module: "courses",    action: "read",   label: "Xem khóa học",                sortOrder: 0 },
  { code: "courses:create",   module: "courses",    action: "create", label: "Thêm khóa học mới",           sortOrder: 1 },
  { code: "courses:update",   module: "courses",    action: "update", label: "Sửa thông tin khóa học",      sortOrder: 2 },
  { code: "courses:delete",   module: "courses",    action: "delete", label: "Xóa khóa học",                sortOrder: 3 },

  // Tut Tricks
  { code: "tut_tricks:read",   module: "tut_tricks", action: "read",   label: "Xem tut trick",              sortOrder: 0 },
  { code: "tut_tricks:create", module: "tut_tricks", action: "create", label: "Thêm tut trick mới",         sortOrder: 1 },
  { code: "tut_tricks:update", module: "tut_tricks", action: "update", label: "Sửa tut trick",              sortOrder: 2 },
  { code: "tut_tricks:delete", module: "tut_tricks", action: "delete", label: "Xóa tut trick",              sortOrder: 3 },

  // Resources (Tài nguyên MMO)
  { code: "resources:read",   module: "resources",  action: "read",   label: "Xem tài nguyên MMO",          sortOrder: 0 },
  { code: "resources:create", module: "resources",  action: "create", label: "Thêm tài nguyên mới",         sortOrder: 1 },
  { code: "resources:update", module: "resources",  action: "update", label: "Sửa / Quản lý kho tài nguyên", sortOrder: 2 },
  { code: "resources:delete", module: "resources",  action: "delete", label: "Xóa tài nguyên",              sortOrder: 3 },

  // Categories
  { code: "categories:read",   module: "categories", action: "read",   label: "Xem danh mục",               sortOrder: 0 },
  { code: "categories:create", module: "categories", action: "create", label: "Thêm danh mục",              sortOrder: 1 },
  { code: "categories:update", module: "categories", action: "update", label: "Sửa danh mục",               sortOrder: 2 },
  { code: "categories:delete", module: "categories", action: "delete", label: "Xóa danh mục",               sortOrder: 3 },

  // Finance
  { code: "finance:read",     module: "finance",   action: "read",    label: "Xem nạp / rút tiền",         sortOrder: 0 },
  { code: "finance:approve",  module: "finance",   action: "approve", label: "Duyệt giao dịch",            sortOrder: 1 },
  { code: "finance:reject",   module: "finance",   action: "reject",  label: "Từ chối giao dịch",          sortOrder: 2 },

  // Complaints
  { code: "complaints:read",   module: "complaints", action: "read",   label: "Xem khiếu nại",             sortOrder: 0 },
  { code: "complaints:reply",  module: "complaints", action: "reply",  label: "Phản hồi khiếu nại",        sortOrder: 1 },
  { code: "complaints:update", module: "complaints", action: "update", label: "Cập nhật trạng thái",       sortOrder: 2 },
  { code: "complaints:close",  module: "complaints", action: "close",  label: "Đóng khiếu nại",            sortOrder: 3 },

  // Chat
  { code: "chat:read",        module: "chat",      action: "read",   label: "Xem hội thoại",               sortOrder: 0 },
  { code: "chat:reply",       module: "chat",      action: "reply",  label: "Trả lời hội thoại",           sortOrder: 1 },

  // Content
  { code: "content:read",     module: "content",   action: "read",   label: "Xem nội dung / thông báo",   sortOrder: 0 },
  { code: "content:create",   module: "content",   action: "create", label: "Đăng bài / tạo thông báo",   sortOrder: 1 },
  { code: "content:update",   module: "content",   action: "update", label: "Sửa nội dung",               sortOrder: 2 },
  { code: "content:delete",   module: "content",   action: "delete", label: "Xóa nội dung",               sortOrder: 3 },

  // Sellers
  { code: "sellers:read",     module: "sellers",   action: "read",    label: "Xem danh sách seller",       sortOrder: 0 },
  { code: "sellers:approve",  module: "sellers",   action: "approve", label: "Duyệt seller",               sortOrder: 1 },
  { code: "sellers:update",   module: "sellers",   action: "update",  label: "Sửa thông tin seller",       sortOrder: 2 },
  { code: "sellers:delete",   module: "sellers",   action: "delete",  label: "Khóa / xóa seller",         sortOrder: 3 },

  // Seller Products
  { code: "seller_products:read",   module: "seller_products", action: "read",   label: "Xem sản phẩm seller",       sortOrder: 0 },
  { code: "seller_products:update", module: "seller_products", action: "update", label: "Duyệt / sửa sản phẩm",      sortOrder: 1 },
  { code: "seller_products:delete", module: "seller_products", action: "delete", label: "Xóa sản phẩm seller",        sortOrder: 2 },

  // Transactions & Logs
  { code: "transactions:read", module: "transactions", action: "read", label: "Xem lịch sử giao dịch", sortOrder: 0 },
  { code: "audit_logs:read",   module: "transactions", action: "read", label: "Xem audit log",          sortOrder: 1 },
];

export const ALL_PERMISSION_CODES: PermissionCode[] = PERMISSIONS.map((p) => p.code);

/** Lấy danh sách permissions của 1 module */
export function getPermissionsByModule(moduleCode: string): PermissionSeed[] {
  return PERMISSIONS.filter((p) => p.module === moduleCode);
}

/** Kiểm tra 1 permission code có thuộc module không */
export function isPermissionInModule(code: string, moduleCode: string): boolean {
  return PERMISSIONS.some((p) => p.code === code && p.module === moduleCode);
}

/** Lấy module code từ permission code (ví dụ: "products:read" → "products") */
export function getModuleFromPermissionCode(code: string): string | null {
  return PERMISSIONS.find((p) => p.code === code)?.module ?? null;
}

/** Danh sách permissions phụ thuộc — nếu bật create/update/delete thì tự bật read */
export const PERMISSION_DEPENDENCIES: Record<string, PermissionCode[]> = {
  "users:create":           ["users:read"],
  "users:update":           ["users:read"],
  "users:delete":           ["users:read"],
  "orders:update":          ["orders:read"],
  "orders:delete":          ["orders:read"],
  "products:create":        ["products:read"],
  "products:update":        ["products:read"],
  "products:delete":        ["products:read"],
  "services:create":        ["services:read"],
  "services:update":        ["services:read"],
  "services:delete":        ["services:read"],
  "courses:create":         ["courses:read"],
  "courses:update":         ["courses:read"],
  "courses:delete":         ["courses:read"],
  "tut_tricks:create":      ["tut_tricks:read"],
  "tut_tricks:update":      ["tut_tricks:read"],
  "tut_tricks:delete":      ["tut_tricks:read"],
  "resources:create":       ["resources:read"],
  "resources:update":       ["resources:read"],
  "resources:delete":       ["resources:read"],
  "categories:create":      ["categories:read"],
  "categories:update":      ["categories:read"],
  "categories:delete":      ["categories:read"],
  "finance:approve":        ["finance:read"],
  "finance:reject":         ["finance:read"],
  "complaints:reply":       ["complaints:read"],
  "complaints:update":      ["complaints:read"],
  "complaints:close":       ["complaints:read"],
  "chat:reply":             ["chat:read"],
  "content:create":         ["content:read"],
  "content:update":         ["content:read"],
  "content:delete":         ["content:read"],
  "sellers:approve":        ["sellers:read"],
  "sellers:update":         ["sellers:read"],
  "sellers:delete":         ["sellers:read"],
  "seller_products:update": ["seller_products:read"],
  "seller_products:delete": ["seller_products:read"],
  "audit_logs:read":        ["transactions:read"],
};

/**
 * Giải quyết phụ thuộc: nếu codes chứa "products:create"
 * thì tự động thêm "products:read" vào kết quả.
 */
export function resolveDependencies(codes: PermissionCode[]): PermissionCode[] {
  const result = new Set<PermissionCode>(codes);
  for (const code of codes) {
    const deps = PERMISSION_DEPENDENCIES[code] ?? [];
    for (const dep of deps) result.add(dep);
  }
  return [...result];
}
