<!-- COMPLETED: 2026-05 — Business Services hoàn thành -->
<!-- Tất cả service layer đã có: deposit, purchase, otp, email, notification, seller, withdrawal. -->

# Phase 2B — Business Services

**Status: ✅ HOÀN THÀNH**

## Mục tiêu
Server-side business logic — chỉ được gọi từ Route Handlers, không expose ra client.

## Đã hoàn thành (`web/src/lib/services/`)

### `deposit.service.ts`
- [x] `processDeposit({ userId, amount, referenceCode, description, type })` → `Transaction`
- [x] Gọi stored procedure `sp_process_deposit` qua `prisma.$queryRaw`
- [x] Ghi `audit_log` sau khi thành công
- [x] Throw `DuplicateError` nếu `reference_code` đã tồn tại

### `purchase.service.ts`
- [x] `purchaseProduct({ userId, orderType, itemId, itemName, finalPrice, idempotencyKey })` → `Order`
- [x] Gọi `sp_process_purchase`
- [x] MMO_PRODUCT / SELLER_PRODUCT: `SELECT FOR UPDATE SKIP LOCKED LIMIT 1` → UPDATE status SOLD → decrypt content
- [x] Cập nhật `totalOrders` trên item cha
- [x] Ghi `audit_log` + insert `notification`

### `otp.service.ts`
- [x] `generateOtp(email, purpose, userId?, ip?)` → bcrypt hash → INSERT `otp_codes`
- [x] `verifyOtp(email, purpose, inputCode)` → fetch + compare + check expiry + increment attempts (max 5)
- [x] `cleanExpiredOtps()` → DELETE WHERE expires_at < now()

### `email.service.ts`
- [x] `sendOtpEmail({ to, code, purpose })` — HTML template với inline CSS, dark theme #7C3AED
- [x] `sendOrderConfirmation({ to, order })`
- [x] `sendDepositEmail({ to, amount, balance })`
- [x] `sendSellerApprovedEmail({ to, category, maxProducts })`
- [x] `sendWithdrawalEmail({ to, netAmount, status, rejectReason? })`
- [x] `sendPasswordResetEmail({ to, resetToken })`
- [x] Tất cả dùng **Resend SDK**, không có thư viện template ngoài

### `notification.service.ts`
- [x] `createNotification(userId, { title, body, type, meta? })` → INSERT
- [x] `markAsRead(notificationId, userId)` — IDOR protected (WHERE id AND user_id)
- [x] `markAllAsRead(userId)`
- [x] `getUnreadCount(userId)`

### `seller.service.ts`
- [x] `registerSeller({ userId, category })` → deduct 50,000đ + INSERT seller_requests + transaction + audit
- [x] `addProduct({ sellerId, name, price, description, imageUrl, stockItems[] })` → encrypt items → INSERT seller_products + stock
- [x] `checkProductLimit(sellerId)` → đếm sản phẩm active
- [x] `calculateWithdrawableRevenue(sellerId)` → tính theo orderHoldDays từ system_config

### `withdrawal.service.ts`
- [x] `requestWithdrawal({ sellerId, amount })` → đọc config, tính fee, INSERT seller_withdrawals + transaction
- [x] `processWithdrawal({ withdrawalId, adminUserId, approve, rejectReason? })` → UPDATE status + audit

## Quy tắc quan trọng

- Tất cả thao tác tiền: `prisma.$transaction(async (tx) => { ... })`
- Không trả `*_enc` fields ra ngoài service
- Custom errors: `AppError`, `InsufficientBalanceError`, `DuplicateError`, `NotFoundError`
