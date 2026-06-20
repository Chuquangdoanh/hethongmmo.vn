# Phase 3A — Database & Backend Foundation — Checklist Thực Tế

**Status:** Ready to start  
**Target Date:** 3-4 ngày  
**Owner:** Backend team  

---

## Sprint 1: Database Schema (Day 1)

### ✅ Task 1.1: Audit hiện tại (0.5 ngày)

**Mục tiêu:** Hiểu rõ cấu trúc DB và code hiện tại

**Công việc:**
- [ ] Read: `web/prisma/schema.prisma` — hiểu `StaffPermission` model
- [ ] Read: `web/src/lib/constants/staff-permissions.ts` — hiểu permission structure
- [ ] Read: `web/src/lib/services/staff-permission.service.ts` — hiểu logic hiện tại
- [ ] List toàn bộ admin routes: `grep -r "api/admin" web/src/app/api/`
- [ ] Create file: `web/src/lib/constants/admin-routes.mapping.ts` — map routes → permissions

**Output:**
- [ ] File: `admin-routes.mapping.ts` với mapping đầy đủ

---

### ✅ Task 1.2: Tạo migration Prisma (1 ngày)

**Mục tiêu:** Tạo bảng `Module` + `Permission` + update `StaffPermission`

**Files cần tạo:**
- [ ] `web/prisma/schema.prisma` — update

**Schema đề xuất:**

```prisma
// ====================================================================
// MODULES & PERMISSIONS
// ====================================================================

model Module {
  id          String      @id @default(uuid()) @db.Uuid
  code        String      @unique @db.VarChar(64)
  label       String      @db.VarChar(255)
  icon        String?     @db.VarChar(255)
  description String?
  sortOrder   Int         @default(0) @map("sort_order")
  isActive    Boolean     @default(true) @map("is_active")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  permissions Permission[]

  @@index([code])
  @@index([sortOrder])
  @@map("modules")
}

model Permission {
  id          String      @id @default(uuid()) @db.Uuid
  moduleId    String      @map("module_id") @db.Uuid
  module      Module      @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  code        String      @unique @db.VarChar(64)
  action      String?     @db.VarChar(64)  // read, create, update, delete, approve, reject
  label       String      @db.VarChar(255)
  description String?
  sortOrder   Int         @default(0) @map("sort_order")
  isActive    Boolean     @default(true) @map("is_active")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  staffPermissions StaffPermission[]

  @@unique([moduleId, action])
  @@index([moduleId])
  @@index([code])
  @@index([isActive])
  @@map("permissions")
}

model StaffPermission {
  id           String      @id @default(uuid()) @db.Uuid
  userId       String      @map("user_id") @db.Uuid
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  permissionId String      @map("permission_id") @db.Uuid
  permission   Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  // Keep for backward compatibility during migration
  permissionCode String?   @map("permission_code") @db.VarChar(64)
  
  createdAt    DateTime    @default(now()) @map("created_at")

  @@unique([userId, permissionId])
  @@index([userId])
  @@index([permissionId])
  @@map("staff_permissions")
}
```

**Công việc:**
- [ ] Update `web/prisma/schema.prisma` — thêm `Module` + `Permission` models
- [ ] Update `StaffPermission` model — thêm `permissionId` FK
- [ ] Tạo migration: `pnpm prisma migrate dev --name add_module_and_permission_tables`
- [ ] Verify schema compile: `pnpm prisma generate`

**Xác nhận:**
- [ ] `web/node_modules/.prisma/client` được generate
- [ ] Không có TypeScript errors

---

### ✅ Task 1.3: Tạo constants modules (0.5 ngày)

**Mục tiêu:** Define toàn bộ modules + permissions dưới dạng constants (dùng để seed)

**File cần tạo:** `web/src/lib/constants/modules.ts`

**Nội dung:**

```typescript
// web/src/lib/constants/modules.ts

export type PermissionCode =
  | "dashboard:read"
  | "users:read" | "users:create" | "users:update" | "users:delete"
  | "orders:read" | "orders:update" | "orders:delete"
  | "products:read" | "products:create" | "products:update" | "products:delete"
  | "categories:read" | "categories:create" | "categories:update" | "categories:delete"
  | "finance:read" | "finance:approve" | "finance:reject"
  | "complaints:read" | "complaints:reply" | "complaints:update" | "complaints:close"
  | "chat:read" | "chat:reply"
  | "content:read" | "content:create" | "content:update" | "content:delete"
  | "sellers:read" | "sellers:approve" | "sellers:update" | "sellers:delete"
  | "seller_products:read" | "seller_products:update" | "seller_products:delete"
  | "transactions:read" | "audit_logs:read";

export interface ModuleConfig {
  code: string;
  label: string;
  icon?: string;
  description?: string;
  sortOrder: number;
}

export interface PermissionConfig {
  code: PermissionCode;
  module: string;
  action: string;
  label: string;
  description?: string;
  sortOrder: number;
}

export const MODULES: ModuleConfig[] = [
  { code: "dashboard", label: "Dashboard", icon: "dashboard", sortOrder: 0 },
  { code: "users", label: "Quản lý User", icon: "users", sortOrder: 1 },
  { code: "orders", label: "Đơn hàng", icon: "orders", sortOrder: 2 },
  { code: "products", label: "Sản phẩm / Dịch vụ", icon: "products", sortOrder: 3 },
  { code: "categories", label: "Danh mục", icon: "categories", sortOrder: 4 },
  { code: "finance", label: "Tài chính", icon: "finance", sortOrder: 5 },
  { code: "complaints", label: "Khiếu nại", icon: "complaints", sortOrder: 6 },
  { code: "chat", label: "Trò chuyện", icon: "chat", sortOrder: 7 },
  { code: "content", label: "Nội dung & Thông báo", icon: "content", sortOrder: 8 },
  { code: "sellers", label: "Quản lý Seller", icon: "sellers", sortOrder: 9 },
  { code: "seller_products", label: "Sản phẩm Seller", icon: "seller_products", sortOrder: 10 },
  { code: "transactions", label: "Giao dịch & Logs", icon: "transactions", sortOrder: 11 },
];

export const PERMISSIONS: PermissionConfig[] = [
  // Dashboard
  { code: "dashboard:read", module: "dashboard", action: "read", label: "Xem dashboard", sortOrder: 0 },
  
  // Users
  { code: "users:read", module: "users", action: "read", label: "Xem danh sách user", sortOrder: 0 },
  { code: "users:create", module: "users", action: "create", label: "Tạo tài khoản", sortOrder: 1 },
  { code: "users:update", module: "users", action: "update", label: "Sửa thông tin user", sortOrder: 2 },
  { code: "users:delete", module: "users", action: "delete", label: "Xóa / khóa user", sortOrder: 3 },
  
  // Orders
  { code: "orders:read", module: "orders", action: "read", label: "Xem đơn hàng", sortOrder: 0 },
  { code: "orders:update", module: "orders", action: "update", label: "Cập nhật trạng thái đơn", sortOrder: 1 },
  { code: "orders:delete", module: "orders", action: "delete", label: "Hủy / xóa đơn", sortOrder: 2 },
  
  // Products
  { code: "products:read", module: "products", action: "read", label: "Xem sản phẩm / dịch vụ", sortOrder: 0 },
  { code: "products:create", module: "products", action: "create", label: "Thêm sản phẩm", sortOrder: 1 },
  { code: "products:update", module: "products", action: "update", label: "Sửa sản phẩm", sortOrder: 2 },
  { code: "products:delete", module: "products", action: "delete", label: "Xóa sản phẩm", sortOrder: 3 },
  
  // Categories
  { code: "categories:read", module: "categories", action: "read", label: "Xem danh mục", sortOrder: 0 },
  { code: "categories:create", module: "categories", action: "create", label: "Thêm danh mục", sortOrder: 1 },
  { code: "categories:update", module: "categories", action: "update", label: "Sửa danh mục", sortOrder: 2 },
  { code: "categories:delete", module: "categories", action: "delete", label: "Xóa danh mục", sortOrder: 3 },
  
  // Finance
  { code: "finance:read", module: "finance", action: "read", label: "Xem nạp / rút tiền", sortOrder: 0 },
  { code: "finance:approve", module: "finance", action: "approve", label: "Duyệt giao dịch", sortOrder: 1 },
  { code: "finance:reject", module: "finance", action: "reject", label: "Từ chối giao dịch", sortOrder: 2 },
  
  // Complaints
  { code: "complaints:read", module: "complaints", action: "read", label: "Xem khiếu nại", sortOrder: 0 },
  { code: "complaints:reply", module: "complaints", action: "reply", label: "Phản hồi khiếu nại", sortOrder: 1 },
  { code: "complaints:update", module: "complaints", action: "update", label: "Cập nhật trạng thái", sortOrder: 2 },
  { code: "complaints:close", module: "complaints", action: "close", label: "Đóng khiếu nại", sortOrder: 3 },
  
  // Chat
  { code: "chat:read", module: "chat", action: "read", label: "Xem hội thoại", sortOrder: 0 },
  { code: "chat:reply", module: "chat", action: "reply", label: "Trả lời hội thoại", sortOrder: 1 },
  
  // Content
  { code: "content:read", module: "content", action: "read", label: "Xem nội dung / thông báo", sortOrder: 0 },
  { code: "content:create", module: "content", action: "create", label: "Tạo bài / thông báo", sortOrder: 1 },
  { code: "content:update", module: "content", action: "update", label: "Sửa nội dung", sortOrder: 2 },
  { code: "content:delete", module: "content", action: "delete", label: "Xóa nội dung", sortOrder: 3 },
  
  // Sellers
  { code: "sellers:read", module: "sellers", action: "read", label: "Xem danh sách seller", sortOrder: 0 },
  { code: "sellers:approve", module: "sellers", action: "approve", label: "Duyệt seller", sortOrder: 1 },
  { code: "sellers:update", module: "sellers", action: "update", label: "Sửa thông tin seller", sortOrder: 2 },
  { code: "sellers:delete", module: "sellers", action: "delete", label: "Khóa / xóa seller", sortOrder: 3 },
  
  // Seller Products
  { code: "seller_products:read", module: "seller_products", action: "read", label: "Xem sản phẩm seller", sortOrder: 0 },
  { code: "seller_products:update", module: "seller_products", action: "update", label: "Duyệt / sửa sản phẩm", sortOrder: 1 },
  { code: "seller_products:delete", module: "seller_products", action: "delete", label: "Xóa sản phẩm seller", sortOrder: 2 },
  
  // Transactions
  { code: "transactions:read", module: "transactions", action: "read", label: "Xem lịch sử giao dịch", sortOrder: 0 },
  { code: "audit_logs:read", module: "transactions", action: "read", label: "Xem audit log", sortOrder: 1 },
];

export const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

// Helper: lấy permissions của 1 module
export function getPermissionsByModule(moduleCode: string): PermissionConfig[] {
  return PERMISSIONS.filter((p) => p.module === moduleCode);
}
```

**Công việc:**
- [ ] Tạo file `web/src/lib/constants/modules.ts`
- [ ] Copy nội dung constants từ trên
- [ ] Verify: TypeScript compile `pnpm tsc --noEmit`

---

## Sprint 2: Services & Guards (Day 2)

### ✅ Task 2.1: Tạo permission service (0.5 ngày)

**File:** `web/src/lib/services/permission.service.ts`

**Nội dung:**

```typescript
import { prisma } from "@/lib/db/prisma";
import type { Permission, Module } from "@prisma/client";

export async function getPermission(code: string): Promise<Permission | null> {
  return prisma.permission.findUnique({ where: { code } });
}

export async function getPermissionById(id: string): Promise<Permission | null> {
  return prisma.permission.findUnique({ where: { id } });
}

export async function listPermissions(moduleId?: string): Promise<Permission[]> {
  return prisma.permission.findMany({
    where: { isActive: true, ...(moduleId && { moduleId }) },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listPermissionsByModule(moduleCode: string): Promise<Permission[]> {
  return prisma.permission.findMany({
    where: { isActive: true, module: { code: moduleCode } },
    include: { module: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const rows = await prisma.staffPermission.findMany({
    where: { userId, permission: { isActive: true } },
    select: { permission: { select: { code: true } } },
  });
  return rows.map((r) => r.permission.code);
}

export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const perm = await prisma.permission.findUnique({ where: { code: permissionCode } });
  if (!perm) return false;

  const staffPerm = await prisma.staffPermission.findUnique({
    where: { userId_permissionId: { userId, permissionId: perm.id } },
  });
  return !!staffPerm;
}

export async function hasAnyPermissionInModule(userId: string, moduleCode: string): Promise<boolean> {
  const perms = await prisma.permission.findMany({
    where: { module: { code: moduleCode }, isActive: true },
    select: { id: true },
  });

  if (perms.length === 0) return false;

  const staffPerms = await prisma.staffPermission.findMany({
    where: { userId, permissionId: { in: perms.map((p) => p.id) } },
    select: { id: true },
  });

  return staffPerms.length > 0;
}

export async function getUserAccessibleModules(userId: string): Promise<Module[]> {
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const result: Module[] = [];
  for (const mod of modules) {
    if (await hasAnyPermissionInModule(userId, mod.code)) {
      result.push(mod);
    }
  }
  return result;
}

export async function setUserPermissions(
  userId: string,
  permissionCodes: string[],
  actorId: string,
): Promise<void> {
  // Validate permissions exist
  const validPerms = await prisma.permission.findMany({
    where: { code: { in: permissionCodes }, isActive: true },
    select: { id: true, code: true },
  });

  const validIds = validPerms.map((p) => p.id);

  // Transaction: delete old + create new + audit log
  await prisma.$transaction(async (tx) => {
    const before = await tx.staffPermission.findMany({
      where: { userId },
      select: { permission: { select: { code: true } } },
    });

    await tx.staffPermission.deleteMany({ where: { userId } });

    if (validIds.length > 0) {
      await tx.staffPermission.createMany({
        data: validIds.map((permissionId) => ({ userId, permissionId })),
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "UPDATE_STAFF_PERMISSIONS",
        targetType: "User",
        targetId: userId,
        before: { permissions: before.map((b) => b.permission.code) },
        after: { permissions: validPerms.map((p) => p.code) },
      },
    });
  });
}
```

**Công việc:**
- [ ] Tạo file `web/src/lib/services/permission.service.ts`
- [ ] Copy nội dung từ trên
- [ ] Verify: `pnpm tsc --noEmit`

---

### ✅ Task 2.2: Tạo module service (0.5 ngày)

**File:** `web/src/lib/services/module.service.ts`

**Nội dung:**

```typescript
import { prisma } from "@/lib/db/prisma";
import type { Module } from "@prisma/client";

export async function getModule(code: string): Promise<Module | null> {
  return prisma.module.findUnique({ where: { code } });
}

export async function listModules(): Promise<Module[]> {
  return prisma.module.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getModuleWithPermissions(code: string) {
  return prisma.module.findUnique({
    where: { code },
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function listModulesWithPermissions() {
  return prisma.module.findMany({
    where: { isActive: true },
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}
```

**Công việc:**
- [ ] Tạo file `web/src/lib/services/module.service.ts`
- [ ] Copy nội dung từ trên
- [ ] Verify: `pnpm tsc --noEmit`

---

### ✅ Task 2.3: Tạo permission guard (0.5 ngày)

**File:** `web/src/lib/auth/permission-guard.ts`

**Nội dung:**

```typescript
import type { Session } from "next-auth";
import { AppAuthError } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/services/permission.service";

export async function requirePermission(
  session: Session | null,
  permissionCode: string,
) {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  const hasAccess = await hasPermission(session.user.id, permissionCode);
  if (!hasAccess) {
    throw new AppAuthError(
      `Bạn không có quyền: ${permissionCode}`,
      "PERMISSION_DENIED",
      403,
    );
  }
}

export async function requireAnyPermissionInModule(
  session: Session | null,
  moduleCode: string,
) {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  const { hasAnyPermissionInModule } = await import("@/lib/services/permission.service");
  const hasAccess = await hasAnyPermissionInModule(session.user.id, moduleCode);
  if (!hasAccess) {
    throw new AppAuthError(
      `Bạn không có quyền truy cập module: ${moduleCode}`,
      "MODULE_ACCESS_DENIED",
      403,
    );
  }
}
```

**Công việc:**
- [ ] Tạo file `web/src/lib/auth/permission-guard.ts`
- [ ] Copy nội dung từ trên
- [ ] Verify: `pnpm tsc --noEmit`

---

## Sprint 3: Seed Data & Tests (Day 3)

### ✅ Task 3.1: Tạo seed script (0.5 ngày)

**File:** `web/prisma/seeds/permissions.seed.ts`

**Nội dung:**

```typescript
import { PrismaClient } from "@prisma/client";
import { MODULES, PERMISSIONS } from "@/lib/constants/modules";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding modules and permissions...");

  // Create modules
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: { label: mod.label, icon: mod.icon, sortOrder: mod.sortOrder },
      create: { code: mod.code, label: mod.label, icon: mod.icon, sortOrder: mod.sortOrder },
    });
  }

  console.log("✅ Modules created");

  // Create permissions
  for (const perm of PERMISSIONS) {
    const module = await prisma.module.findUnique({ where: { code: perm.module } });
    if (!module) {
      console.warn(`⚠️ Module not found: ${perm.module}`);
      continue;
    }

    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        label: perm.label,
        action: perm.action,
        description: perm.description,
        sortOrder: perm.sortOrder,
      },
      create: {
        code: perm.code,
        moduleId: module.id,
        label: perm.label,
        action: perm.action,
        description: perm.description,
        sortOrder: perm.sortOrder,
      },
    });
  }

  console.log("✅ Permissions created");
  console.log("🎉 Seed completed");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Công việc:**
- [ ] Tạo file `web/prisma/seeds/permissions.seed.ts`
- [ ] Thêm vào `package.json` script: `"seed": "tsx prisma/seeds/permissions.seed.ts"`
- [ ] Run: `cd web && pnpm seed`
- [ ] Verify dữ liệu được tạo trong DB

---

### ✅ Task 3.2: Tạo unit tests (1 ngày)

**File:** `web/src/lib/services/__tests__/permission.service.spec.ts`

**Nội dung:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  hasPermission,
  hasAnyPermissionInModule,
  getUserPermissions,
  setUserPermissions,
} from "@/lib/services/permission.service";

describe("permission.service", () => {
  let testUserId: string;
  let testPermissionId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        fullName: "Test User",
        role: "STAFF",
        passwordHash: "test",
        uidPrefix: "test1234",
      },
    });
    testUserId = user.id;

    // Get a test permission
    const perm = await prisma.permission.findFirst();
    if (perm) {
      testPermissionId = perm.id;
    }
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it("should grant permission to user", async () => {
    await setUserPermissions(testUserId, ["users:read"], "admin-id");

    const hasAccess = await hasPermission(testUserId, "users:read");
    expect(hasAccess).toBe(true);
  });

  it("should revoke permission from user", async () => {
    await setUserPermissions(testUserId, [], "admin-id");

    const hasAccess = await hasPermission(testUserId, "users:read");
    expect(hasAccess).toBe(false);
  });

  it("should check permission in module", async () => {
    await setUserPermissions(testUserId, ["products:read", "products:create"], "admin-id");

    const hasAccess = await hasAnyPermissionInModule(testUserId, "products");
    expect(hasAccess).toBe(true);
  });

  it("should return user permissions", async () => {
    await setUserPermissions(testUserId, ["users:read", "orders:read"], "admin-id");

    const perms = await getUserPermissions(testUserId);
    expect(perms).toContain("users:read");
    expect(perms).toContain("orders:read");
    expect(perms.length).toBe(2);
  });
});
```

**Công việc:**
- [ ] Tạo file `web/src/lib/services/__tests__/permission.service.spec.ts`
- [ ] Run: `pnpm test -- permission.service.spec.ts`
- [ ] Xác nhận tất cả tests pass

---

### ✅ Task 3.3: Tạo integration test cho routes (0.5 ngày)

**File:** `web/src/__tests__/integration/admin-routes.spec.ts`

**Nội dung:**

```typescript
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/prisma";

describe("Admin Routes Permission", () => {
  it("should deny access to /admin/products without permission", async () => {
    // Create a STAFF user without products:read permission
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        fullName: "Test Staff",
        role: "STAFF",
        passwordHash: "test",
        uidPrefix: "test1234",
      },
    });

    // Try to access /admin/products
    // Should get 403 or redirect to /403

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("should allow access to /admin/products with permission", async () => {
    // Create a STAFF user WITH products:read permission
    // Try to access /admin/products
    // Should get 200
  });
});
```

**Công việc:**
- [ ] Tạo file `web/src/__tests__/integration/admin-routes.spec.ts`
- [ ] Write test cases
- [ ] Run: `pnpm test -- admin-routes.spec.ts`

---

## Sprint 4: Verification & Documentation (Day 3-4)

### ✅ Task 4.1: TypeScript Check

**Công việc:**
- [ ] Run: `cd web && pnpm tsc --noEmit`
- [ ] Verify: No errors
- [ ] If errors: fix immediately, don't skip

---

### ✅ Task 4.2: Database Verification

**Công việc:**
- [ ] Open Prisma Studio: `pnpm db:studio`
- [ ] Check `modules` table: 12 modules created
- [ ] Check `permissions` table: ~40+ permissions created
- [ ] Check `staff_permissions` table: seed successfully

---

### ✅ Task 4.3: Write Documentation

**File:** `web/PHASE_3A_SUMMARY.md`

**Mục tiêu:** Tổng hợp những gì đã làm, chuẩn bị cho phase 3B

**Nội dung:**
- [ ] Database schema changes
- [ ] New services: `permission.service.ts`, `module.service.ts`
- [ ] New guards: `permission-guard.ts`
- [ ] Permissions list (all codes)
- [ ] Next steps for Phase 3B

---

## Metrics & Acceptance Criteria

### Phase 3A Completion Criteria

- [ ] ✅ `Module` table có 12 records
- [ ] ✅ `Permission` table có ~40+ records
- [ ] ✅ `StaffPermission` có thể link đến `Permission` (FK)
- [ ] ✅ `permission.service.ts` có 8+ functions
- [ ] ✅ `module.service.ts` có 4+ functions
- [ ] ✅ `permission-guard.ts` hoạt động
- [ ] ✅ Unit tests: 4+ test cases, tất cả pass
- [ ] ✅ TypeScript: `pnpm tsc --noEmit` exit 0
- [ ] ✅ No warnings / errors

---

## Day-by-Day Breakdown

### Day 1 (Database Schema)

| Task | Time | Status |
|------|------|--------|
| 1.1 — Audit hiện tại | 0.5h | ⏳ |
| 1.2 — Migration Prisma | 4h | ⏳ |
| 1.3 — Constants modules | 2h | ⏳ |
| **Subtotal** | **6.5h** | |

### Day 2 (Services & Guards)

| Task | Time | Status |
|------|------|--------|
| 2.1 — Permission service | 3h | ⏳ |
| 2.2 — Module service | 2h | ⏳ |
| 2.3 — Permission guard | 2h | ⏳ |
| **Subtotal** | **7h** | |

### Day 3 (Seed & Tests)

| Task | Time | Status |
|------|------|--------|
| 3.1 — Seed script | 2h | ⏳ |
| 3.2 — Unit tests | 4h | ⏳ |
| 3.3 — Integration tests | 2h | ⏳ |
| **Subtotal** | **8h** | |

### Day 4 (Verification & Docs)

| Task | Time | Status |
|------|------|--------|
| 4.1 — TypeScript check | 0.5h | ⏳ |
| 4.2 — DB verification | 1h | ⏳ |
| 4.3 — Documentation | 2h | ⏳ |
| **Subtotal** | **3.5h** | |

**Total: ~24.5 hours (3-4 days full-time)**

---

## Notes

- ✅ Schema migration: Backward-compatible (giữ `permission` string field)
- ✅ Seed data: Idempotent (upsert, không insert duplicate)
- ✅ Tests: Isolated (tạo test data riêng, cleanup sau)
- ✅ TypeScript: Strict mode từ đầu

---

**Ready to start: Phase 3A — Database & Backend Foundation**

**Next Phase:** Phase 3B — Backend Route Protection (Day 5-6)
