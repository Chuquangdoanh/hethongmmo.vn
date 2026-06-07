export type PageEntry = {
  key: string;   // URL path without leading slash, e.g. "admin/users" or "nap-tien"
  label: string;
};

export type PageGroup = {
  key: string;
  label: string;
  pages: PageEntry[];
};

export type RolePageGroup = "USER" | "SELLER" | "STAFF";

// ── STAFF: admin panel pages ──────────────────────────────────────────────────

export const STAFF_PAGE_GROUPS: PageGroup[] = [
  {
    key: "general",
    label: "Tổng quan",
    pages: [
      { key: "admin/dashboard", label: "Dashboard" },
      { key: "admin/orders",    label: "Đơn hàng" },
    ],
  },
  {
    key: "finance",
    label: "Tài chính",
    pages: [
      { key: "admin/deposits",    label: "Nạp tiền" },
      { key: "admin/withdrawals", label: "Rút tiền" },
    ],
  },
  {
    key: "quality",
    label: "Chất lượng",
    pages: [
      { key: "admin/complaints", label: "Khiếu nại" },
      { key: "admin/chats",      label: "Trò chuyện" },
      { key: "admin/reviews",    label: "Đánh giá người dùng" },
      { key: "admin/danh-gia",   label: "Testimonials" },
      { key: "admin/tickers",    label: "Ticker thông báo" },
    ],
  },
  {
    key: "products",
    label: "Sản phẩm",
    pages: [
      { key: "admin/services",     label: "Dịch vụ" },
      { key: "admin/courses",      label: "Khóa học" },
      { key: "admin/tut-tricks",   label: "Tut / Tricks" },
      { key: "admin/mmo-products", label: "Tài nguyên MMO" },
    ],
  },
  {
    key: "categories",
    label: "Danh mục",
    pages: [
      { key: "admin/service-categories",   label: "DM Dịch vụ" },
      { key: "admin/course-categories",    label: "DM Khóa học" },
      { key: "admin/resource-categories",  label: "DM Tài nguyên" },
      { key: "admin/tut-trick-categories", label: "DM Tut & Tricks" },
    ],
  },
  {
    key: "selling",
    label: "Bán hàng",
    pages: [
      { key: "admin/sellers",          label: "Quản lý Sellers" },
      { key: "admin/san-pham-ban",     label: "SP Nhà bán hàng" },
      { key: "admin/cai-dat-ban-hang", label: "Cài đặt bán hàng" },
    ],
  },
  {
    key: "leads",
    label: "Khách hàng",
    pages: [
      { key: "admin/dang-ky-dich-vu", label: "Đăng ký dịch vụ" },
    ],
  },
  {
    key: "system",
    label: "Hệ thống",
    pages: [
      { key: "admin/users",     label: "Người dùng" },
      { key: "admin/audit-log", label: "Audit Log" },
    ],
  },
];

// ── USER: user portal pages ───────────────────────────────────────────────────

export const USER_PAGE_GROUPS: PageGroup[] = [
  {
    key: "account",
    label: "Tài khoản",
    pages: [
      { key: "thong-tin-ca-nhan",  label: "Thông tin cá nhân" },
      { key: "nap-tien",           label: "Nạp tiền" },
      { key: "lich-su-giao-dich",  label: "Lịch sử giao dịch" },
      { key: "don-hang",           label: "Đơn hàng" },
      { key: "tro-chuyen",         label: "Trò chuyện hỗ trợ" },
    ],
  },
];

// ── SELLER: seller portal pages ───────────────────────────────────────────────

export const SELLER_PAGE_GROUPS: PageGroup[] = [
  {
    key: "seller-products",
    label: "Sản phẩm",
    pages: [
      { key: "san-pham", label: "Danh sách sản phẩm" },
    ],
  },
  {
    key: "seller-business",
    label: "Kinh doanh",
    pages: [
      { key: "ban-hang",           label: "Tổng quan bán hàng" },
      { key: "ban-hang/don-hang",  label: "Đơn hàng nhà bán" },
      { key: "ban-hang/doanh-thu", label: "Doanh thu" },
      { key: "ban-hang/khieu-nai", label: "Khiếu nại" },
      { key: "rut-tien",           label: "Rút tiền" },
    ],
  },
];

// ── PUBLIC: trang công khai (không cần đăng nhập) ────────────────────────────

export const PUBLIC_PAGES: PageEntry[] = [
  { key: "",                        label: "Trang chủ" },
  { key: "dich-vu",                 label: "Dịch vụ" },
  { key: "khoa-hoc",                label: "Khóa học" },
  { key: "tut-tricks",              label: "Tut & Tricks" },
  { key: "tai-nguyen-mmo",          label: "Tài nguyên MMO" },
  { key: "NetWorks",                  label: "NETWORKS" },
  { key: "quang-cao",               label: "Quảng cáo" },
  { key: "chinh-sach",              label: "Chính sách bảo mật" },
  { key: "dieu-khoan",              label: "Điều khoản dịch vụ" },
  { key: "chinh-sach-nha-ban-hang", label: "Chính sách nhà bán hàng" },
];

// ── Registry lookup ───────────────────────────────────────────────────────────

export const PAGE_REGISTRY: Record<RolePageGroup, PageGroup[]> = {
  STAFF:  STAFF_PAGE_GROUPS,
  USER:   USER_PAGE_GROUPS,
  SELLER: SELLER_PAGE_GROUPS,
};

export function getAllPageKeys(role: RolePageGroup): string[] {
  return PAGE_REGISTRY[role].flatMap((g) => g.pages.map((p) => p.key));
}
