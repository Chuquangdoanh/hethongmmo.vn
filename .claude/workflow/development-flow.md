# Development Flow — hethongmmo.vn

## Vòng lặp làm việc chuẩn

```
1. Nhận task
   ↓
2. Đọc file liên quan (đừng viết từ trí nhớ)
   ↓
3. Tìm abstraction đã có (xem .claude/rules/no-duplication.md)
   ↓
4. Viết code
   ↓
5. TypeScript check → sửa cho đến khi exit 0
   ↓
6. Smoke test thủ công
   ↓
7. Commit
```

## Quy trình thêm tính năng mới

### Bước 1 — Xác định vị trí
```
Tính năng mới thuộc layer nào?
├── lib/services/     → Business logic (tiền, order, OTP)
├── lib/auth/         → Auth, RBAC
├── app/api/          → Route handlers (HTTP boundary)
├── app/(public)/     → Public pages (không cần auth)
├── app/(user)/       → User-facing pages (cần auth)
├── app/(seller)/     → Seller pages (cần role SELLER+)
└── app/(admin)/      → Admin pages (cần role ADMIN/STAFF)
```

### Bước 2 — Viết từ dưới lên
```
Service (lib/services/) → API Route → UI Page
```
Không viết UI trước khi có API. Không viết API trước khi có service.

### Bước 3 — Checklist trước commit
- [ ] `tsc --noEmit` → exit 0
- [ ] Không có `// TODO` / `// FIXME` mới
- [ ] Không có `console.log` debug còn sót
- [ ] Sensitive data không leak ra response
- [ ] Audit log được ghi cho admin actions

## Quy trình fix bug

```
1. Reproduce bug → xác định input → xác định output mong đợi
2. Tìm root cause (đọc code, không đoán)
3. Viết test case reproduce bug TRƯỚC khi sửa (nếu có test framework)
4. Sửa code
5. Verify test pass
6. Kiểm tra regression: chạy test liên quan xung quanh
```

**Không sửa symptoms — sửa root cause.**

## Quy trình update dependency

```bash
# 1. Đọc changelog trước
# 2. Update 1 package tại 1 thời điểm
pnpm update <package>

# 3. Kiểm tra breaking changes
node node_modules/typescript/bin/tsc --noEmit
pnpm lint
pnpm build

# 4. Test chức năng liên quan
# 5. Commit riêng với message: "deps: update <package> x.y.z → a.b.c"
```

## Luồng dữ liệu chuẩn trong Next.js App Router

```
Client Request
    ↓
middleware.ts          ← CSRF check, IP guard, auth redirect
    ↓
Route Handler (api/)   ← auth(), requireX(), Zod validate, service call
    ↓
Service (lib/)         ← Business logic, Prisma $transaction
    ↓
Database (PostgreSQL)
```

```
Server Component (page.tsx)
    ↓ auth() + Prisma query (server side)
    ↓ truyền props xuống
Client Component ("use client")
    ↓ useState, event handlers, fetch API routes
```

## Môi trường

| Môi trường | Branch | URL |
|-----------|--------|-----|
| Local dev | * | http://localhost:3000 |
| Staging | develop | https://staging.hethongmmo.vn |
| Production | main / tag v*.*.* | https://hethongmmo.vn |

## Secrets management

- Secrets KHÔNG bao giờ commit vào git
- File `.env` chỉ tồn tại local và server — không trong repo
- Tham khảo `.env.example` để biết cần khai báo gì
- Production secrets qua GitHub Actions Secrets hoặc vault
