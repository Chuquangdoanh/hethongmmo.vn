# Phase 3 — Cải tổ hệ thống phân quyền nhân viên (STAFF PERMISSIONS)

> **Status:** ✅ Đang quy hoạch  
> **Mục tiêu:** Từ hệ thống phân quyền rời rạc → hệ thống thống nhất module + action  
> **Thời gian dự kiến:** ~2 tuần

---

## 1. Phân tích hiện trạng

### Hiện tại (STAFF PERMISSIONS)

- ✅ Có `StaffPermission` table: `(userId, permission: string)`
- ✅ Permissions được định nghĩa trong constants: `staff-permissions.ts`
- ✅ 4 module chính: users, orders_products, finance, content
- ✅ Được sử dụng trong route `api/admin/staff-permissions`
- ❌ Không có `Permission` table trong DB
- ❌ Không có `Module` table để quản lý module
- ❌ Không có logic check permission khi access route
- ❌ Không có logic hiển thị menu dựa trên permission
- ❌ Không có phụ thuộc quyền (ví dụ: `create` tự động bật `read`)

### Vấn đề chính

1. **Phân quyền rời rạc**: Permission chỉ là constants string, không quản lý như entity
2. **Không hiển thị menu**: Frontend không biết staff nào có quyền xem menu nào
3. **Kiểm tra thiếu**: Chỉ một vài route check permission, không có pattern chung
4. **Thêm permission cực kỳ khó**: Phải sửa constants + UI + service + routes

---

## 2. Mục tiêu cải tổ

### Phase 3A — Database & Backend Foundation (Week 1-1.5)

Xây dựng tầng dữ liệu và service cơ bản.

**Deliverables:**
- [ ] Tạo `Permission` table (id, module, code, action, label, description, isActive)
- [ ] Tạo `Module` table (id, code, label, icon, sortOrder)
- [ ] Migration: seed dữ liệu permissions từ constants
- [ ] Update `StaffPermission` table: thêm `permissionId` FK (keep backward-compatible `permission` string)
- [ ] Service: `permission.service.ts` (list by module, check permission)
- [ ] Service: `module.service.ts` (list modules, get user modules)
- [ ] Middleware/guard: `requirePermission(code)` cho route handlers
- [ ] Tests: unit tests cho permission checking logic

**Files cần tạo/sửa:**
```
web/prisma/schema.prisma
web/prisma/migrations/<date>_*.sql
web/src/lib/services/permission.service.ts (new)
web/src/lib/services/module.service.ts (new)
web/src/lib/auth/permission-guard.ts (new)
web/src/lib/constants/modules.ts (mới, replace staff-permissions.ts)
web/src/app/api/admin/permissions/route.ts (new)
```

---

### Phase 3B — Backend Route Protection (Week 1.5-2)

Thêm kiểm tra permission vào tất cả route handlers.

**Deliverables:**
- [ ] Audit: danh sách toàn bộ admin routes → map với permission cần thiết
- [ ] Cập nhật middleware route: check permission trước logic
- [ ] Cập nhật API handlers: `requirePermission(session, "code")`
- [ ] Cập nhật service: kiểm tra permission ở layer service (không chỉ route)
- [ ] Tests: integration tests cho từng route module

**Files cần sửa:**
```
web/src/app/api/admin/**/route.ts (check permission)
web/src/lib/services/*.service.ts (check permission ở service layer)
```

---

### Phase 3C — Frontend Menu & Navigation (Week 2-2.5)

Hiển thị menu + route dựa trên permission.

**Deliverables:**
- [ ] API: `GET /api/admin/my-permissions` → trả modules + permissions của current user
- [ ] UI Helper: `canAccessModule()`, `canRead()`, `canCreate()`, `canUpdate()`, `canDelete()`
- [ ] Component: Admin menu → chỉ hiển thị nếu user có ít nhất 1 permission trong module
- [ ] Middleware Next.js: kiểm tra access route trong `middleware.ts`
- [ ] Update trang admin: ẩn nút/action nếu user không có permission

**Files cần tạo/sửa:**
```
web/src/lib/utils/permissions.ts (helpers)
web/src/app/api/admin/my-permissions/route.ts (new)
web/src/middleware.ts (update)
web/src/components/layout/AdminMenu.tsx (update)
web/src/app/(admin)/admin/_components/*.tsx (update buttons)
```

---

### Phase 3D — Admin UI: Phân quyền (Week 2.5-3)

Giao diện admin quản lý quyền cho nhân viên.

**Deliverables:**
- [ ] Trang: `/admin/staff` → danh sách nhân viên + quản lý quyền
- [ ] UI: Hiển thị permissions theo module (checkbox, select)
- [ ] Preset: Chỉ xem / Biên tập / Toàn quyền
- [ ] API PATCH: `PATCH /admin/staffs/{id}/permissions` → cập nhật quyền
- [ ] Phụ thuộc quyền: `create` → auto bật `read`

**Files cần tạo/sửa:**
```
web/src/app/(admin)/admin/staff/page.tsx (new)
web/src/app/(admin)/admin/staff/_components/*.tsx (new)
web/src/lib/services/staff.service.ts (update)
```

---

### Phase 3E — Testing & Documentation (Week 3)

Kiểm tra toàn diện, viết docs.

**Deliverables:**
- [ ] Test scenario: 10 nhân viên khác nhau → kiểm tra access từng trang
- [ ] E2E test: Auth flow + permission check → redirect nếu không có quyền
- [ ] Doc: Permission matrix (module × staff role)
- [ ] Doc: Migration guide nếu cần

---

## 3. Danh sách Permissions & Modules đề xuất

### Modules

```
dashboard     — Dashboard
users         — Quản lý User
orders        — Đơn hàng
products      — Sản phẩm / Dịch vụ
categories    — Danh mục
finance       — Tài chính
complaints    — Khiếu nại
chat          — Trò chuyện
content       — Nội dung & Thông báo
sellers       — Quản lý Seller
seller_products — Sản phẩm Seller
transactions  — Giao dịch / Log
```

### Permissions (Tạm định, sẽ fine-tune sau)

**Dashboard**
- `dashboard:read` — Xem dashboard

**Users**
- `users:read` — Xem danh sách user
- `users:create` — Tạo tài khoản
- `users:update` — Sửa user
- `users:delete` — Xóa / khóa user

**Orders**
- `orders:read` — Xem đơn hàng
- `orders:update` — Cập nhật trạng thái
- `orders:delete` — Xóa / hủy đơn

**Products**
- `products:read` — Xem sản phẩm
- `products:create` — Thêm sản phẩm
- `products:update` — Sửa sản phẩm
- `products:delete` — Xóa sản phẩm

**Categories**
- `categories:read` — Xem danh mục
- `categories:create` — Thêm danh mục
- `categories:update` — Sửa danh mục
- `categories:delete` — Xóa danh mục

**Finance**
- `finance:read` — Xem nạp / rút
- `finance:approve` — Duyệt giao dịch
- `finance:reject` — Từ chối giao dịch

**Complaints**
- `complaints:read` — Xem khiếu nại
- `complaints:reply` — Phản hồi
- `complaints:update` — Cập nhật trạng thái
- `complaints:close` — Đóng khiếu nại

**Chat**
- `chat:read` — Xem hội thoại
- `chat:reply` — Trả lời

**Content**
- `content:read` — Xem nội dung
- `content:create` — Tạo bài / thông báo
- `content:update` — Sửa nội dung
- `content:delete` — Xóa nội dung

**Sellers**
- `sellers:read` — Xem danh sách seller
- `sellers:approve` — Duyệt seller
- `sellers:update` — Sửa seller
- `sellers:delete` — Khóa seller

**Seller Products**
- `seller_products:read` — Xem sản phẩm seller
- `seller_products:update` — Duyệt / sửa
- `seller_products:delete` — Xóa

**Transactions**
- `transactions:read` — Xem giao dịch
- `audit_logs:read` — Xem audit log

---

## 4. Trình tự thực hiện

### Phase 3A: DB & Backend Foundation

**Step 1: Tạo schema mới**
```sql
-- Tạo bảng Module
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tạo bảng Permission
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id),
  code VARCHAR(64) UNIQUE NOT NULL,
  action VARCHAR(64),
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Cập nhật StaffPermission
ALTER TABLE staff_permissions 
ADD COLUMN permission_id UUID REFERENCES permissions(id);
-- Keep permission string for backward compatibility
```

**Step 2: Tạo constants & seeds**
- Tạo `web/src/lib/constants/modules.ts`
- Tạo `web/prisma/seeds/permissions.seed.ts`
- Migration seed dữ liệu modules + permissions

**Step 3: Tạo services**
- `permission.service.ts`: `hasPermission()`, `getModulePermissions()`, `getStaffPermissions()`
- `module.service.ts`: `listModules()`, `getUserAccessibleModules()`

**Step 4: Tạo guard**
- `permission-guard.ts`: middleware check permission

### Phase 3B: Backend Route Protection

**Step 1: Audit routes**
- Liệt kê tất cả `/admin/*` routes
- Map mỗi route với permission cần thiết

**Step 2: Update route handlers**
- Thêm `requirePermission(session, "code")` vào mỗi handler
- Thêm permission check ở service layer

**Step 3: Tests**
- Unit tests: permission checking logic
- Integration tests: route + permission check

### Phase 3C: Frontend Navigation

**Step 1: API endpoint**
- `GET /api/admin/my-permissions` → trả user's modules + permissions

**Step 2: Helpers**
- Tạo `web/src/lib/utils/permissions.ts` với helpers
- `canAccessModule(permissions, module)`
- `canRead(permissions, module)`
- `canCreate(permissions, module)`
- etc.

**Step 3: Menu component**
- Update `AdminMenu.tsx` → check permission hiển thị
- Update menu item route → redirect nếu không có access

**Step 4: Next.js middleware**
- Cập nhật `middleware.ts` → check permission → redirect `/403`

**Step 5: UI buttons**
- Ẩn button / action nếu user không có permission

### Phase 3D: Admin Staff Management

**Step 1: Trang staff**
- Tạo `/admin/staff` → danh sách nhân viên + quản lý quyền

**Step 2: UI permissions**
- Hiển thị permissions theo module
- Checkbox select
- Preset buttons (Chỉ xem / Biên tập / Toàn quyền)

**Step 3: API update**
- `PATCH /admin/staffs/{id}/permissions` → cập nhật quyền

**Step 4: Permission dependencies**
- Khi user check `products:create` → auto check `products:read`

### Phase 3E: Testing & Documentation

---

## 5. Files structure cần tạo

```
web/
├── prisma/
│   ├── schema.prisma (update)
│   ├── migrations/
│   │   └── <date>_add_permissions_and_modules/ (new)
│   └── seeds/
│       └── permissions.seed.ts (new)
├── src/
│   ├── lib/
│   │   ├── auth/
│   │   │   └── permission-guard.ts (new)
│   │   ├── constants/
│   │   │   ├── modules.ts (new)
│   │   │   └── staff-permissions.ts (keep for reference)
│   │   ├── services/
│   │   │   ├── permission.service.ts (new)
│   │   │   ├── module.service.ts (new)
│   │   │   └── staff.service.ts (new)
│   │   └── utils/
│   │       └── permissions.ts (new)
│   ├── app/
│   │   ├── api/
│   │   │   └── admin/
│   │   │       ├── permissions/route.ts (new)
│   │   │       ├── my-permissions/route.ts (new)
│   │   │       └── staffs/{id}/permissions/route.ts (new)
│   │   └── (admin)/
│   │       └── admin/
│   │           ├── staff/page.tsx (new)
│   │           └── staff/_components/
│   │               ├── StaffList.tsx (new)
│   │               ├── StaffPermissionsForm.tsx (new)
│   │               └── PermissionCheckbox.tsx (new)
│   └── middleware.ts (update)
```

---

## 6. Checklist theo phase

### Phase 3A — Database & Backend Foundation

- [ ] Thiết kế schema: Module, Permission, update StaffPermission
- [ ] Viết migration Prisma
- [ ] Tạo `modules.ts` constants
- [ ] Tạo `permission.service.ts`
- [ ] Tạo `module.service.ts`
- [ ] Tạo `permission-guard.ts`
- [ ] Viết unit tests
- [ ] Verify: `tsc --noEmit`

### Phase 3B — Backend Route Protection

- [ ] Audit: liệt kê tất cả `/admin/*` routes
- [ ] Map permissions → routes
- [ ] Update route handlers: add `requirePermission()`
- [ ] Update services: add permission checks
- [ ] Write integration tests
- [ ] Verify: `tsc --noEmit`, test suite pass

### Phase 3C — Frontend Navigation

- [ ] API endpoint: `GET /api/admin/my-permissions`
- [ ] Tạo `permissions.ts` helpers
- [ ] Update `AdminMenu.tsx`
- [ ] Update `middleware.ts`
- [ ] Update form fields / buttons
- [ ] Test: different staff roles
- [ ] Verify: no hydration errors

### Phase 3D — Admin Staff Management

- [ ] Tạo `/admin/staff` page
- [ ] UI: danh sách nhân viên
- [ ] UI: permission form (checkbox, preset)
- [ ] API: PATCH permissions endpoint
- [ ] Implement permission dependencies
- [ ] Test: add/remove permissions
- [ ] Verify: `tsc --noEmit`

### Phase 3E — Testing & Documentation

- [ ] E2E test: 10 staff scenarios
- [ ] Create permission matrix document
- [ ] Migration guide
- [ ] Update docs/.claude/rules/

---

## 7. Ghi chú quan trọng

### Backward Compatibility

- Giữ `permission` string field trong `StaffPermission` (migration safe)
- Tạo triggers hoặc service logic để sync `permission_id`

### Performance

- Index trên `(userId, permissionId)` trong `StaffPermission`
- Cache user permissions ở session (Auth.js)
- Sẽ gọi `getStaffPermissions()` mỗi request → consider caching

### Security

- Luôn check permission ở **backend** (không chỉ frontend)
- Route handler + service layer đều check
- Audit log mọi thay đổi permission (đã có `auditLog`)

### UI/UX

- Ẩn button thay vì disable (chỉ disable nếu UX yêu cầu)
- Tooltip: "Bạn không có quyền" khi hover disabled button
- Redirect 403 nếu truy cập route không có quyền

---

## 8. Timeline thực tế

| Phase | Tuần | Công việc chính | Days |
|-------|------|-----------------|------|
| 3A | 1-1.5 | DB, services, tests | 3-4 |
| 3B | 1.5-2 | Route protection, tests | 2-3 |
| 3C | 2-2.5 | Frontend menu, navigation | 2-3 |
| 3D | 2.5-3 | Admin staff UI | 2-3 |
| 3E | 3 | Testing, docs, QA | 2-3 |

**Total: ~2-3 tuần (phụ thuộc vào complexity + testing)**

---

## 9. Kết quả mong đợi sau Phase 3

✅ Hệ thống phân quyền nhân viên **thống nhất** (module + action)
✅ Hiển thị menu dựa trên **thực quyền**
✅ Kiểm tra permission ở **tất cả routes** (frontend + backend)
✅ Admin có thể **cấp/thu quyền dễ dàng** trong 1 giao diện
✅ **Không còn lệch quyền** giữa frontend/backend
✅ Dễ **mở rộng** khi thêm module/permission mới

---

## 10. Notes & Future Improvements

- [ ] Có thể thêm "role templates" (ví dụ: "Editor", "Viewer", "Approver")
- [ ] Có thể thêm "permission groups" để bulk assign
- [ ] Có thể thêm "scheduled permissions" (quyền tạm thời)
- [ ] Có thể integrate với LDAP/AD nếu cần SSO
- [ ] Có thể thêm "audit trail" chi tiết cho mỗi permission change

---

**Last Updated:** 2026-06-20  
**Owner:** System Design  
**Status:** Planning
