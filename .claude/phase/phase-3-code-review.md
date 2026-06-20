# Code Review — Hệ thống phân quyền nhân viên hiện tại

**Date:** 2026-06-20  
**Status:** Phân tích hiện trạng  
**Mục tiêu:** Xác định các vấn đề cơn bản trước khi cải tổ

---

## 1. Cấu trúc DB hiện tại

### StaffPermission Table

```prisma
model StaffPermission {
  id         String @id @default(uuid()) @db.Uuid
  userId     String @map("user_id") @db.Uuid
  permission String @db.VarChar(64)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, permission])
  @@index([userId])
  @@map("staff_permissions")
}
```

**Vấn đề:**
- ❌ Không có bảng `Permission` để quản lý (chỉ lưu string)
- ❌ Không có bảng `Module` để tổ chức
- ❌ Khó mở rộng: thêm permission mới phải deploy code
- ❌ Không có thông tin metadata (label, description, icon)
- ⚠️ Không có `is_active` flag → không thể disable permission mà không delete

---

## 2. Constants Structure (staff-permissions.ts)

### Hiện tại

```typescript
export type StaffPermissionKey =
  | "users:read"    | "users:create"    | "users:update"    | "users:delete"
  | "orders:read"   | "orders:update"   | "orders:delete"
  | "products:read" | "products:create" | "products:update" | "products:delete"
  | "finance:read"  | "finance:approve" | "finance:reject"
  | "content:read"  | "content:create"  | "content:update"  | "content:delete";

export const STAFF_PERMISSION_GROUPS: StaffPermissionGroup[] = [
  {
    key: "users",
    label: "Quản lý User",
    actions: [
      { key: "users:read",   label: "Xem danh sách", type: "read" },
      { key: "users:create", label: "Tạo tài khoản", type: "create" },
      // ...
    ],
  },
  // ...
];
```

**Vấn đề:**
- ❌ Hardcoded const → muốn thêm permission phải compile lại
- ❌ Không có unique constraint validation
- ⚠️ UI phải import constants → frontend coupling với backend structure
- ❌ Không có permission "meta" (ví dụ: "yêu cầu read trước")

**Tốt:**
- ✅ Clear structure với `STAFF_PERMISSION_GROUPS`
- ✅ Có color/styling metadata
- ✅ Type-safe `StaffPermissionKey`

---

## 3. Service Layer (staff-permission.service.ts)

### Hiện tại

```typescript
export async function listStaffMembers(): Promise<StaffMember[]> {
  const rows = await prisma.user.findMany({
    where: { role: "STAFF", deletedAt: null },
    select: { staffPermissions: { select: { permission: true } } },
  });
  return rows.map((r) => ({
    permissions: r.staffPermissions.map((p) => p.permission as StaffPermissionKey),
  }));
}

export async function hasStaffPermission(userId: string, permission: string): Promise<boolean> {
  const row = await prisma.staffPermission.findUnique({
    where: { userId_permission: { userId, permission } },
  });
  return !!row;
}
```

**Vấn đề:**
- ❌ `hasStaffPermission()` yêu cầu `findUnique` → không có nếu permission string không chính xác
- ❌ Không có hàm check permission theo module (ví dụ: `canAccessModule()`)
- ❌ Không có hàm lấy permissions với metadata (label, description)
- ⚠️ Query mỗi lần không cache → performance issue nếu check nhiều lần

**Tốt:**
- ✅ Clear transaction khi update permissions
- ✅ Có audit log

---

## 4. API Layer (staff-permissions/route.ts)

### Hiện tại

```typescript
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  requireAdmin(session);
  const members = await listStaffMembers();
  return apiOk(members);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const me = requireAdmin(session);
  const body: unknown = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);
  await setStaffPermissions(parsed.data.userId, parsed.data.permissions, me.id);
  return apiOk({ updated: true });
}
```

**Vấn đề:**
- ❌ Chỉ có 1 endpoint → không thể get permission của 1 user cụ thể
- ❌ Không có endpoint để list tất cả permissions (cho frontend show)
- ❌ Không có endpoint để get current user's permissions
- ❌ Response không chứa metadata permission (label, description)

**Tốt:**
- ✅ Kiểm tra quyền: `requireAdmin()`
- ✅ Validate input: `safeParse()`
- ✅ Có audit log

---

## 5. Route Protection — MISSING

### Hiện tại

**❌ Không kiểm tra permission ở bất kỳ route nào**

Ví dụ: `/api/admin/products` không check `products:read`

```typescript
// web/src/app/api/admin/products/route.ts
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);  // ← Chỉ check role, không check permission!
    
    const products = await prisma.service.findMany();
    return apiOk(products);
  } catch (err) {
    return apiCatch(err);
  }
}
```

**Vấn đề:**
- ❌ Tất cả admin routes chỉ check role `ADMIN` — không check permission
- ❌ STAFF role không thể access được route nào (không có role = STAFF)
- ❌ Permission constants toàn bộ không được sử dụng!
- ❌ Không có guard/middleware để enforce permission

---

## 6. Frontend Navigation — MISSING

### Hiện tại

**❌ Không hiển thị menu dựa trên permission**

Ví dụ: Menu admin không check user có quyền hay không

```typescript
// web/src/components/layout/AdminMenu.tsx
export function AdminMenu() {
  return (
    <nav>
      <Link href="/admin/products">Sản phẩm</Link>
      <Link href="/admin/orders">Đơn hàng</Link>
      <Link href="/admin/finance">Tài chính</Link>
      {/* Toàn bộ menu được hiển thị cho MỌI admin/staff */}
    </nav>
  );
}
```

**Vấn đề:**
- ❌ Menu không check permission → hiển thị tất cả cho mọi admin
- ❌ Không có cách để staff biết mình có quyền gì
- ❌ User vào được route mà không check permission

---

## 7. Session / Auth Type — GẠO

### Hiện tại

```typescript
export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;  // USER | SELLER | STAFF | ADMIN
  status: AccountStatus;
  sellerStatus: SellerStatus;
};
```

**Vấn đề:**
- ❌ Không có `permissions: string[]` trong session
- ❌ Mỗi lần check permission phải query DB (không cache)
- ❌ Không có `modules: string[]` để biết user có access module nào

**Cần làm:**
- 🔧 Thêm `permissions: string[]` vào session (cache)
- 🔧 Thêm `modules: string[]` vào session (cache)

---

## 8. Missing Infrastructure

### Guard/Middleware

```typescript
// ❌ MISSING: web/src/lib/auth/permission-guard.ts

export function requirePermission(session: Session | null, permission: string) {
  // Check if user has permission
  // Throw if not
}
```

### Helpers

```typescript
// ❌ MISSING: web/src/lib/utils/permissions.ts

export function canAccessModule(permissions: string[], module: string): boolean {
  // Check if user can access module
}

export function canRead(permissions: string[], module: string): boolean {
  // Check if user can read module
}
```

### Services

```typescript
// ❌ MISSING: web/src/lib/services/permission.service.ts
// ❌ MISSING: web/src/lib/services/module.service.ts
```

---

## 9. Mapping: Routes ↔ Permissions

### Current State

| Route | Current Check | Needed Check |
|-------|---------------|--------------|
| `/admin/users` | `requireAdmin()` | `users:read` |
| `POST /admin/users` | `requireAdmin()` | `users:create` |
| `PATCH /admin/users/{id}` | `requireAdmin()` | `users:update` |
| `DELETE /admin/users/{id}` | `requireAdmin()` | `users:delete` |
| `/admin/products` | `requireAdmin()` | `products:read` |
| `POST /admin/products` | `requireAdmin()` | `products:create` |
| `PATCH /admin/products/{id}` | `requireAdmin()` | `products:update` |
| `DELETE /admin/products/{id}` | `requireAdmin()` | `products:delete` |
| `/admin/orders` | `requireAdmin()` | `orders:read` |
| `PATCH /admin/orders/{id}` | `requireAdmin()` | `orders:update` |
| `DELETE /admin/orders/{id}` | `requireAdmin()` | `orders:delete` |

**Result:** Tất cả routes chỉ check role = ADMIN, không check permission!

---

## 10. STAFF Role — Hiện Tại Không Được Dùng

### Hiện tại

```typescript
export const ROLE_LEVELS: Record<Role, number> = {
  USER: 0,
  SELLER: 1,
  STAFF: 2,
  ADMIN: 3,
};

export function requireStaff(session: Session | null): AuthenticatedUser {
  return assertRole(session, "STAFF");
}
```

**Vấn đề:**
- ❌ `requireStaff()` check level >= 2 (STAFF or ADMIN)
- ❌ Nhưng không có route nào dùng `requireStaff()`
- ❌ Tất cả routes yêu cầu `requireAdmin()` (level >= 3)
- ❌ STAFF không thể access route nào

**Cần làm:**
- 🔧 Thay toàn bộ `requireAdmin()` → `requireStaff()` + `requirePermission()`

---

## 11. Phân tích Chi Tiết: Vòng tròn Lỗi

### Tình huống hiện tại:

1. **Admin tạo STAFF user** → set role = STAFF
2. **Admin cấp permission** → `users:create` vào `staff_permissions` table
3. **STAFF truy cập** `/admin/users` 
   - Route check: `requireAdmin()` → FAIL (role = STAFF < ADMIN)
   - STAFF không thể vào

4. **Nếu admin thay bằng `requireStaff()`:**
   - Route check: `requireStaff()` → OK (role = STAFF ≥ STAFF)
   - Nhưng không check permission `users:create`
   - STAFF có thể vào nhưng không được tạo user

### Giải pháp:

```typescript
// Route handler
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const user = requireStaff(session);  // ← Check role >= STAFF
  
  requirePermission(user, "users:create");  // ← Check permission
  
  // Business logic
}
```

---

## 12. Summary: Vấn Đề Chính

### 🔴 Critical Issues

1. **Permissions không được enforce ở backend**
   - Routes chỉ check role (ADMIN), không check permission (users:create)
   - STAFF role không thể dùng được

2. **Không có cơ chế hiển thị menu dựa trên permission**
   - Frontend hiển thị toàn bộ menu → không biết có quyền hay không

3. **Permission logic hoàn toàn là constants**
   - Thêm permission phải compile lại code
   - Không thể dynamic enable/disable permission

### 🟡 Major Issues

4. **Session không cache permissions**
   - Mỗi request check permission phải query DB

5. **Không có metadata permission**
   - Không biết permission phụ thuộc gì (ví dụ: create cần read)
   - Không có label/description

6. **Chỉ có 1 API endpoint**
   - Không thể get permission của 1 user
   - Không thể get current user's permissions
   - Response không có metadata

### 🟠 Minor Issues

7. **Service layer không check permission**
   - Chỉ check ở route handler
   - Có thể bypass nếu gọi service trực tiếp

8. **Không có tests**
   - Không có unit tests cho permission logic
   - Không có integration tests cho route protection

---

## 13. Ưu Tiên Fix

### Để bắt đầu Phase 3:

**Mức độ 1 (Bắt buộc):**
- [ ] Tạo `Permission` + `Module` table trong DB
- [ ] Tạo service layer: `permission.service.ts`, `module.service.ts`
- [ ] Update routes: thay `requireAdmin()` → `requireStaff() + requirePermission()`
- [ ] Tests: permission checking logic

**Mức độ 2 (Quan trọng):**
- [ ] Cache permissions trong session
- [ ] API endpoints: get user's permissions, get all modules
- [ ] Frontend helpers: `canAccessModule()`, `canRead()`, etc.
- [ ] Update menu: chỉ hiển thị nếu có permission

**Mức độ 3 (Cải thiện):**
- [ ] UI quản lý permission (trang /admin/staff)
- [ ] Permission dependencies (create auto-enable read)
- [ ] Audit trail chi tiết
- [ ] Documentation

---

## 14. Code Changes Timeline

### Immediate (Today)

```bash
# Đã hoàn thành:
✅ Tạo phase-3-staff-permissions.md
✅ Tạo phase-3-code-review.md

# Chuẩn bị làm:
⏳ Audit toàn bộ admin routes → map permission
⏳ Tạo schema migration: Module + Permission + update StaffPermission
⏳ Tạo constants: modules.ts
```

### Phase 3A (Week 1-1.5)

```bash
pnpm prisma migrate dev --name add_permission_and_module_tables
pnpm prisma generate
pnpm test -- permission.service.spec.ts
```

### Phase 3B (Week 1.5-2)

```bash
# Update tất cả routes: add requirePermission()
# Run integration tests
pnpm test -- admin-routes.integration.spec.ts
```

### Phase 3C (Week 2-2.5)

```bash
# Update frontend menu
# Update middleware
# Run E2E tests
pnpm playwright test
```

---

**Next Step:** Bắt đầu Phase 3A  
**Date:** 2026-06-20
