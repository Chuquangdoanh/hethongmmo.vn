<!-- COMPLETED: 2026-05 — API Route Handlers hoàn thành -->
<!-- Tất cả route handlers đã có: webhooks, orders, products, admin, seller, user profile. -->

# Phase 2C — API Route Handlers

**Status: ✅ HOÀN THÀNH**

## Mục tiêu
Tất cả Next.js Route Handlers — cầu nối giữa client và service layer.

## Quy tắc bắt buộc cho mọi route

```
1. requireUser/Seller/Admin() — verify session
2. Zod.parse(body) — validate input
3. check permission (ownership, role)
4. gọi service / prisma
5. return { success: true, data: ... } hoặc { success: false, error, code }
```

## Đã hoàn thành (`web/src/app/api/`)

### Webhooks
- [x] `webhooks/sepay/route.ts` — POST: HMAC verify signature + IP whitelist → `processDeposit()` → SSE broadcast
- [x] `webhooks/sepay/route.ts` — Idempotent: check `reference_code` trước khi xử lý

### Auth (`api/auth/`)
- [x] `register/route.ts` — Rate limit 5/IP/10min, Turnstile verify, check existing email, generate OTP
- [x] `verify-otp/route.ts` — Match passwords, check `PendingRegistration`, argon2id hash, `$transaction` create User
- [x] `forgot-password/route.ts` — Generate reset OTP + send email
- [x] `reset-password/route.ts` — Verify OTP, hash new password, revoke all sessions
- [x] `resend-otp/route.ts` — Rate limited resend

### Orders
- [x] `orders/route.ts` — POST: idempotency key check (Redis + DB) → `purchaseProduct()` → email confirmation
- [x] `orders/[id]/route.ts` — GET: order detail với content decrypt (chỉ owner hoặc admin)

### Products
- [x] `products/services/route.ts` — GET: list, POST: admin tạo mới
- [x] `products/services/[id]/route.ts` — GET: detail, PATCH: admin update, DELETE: admin xóa
- [x] `products/courses/route.ts` — GET: list, POST: admin tạo mới
- [x] `products/courses/[id]/route.ts` — GET, PATCH, DELETE
- [x] `products/tut-tricks/route.ts` — GET: list, POST: admin tạo mới
- [x] `products/tut-tricks/[id]/route.ts` — GET, PATCH, DELETE
- [x] `products/mmo/route.ts` — GET: list (không trả items), POST: admin tạo mới
- [x] `products/mmo/[id]/route.ts` — GET, PATCH, DELETE
- [x] `products/mmo/[id]/stock/route.ts` — POST: batch upload items (encrypt AES-256-GCM), GET: stats

### Admin (`api/admin/`)
- [x] `admin/users/route.ts` — GET: list users với filter (role, status, search)
- [x] `admin/users/[id]/route.ts` — PATCH: discriminated union `action: ban|unban|change_role|adjust_balance`
- [x] `admin/orders/route.ts` — GET: list all orders
- [x] `admin/orders/[id]/route.ts` — PATCH: update status (`{ status, note? }`)
- [x] `admin/withdrawals/route.ts` — GET: list pending withdrawals
- [x] `admin/withdrawals/[id]/route.ts` — PATCH: discriminated union `approve: true|false`
- [x] `admin/seller-requests/route.ts` — GET: list pending seller requests
- [x] `admin/seller-requests/[id]/route.ts` — PATCH: `approve|reject` + `maxProducts` + email notification
- [x] `admin/reviews/route.ts` — GET: list reviews, DELETE: xóa review vi phạm
- [x] `admin/complaints/route.ts` — GET: list, PATCH: update status
- [x] `admin/system-config/route.ts` — GET/PATCH: đọc và cập nhật `system_config`
- [x] `admin/stats/route.ts` — GET: dashboard stats (revenue, orders, users, tổng hợp)
- [x] `admin/unmatched-transfers/route.ts` — GET: list, POST: manual match → `processDeposit()`

### Seller (`api/seller/`)
- [x] `seller/register/route.ts` — POST: `registerSeller()` — deduct 50k + request
- [x] `seller/products/route.ts` — GET: seller's products, POST: `addProduct()` — encrypt stock
- [x] `seller/products/[id]/route.ts` — GET, PATCH, DELETE (soft-delete)
- [x] `seller/withdrawal/route.ts` — POST: `requestWithdrawal()` (OTP verify trước)
- [x] `seller/stats/route.ts` — GET: revenue, orders, product stats, withdrawable amount

### User (`api/user/`)
- [x] `user/profile/route.ts` — GET: profile (no sensitive fields), PATCH: update displayName/avatar
- [x] `user/transactions/route.ts` — GET: paginated transactions
- [x] `user/notifications/route.ts` — GET: list, PATCH: mark read
- [x] `user/notifications/[id]/route.ts` — PATCH: mark single read (IDOR protected)
- [x] `user/change-password/route.ts` — POST: verify current, HaveIBeenPwned check, argon2id hash
- [x] `user/2fa/route.ts` — POST: setup/verify/disable TOTP
- [x] `user/upload-avatar/route.ts` — POST: presigned URL từ R2 → return URL

### Ticker / SSE
- [x] `ticker/route.ts` — GET: SSE stream, deposits broadcast
- [x] `ticker/texts/route.ts` — GET/POST admin ticker text management

### Reviews & Complaints
- [x] `reviews/route.ts` — POST: tạo review (đã mua mới review được)
- [x] `complaints/route.ts` — POST: tạo complaint

## Error format chuẩn

```typescript
// Success
return NextResponse.json({ success: true, data: ... }, { status: 200 })
// Error
return NextResponse.json({ success: false, error: "...", code: "NOT_FOUND" }, { status: 404 })
```
