-- Seed modules and permissions data
-- Safe to run multiple times (ON CONFLICT DO NOTHING)

-- ── Modules ──────────────────────────────────────────────────────────────────
INSERT INTO "modules" ("id", "code", "label", "icon", "sort_order", "updated_at") VALUES
  (gen_random_uuid(), 'dashboard',       'Dashboard',             'layout-dashboard', 0,  NOW()),
  (gen_random_uuid(), 'users',           'Quản lý User',          'users',            1,  NOW()),
  (gen_random_uuid(), 'orders',          'Đơn hàng',              'shopping-cart',    2,  NOW()),
  (gen_random_uuid(), 'products',        'Sản phẩm / Dịch vụ',   'package',          3,  NOW()),
  (gen_random_uuid(), 'services',        'Dịch vụ',               'briefcase',        4,  NOW()),
  (gen_random_uuid(), 'courses',         'Khóa học',              'graduation-cap',   5,  NOW()),
  (gen_random_uuid(), 'tut_tricks',      'Tut Trick',             'lightbulb',        6,  NOW()),
  (gen_random_uuid(), 'resources',       'Tài nguyên MMO',        'database',         7,  NOW()),
  (gen_random_uuid(), 'categories',      'Danh mục',              'folder',           8,  NOW()),
  (gen_random_uuid(), 'finance',         'Tài chính',             'banknote',         9,  NOW()),
  (gen_random_uuid(), 'complaints',      'Khiếu nại',             'alert-triangle',   10, NOW()),
  (gen_random_uuid(), 'chat',            'Trò chuyện',            'message-square',   11, NOW()),
  (gen_random_uuid(), 'content',         'Nội dung & Thông báo', 'file-text',         12, NOW()),
  (gen_random_uuid(), 'sellers',         'Quản lý Seller',        'store',            13, NOW()),
  (gen_random_uuid(), 'seller_products', 'Sản phẩm Seller',       'tag',              14, NOW()),
  (gen_random_uuid(), 'transactions',    'Giao dịch & Logs',      'activity',         15, NOW())
ON CONFLICT ("code") DO NOTHING;

-- ── Permissions ───────────────────────────────────────────────────────────────
INSERT INTO "permissions" ("id", "module_id", "code", "action", "label", "sort_order", "updated_at") VALUES
  -- Dashboard
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'dashboard'),       'dashboard:read',          'read',   'Xem dashboard',                  0, NOW()),

  -- Users
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'users'),           'users:read',              'read',   'Xem danh sách user',             0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'users'),           'users:create',            'create', 'Tạo tài khoản',                  1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'users'),           'users:update',            'update', 'Sửa thông tin user',             2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'users'),           'users:delete',            'delete', 'Xóa / khóa user',               3, NOW()),

  -- Orders
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'orders'),          'orders:read',             'read',   'Xem đơn hàng',                   0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'orders'),          'orders:update',           'update', 'Cập nhật trạng thái đơn',        1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'orders'),          'orders:delete',           'delete', 'Hủy / xóa đơn hàng',            2, NOW()),

  -- Products
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'products'),        'products:read',           'read',   'Xem sản phẩm / dịch vụ',        0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'products'),        'products:create',         'create', 'Thêm sản phẩm mới',              1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'products'),        'products:update',         'update', 'Sửa thông tin sản phẩm',         2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'products'),        'products:delete',         'delete', 'Xóa sản phẩm',                   3, NOW()),

  -- Services
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'services'),        'services:read',           'read',   'Xem dịch vụ',                    0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'services'),        'services:create',         'create', 'Thêm dịch vụ mới',               1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'services'),        'services:update',         'update', 'Sửa thông tin dịch vụ',          2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'services'),        'services:delete',         'delete', 'Xóa dịch vụ',                    3, NOW()),

  -- Courses
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'courses'),         'courses:read',            'read',   'Xem khóa học',                   0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'courses'),         'courses:create',          'create', 'Thêm khóa học mới',              1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'courses'),         'courses:update',          'update', 'Sửa thông tin khóa học',         2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'courses'),         'courses:delete',          'delete', 'Xóa khóa học',                   3, NOW()),

  -- Tut Tricks
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'tut_tricks'),      'tut_tricks:read',         'read',   'Xem tut trick',                  0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'tut_tricks'),      'tut_tricks:create',       'create', 'Thêm tut trick mới',             1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'tut_tricks'),      'tut_tricks:update',       'update', 'Sửa tut trick',                  2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'tut_tricks'),      'tut_tricks:delete',       'delete', 'Xóa tut trick',                  3, NOW()),

  -- Resources
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'resources'),       'resources:read',          'read',   'Xem tài nguyên MMO',             0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'resources'),       'resources:create',        'create', 'Thêm tài nguyên mới',            1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'resources'),       'resources:update',        'update', 'Sửa / Quản lý kho tài nguyên',  2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'resources'),       'resources:delete',        'delete', 'Xóa tài nguyên',                 3, NOW()),

  -- Categories
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'categories'),      'categories:read',         'read',   'Xem danh mục',                   0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'categories'),      'categories:create',       'create', 'Thêm danh mục',                  1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'categories'),      'categories:update',       'update', 'Sửa danh mục',                   2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'categories'),      'categories:delete',       'delete', 'Xóa danh mục',                   3, NOW()),

  -- Finance
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'finance'),         'finance:read',            'read',   'Xem nạp / rút tiền',             0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'finance'),         'finance:approve',         'approve','Duyệt giao dịch',                1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'finance'),         'finance:reject',          'reject', 'Từ chối giao dịch',              2, NOW()),

  -- Complaints
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'complaints'),      'complaints:read',         'read',   'Xem khiếu nại',                  0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'complaints'),      'complaints:reply',        'reply',  'Phản hồi khiếu nại',             1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'complaints'),      'complaints:update',       'update', 'Cập nhật trạng thái',            2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'complaints'),      'complaints:close',        'close',  'Đóng khiếu nại',                 3, NOW()),

  -- Chat
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'chat'),            'chat:read',               'read',   'Xem hội thoại',                  0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'chat'),            'chat:reply',              'reply',  'Trả lời hội thoại',              1, NOW()),

  -- Content
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'content'),         'content:read',            'read',   'Xem nội dung / thông báo',       0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'content'),         'content:create',          'create', 'Đăng bài / tạo thông báo',       1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'content'),         'content:update',          'update', 'Sửa nội dung',                   2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'content'),         'content:delete',          'delete', 'Xóa nội dung',                   3, NOW()),

  -- Sellers
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'sellers'),         'sellers:read',            'read',   'Xem danh sách seller',           0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'sellers'),         'sellers:approve',         'approve','Duyệt seller',                   1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'sellers'),         'sellers:update',          'update', 'Sửa thông tin seller',           2, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'sellers'),         'sellers:delete',          'delete', 'Khóa / xóa seller',             3, NOW()),

  -- Seller Products
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'seller_products'), 'seller_products:read',    'read',   'Xem sản phẩm seller',            0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'seller_products'), 'seller_products:update',  'update', 'Duyệt / sửa sản phẩm',          1, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'seller_products'), 'seller_products:delete',  'delete', 'Xóa sản phẩm seller',            2, NOW()),

  -- Transactions & Logs
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'transactions'),    'transactions:read',       'read',   'Xem lịch sử giao dịch',          0, NOW()),
  (gen_random_uuid(), (SELECT id FROM modules WHERE code = 'transactions'),    'audit_logs:read',         'read',   'Xem audit log',                  1, NOW())

ON CONFLICT ("code") DO NOTHING;
