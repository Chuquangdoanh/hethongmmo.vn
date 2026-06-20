# Phase 3 — Cải tổ Hệ thống Phân quyền Nhân viên (STAFF PERMISSIONS)

**Status:** 📋 Quy hoạch hoàn thành  
**Created:** 2026-06-20  
**Estimated Duration:** 2-3 tuần  
**Owner:** Backend Team

---

## 🎯 Mục tiêu Tổng Quát

Chuyển hệ thống phân quyền nhân viên từ **mô hình rời rạc** (phân quyền truy cập trang riêng + CRUD riêng) sang **mô hình thống nhất** (module + action duy nhất).

### Trước Cải tổ ❌

- Permission chỉ là constants string
- Routes chỉ check role (ADMIN), không check permission chi tiết
- Không có hiển thị menu dựa trên permission
- Thêm permission phải compile lại code
- Admin phải cấp quyền ở 2 nơi khác nhau
- Dễ bị lệch quyền giữa frontend/backend

### Sau Cải tổ ✅

- Permissions là entities trong DB → dễ manage
- Routes check cả role + permission chi tiết
- Menu hiển thị dựa trên thực quyền của user
- Thêm permission không cần compile
- Admin cấp quyền ở 1 giao diện duy nhất
- Không có lệch quyền

---

## 📊 Cấu trúc 5 Phase

```
Phase 3 — Staff Permissions
├── Phase 3A — Database & Backend Foundation (Week 1-1.5)
│   ├── Tạo Module + Permission tables
│   ├── Tạo permission services
│   ├── Tạo permission guards
│   └── Seed data + Tests
│
├── Phase 3B — Backend Route Protection (Week 1.5-2)
│   ├── Audit & map routes → permissions
│   ├── Update route handlers: add requirePermission()
│   ├── Update services: permission checks
│   └── Integration tests
│
├── Phase 3C — Frontend Navigation (Week 2-2.5)
│   ├── API: GET /admin/my-permissions
│   ├── Helpers: canAccessModule(), canRead(), etc.
│   ├── Menu: chỉ hiển thị nếu có permission
│   └── Next.js middleware: redirect nếu không có access
│
├── Phase 3D — Admin Staff Management UI (Week 2.5-3)
│   ├── Trang /admin/staff
│   ├── Quản lý permission form
│   ├── Preset: Chỉ xem / Biên tập / Toàn quyền
│   └── Permission dependencies
│
└── Phase 3E — Testing & Documentation (Week 3)
    ├── E2E tests: 10 staff scenarios
    ├── Permission matrix document
    └── Migration guide
```

---

## 📁 Files Tạo/Sửa

### Phase 3A (Priority 1 — Bắt đầu ngay)

```
✨ NEW FILES:
web/src/lib/constants/modules.ts
web/src/lib/services/permission.service.ts
web/src/lib/services/module.service.ts
web/src/lib/auth/permission-guard.ts
web/prisma/seeds/permissions.seed.ts
web/src/lib/services/__tests__/permission.service.spec.ts
web/src/__tests__/integration/admin-routes.spec.ts

🔄 MODIFIED FILES:
web/prisma/schema.prisma (add Module + Permission models)
web/package.json (add seed script)
```

### Phase 3B (Priority 2)

```
🔄 MODIFIED FILES (30+ files):
web/src/app/api/admin/users/route.ts
web/src/app/api/admin/products/route.ts
web/src/app/api/admin/orders/route.ts
web/src/app/api/admin/*/route.ts (tất cả)
web/src/lib/services/*.service.ts (add permission checks)

✨ NEW FILES:
web/src/lib/utils/admin-routes.mapping.ts
web/src/app/api/admin/permissions/route.ts (GET all permissions)
```

### Phase 3C (Priority 3)

```
✨ NEW FILES:
web/src/lib/utils/permissions.ts (helpers)
web/src/app/api/admin/my-permissions/route.ts

🔄 MODIFIED FILES:
web/src/middleware.ts (permission check)
web/src/components/layout/AdminMenu.tsx (conditional render)
web/src/app/(admin)/admin/**/*.tsx (buttons + conditional render)
```

### Phase 3D (Priority 4)

```
✨ NEW FILES:
web/src/app/(admin)/admin/staff/page.tsx
web/src/app/(admin)/admin/staff/_components/StaffList.tsx
web/src/app/(admin)/admin/staff/_components/StaffPermissionsForm.tsx
web/src/app/(admin)/admin/staff/_components/PermissionCheckbox.tsx
web/src/lib/services/staff.service.ts

✨ NEW API:
web/src/app/api/admin/staffs/{id}/permissions/route.ts
```

---

## 🚀 Bước Đầu: Phase 3A

### Quick Start

**Thời gian:** 3-4 ngày  
**Output:** Database schema + services + guards + tests

### Checklist Chi Tiết

📄 **File:** `web/phase/phase-3a-checklist.md`

**Day 1: Database Schema (6.5h)**
- [ ] Audit hiện tại: understand StaffPermission, constants, routes
- [ ] Migration: tạo Module + Permission tables
- [ ] Constants: tạo `modules.ts` với toàn bộ permission codes

**Day 2: Services & Guards (7h)**
- [ ] `permission.service.ts`: 8 functions (hasPermission, getUserPermissions, etc.)
- [ ] `module.service.ts`: 4 functions (listModules, getModuleWithPermissions)
- [ ] `permission-guard.ts`: requirePermission, requireAnyPermissionInModule

**Day 3: Seed & Tests (8h)**
- [ ] Seed script: populate 12 modules + ~40 permissions
- [ ] Unit tests: permission logic (4+ test cases)
- [ ] Integration tests: route protection (skeleton)

**Day 4: Verification (3.5h)**
- [ ] TypeScript: `pnpm tsc --noEmit` ✅
- [ ] Database: verify modules + permissions in DB
- [ ] Documentation: summarize Phase 3A

### Acceptance Criteria

- ✅ 12 modules created in DB
- ✅ ~40 permissions created in DB
- ✅ Services: 8+ functions for permission checking
- ✅ Tests: 4+ test cases, all pass
- ✅ TypeScript: 0 errors, 0 warnings
- ✅ Ready for Phase 3B

---

## 🔍 Phase Mapping: Permissions × Routes

### Example: Products Module

```
module: products
code: products
label: Sản phẩm / Dịch vụ

permissions:
  - products:read     → GET /admin/products
  - products:create   → POST /admin/products
  - products:update   → PATCH /admin/products/{id}
  - products:delete   → DELETE /admin/products/{id}

rule: User must have requireStaff() + requirePermission(code)
```

### Full Mapping

📄 **File:** `web/src/lib/utils/admin-routes.mapping.ts` (tạo ở Phase 3B)

---

## 🔐 Security Checklist (Bắt buộc)

- [ ] Backend always checks permission (frontend is UX only)
- [ ] Permission check at both:
  - Route handler layer
  - Service layer
- [ ] No permission hardcoded in frontend
- [ ] Audit log on every permission change
- [ ] Rate limit: permission check queries
- [ ] Session cache: permissions (not DB every time)

---

## 📈 Impact Assessment

### Performance

| Operation | Before | After | Note |
|-----------|--------|-------|------|
| Check permission | DB query | Session cache | Much faster |
| Add permission | Code deploy | DB insert | No downtime |
| Add module | Code deploy | DB insert | No downtime |
| Menu render | Check `requireAdmin()` | Query user modules | Slightly slower |

### Maintenance

| Task | Before | After | Improvement |
|------|--------|-------|-------------|
| Add permission | Update constants + code + routes | Insert 1 row | 10x easier |
| Check access | Manual in each route | Centralized guard | DRY principle |
| Audit trail | Manual logging | Auto via transaction | Always consistent |

### Developer Experience

| Aspect | Before | After |
|--------|--------|-------|
| Permission definition | String literal | Type-safe enum |
| Adding new permission | Compile + deploy | No deploy needed |
| Changing permission | Code review + deploy | DB transaction |
| Testing permission | Manual setup | Service + middleware |

---

## 🎓 Key Concepts

### Module

Logical group of related permissions. Example: `products` module groups `products:read`, `products:create`, etc.

```typescript
{
  code: "products",
  label: "Sản phẩm / Dịch vụ",
  icon: "products",
  sortOrder: 3,
}
```

### Permission

Specific action within a module.

```typescript
{
  code: "products:create",
  module: "products",
  action: "create",
  label: "Thêm sản phẩm",
  description: "Cho phép nhân viên thêm sản phẩm mới vào hệ thống",
}
```

### Permission Rule

User can access a module if they have **at least 1 permission** in that module.

```typescript
// User has products:create
// Therefore: canAccessModule(user, "products") = true
```

### Permission Dependency (Future)

Some permissions require others.

```typescript
// If user grants products:create
// System auto-grants products:read
```

---

## 🗺️ Timeline Realistic

| Phase | Duration | Start | End | Deliverable |
|-------|----------|-------|-----|-------------|
| 3A | 3-4 days | Week 1 | Week 1 | DB + services + guards |
| 3B | 2-3 days | Week 1 | Week 2 | Route protection |
| 3C | 2-3 days | Week 2 | Week 2 | Frontend navigation |
| 3D | 2-3 days | Week 2 | Week 3 | Admin UI |
| 3E | 2-3 days | Week 3 | Week 3 | Tests + docs |
| **Total** | **11-16 days** | | | |

**Realistic: 2-3 weeks (considering meetings, code review, debugging)**

---

## 📚 Documentation

### For Backend Developers

- `phase-3-code-review.md` — Current code issues + how to fix
- `phase-3a-checklist.md` — Step-by-step tasks for Phase 3A
- `phase-3-staff-permissions.md` — Architecture + detailed phase breakdown

### For Frontend Developers

- Phase 3C guide: helpers, API contract, menu logic (coming)
- Phase 3D guide: admin UI structure (coming)

### For QA/Testing

- Permission matrix: who can do what (coming)
- Test scenarios: 10+ staff configurations (coming)
- E2E test suite (Phase 3E)

### For Product/Admin

- Migration guide: existing permissions → new system (coming)
- Training: how to manage staff permissions (Phase 3D docs)

---

## ⚠️ Important Notes

### Backward Compatibility

- ✅ Existing `StaffPermission.permission` string field kept
- ✅ Service logic syncs old + new format
- ✅ No breaking changes to existing APIs (yet)

### Performance

- ⚠️ Initial: more DB queries (permission checks)
- ✅ Solution: cache permissions in session
- ✅ Solution: index on (userId, permissionId)

### Security

- 🔒 Always check at backend (frontend is cosmetic)
- 🔒 Audit log every permission change
- 🔒 Rate limit permission queries
- 🔒 Use `SELECT FOR UPDATE` if needed (future)

---

## 🎬 Getting Started

### Prerequisites

```bash
cd C:\Hethongmmo\web

# Verify environment
pnpm --version
pnpm tsc --noEmit
pnpm db:studio  # Ensure DB is accessible
```

### Start Phase 3A

1. **Read documentation** (30 min)
   - `phase-3-staff-permissions.md` — overview
   - `phase-3-code-review.md` — understand issues
   - `phase-3a-checklist.md` — detailed tasks

2. **Setup** (15 min)
   - Create branch: `git checkout -b feat/phase-3-staff-permissions`
   - Read CLAUDE.md rules again (security-focused)

3. **Begin work** (Day 1)
   - Task 1.1: Audit current code
   - Task 1.2: Schema migration
   - Task 1.3: Constants

### Review & Approval

Each phase should have:
- [ ] Code review (logic + security)
- [ ] Type check: `pnpm tsc --noEmit` ✅
- [ ] Tests pass: `pnpm test`
- [ ] Lint: `pnpm lint`
- [ ] Database verified: `pnpm db:studio`

---

## 🚨 Common Pitfalls to Avoid

1. ❌ Checking permission only in frontend
   - ✅ Always check in backend too

2. ❌ Forgetting to add tests
   - ✅ Write tests as you code

3. ❌ Not updating audit log
   - ✅ Transaction with audit log

4. ❌ Hardcoding permission strings in routes
   - ✅ Use `PermissionCode` type

5. ❌ Modifying existing constants
   - ✅ Keep `staff-permissions.ts` as reference only

6. ❌ Skipping migration on existing data
   - ✅ Use `upsert` to handle duplicates

---

## 📞 Questions & Support

### Phase Planning

Ask when:
- Understanding architecture
- Mapping permissions to routes
- Deciding permission dependencies

### Implementation

Ask when:
- TypeScript errors
- Database migration issues
- Tests failing
- Performance concerns

### After Phase

Track in:
- `completed-tasks.md` — done
- GitHub issues — bugs/improvements

---

## 🏁 Success Criteria (Final)

After all 5 phases:

✅ **Backend:**
- All admin routes check permission
- Services enforce permission
- No hardcoded permissions

✅ **Frontend:**
- Menu rendered based on permissions
- Buttons/actions check permission
- 403 redirect for unauthorized access

✅ **Admin UI:**
- 1 screen to manage staff permissions
- Preset templates
- Audit trail

✅ **Tests:**
- Unit tests: permission logic
- Integration tests: route + permission
- E2E tests: 10+ staff scenarios

✅ **Documentation:**
- Permission matrix
- Migration guide
- Developer guide

✅ **Security:**
- 0 permission bypasses
- All changes audited
- Type-safe permission codes

---

## 📋 File Links

- 📄 [Phase 3 — Staff Permissions (Overview)](./phase-3-staff-permissions.md)
- 📄 [Phase 3 — Code Review (Current State)](./phase-3-code-review.md)
- 📄 [Phase 3A — Checklist (Step by Step)](./phase-3a-checklist.md)

---

**Created:** 2026-06-20  
**Last Updated:** 2026-06-20  
**Next Review:** 2026-06-27  

**Status:** 🟢 Ready for Phase 3A
