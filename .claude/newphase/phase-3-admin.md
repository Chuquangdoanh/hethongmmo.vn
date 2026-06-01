# PHASE 3 — NGHIỆP VỤ ADMIN

## Mục tiêu
Admin pages hoạt động đúng với API routes, state machine rõ ràng, và audit log đầy đủ.

## Admin Pages (Next.js App Router)

| Page | Route | Status |
|---|---|---|
| Dashboard | /admin/dashboard | ✅ |
| Users list | /admin/users | ✅ |
| User detail | /admin/users/[id] | ✅ (ban/unban/role/balance) |
| Sellers list | /admin/sellers | ✅ |
| Seller detail | /admin/sellers/[id] | ✅ (approve/reject) |
| Orders list | /admin/orders | ✅ |
| Order detail | /admin/orders/[id] | ✅ (update status) |
| Deposits | /admin/deposits | ✅ |
| Withdrawals | /admin/withdrawals | ✅ |
| Courses | /admin/courses | ✅ (list + form) |
| Services | /admin/services | ✅ |
| Tut-Tricks | /admin/tut-tricks | ✅ |
| MMO Products | /admin/mmo-products | ✅ (+ stock upload) |
| Reviews | /admin/reviews | ✅ |
| Audit Log | /admin/audit-log | ✅ |
| Complaints | /admin/complaints | ✅ |
| Tickers | /admin/tickers | ✅ |

## State Machines

### User Account
```
PENDING_VERIFICATION → ACTIVE (verify email OTP)
ACTIVE → BANNED (admin ban)
BANNED → ACTIVE (admin unban)
ACTIVE → DELETED (soft delete)
```

### Seller Flow
```
NONE → PENDING (user submit + fee 50k deducted)
PENDING → APPROVED (admin approve → set sellerCategory)
PENDING → REJECTED (admin reject → gửi email lý do)
APPROVED → REVOKED (admin thu hồi)
REJECTED → PENDING (user submit lại — phí mới)
```

### Order Status
```
PENDING → PROCESSING (admin/system)
PROCESSING → DONE (admin confirm delivery)
PENDING/PROCESSING → CANCELLED (admin)
DONE → REFUNDED (admin)
DONE/CANCELLED → DISPUTED (user khiếu nại)
```

### Withdrawal Status
```
PENDING → APPROVED (admin)
APPROVED → PROCESSING (system/admin)
PROCESSING → COMPLETED (admin xác nhận chuyển khoản)
PENDING/APPROVED → REJECTED (admin + lý do)
```

## Admin Actions và Audit Log

| Action | Target | Audit fields |
|---|---|---|
| COURSE_CREATE | Course | after: {id, slug, name} |
| COURSE_UPDATE | Course | before, after |
| COURSE_DELETE | Course | before |
| SERVICE_CREATE/UPDATE/DELETE | Service | before, after |
| TUT_TRICK_CREATE/UPDATE/DELETE | TutTrick | before, after, hasContentUrl |
| USER_BAN | User | before: {status}, after: {status, reason} |
| USER_UNBAN | User | before, after |
| USER_ROLE_CHANGE | User | before: {role}, after: {role} |
| USER_BALANCE_ADJUST | User | before: {balance}, after: {balance}, delta |
| SELLER_APPROVE | SellerRequest | after: {approvedCategory} |
| SELLER_REJECT | SellerRequest | after: {rejectReason} |
| SELLER_REVOKE | User | before: {sellerStatus} |
| ORDER_STATUS_UPDATE | Order | before: {status}, after: {status} |
| WITHDRAWAL_APPROVE/REJECT/COMPLETE | SellerWithdrawal | before, after |
| ADMIN_DEPOSIT | Transaction | amount, userId |

## Notification gửi sau Admin Action

| Trigger | Notification |
|---|---|
| Seller approved | type: SELLER_APPROVED, email: "Đơn đăng ký được duyệt" |
| Seller rejected | type: SYSTEM, email: "Đơn đăng ký bị từ chối: {reason}" |
| Order status → DONE | type: ORDER_STATUS, email: (tuỳ chọn) |
| Withdrawal COMPLETED | type: WITHDRAWAL_STATUS, email: "Đã chuyển khoản" |
| Withdrawal REJECTED | type: WITHDRAWAL_STATUS, email: "Yêu cầu rút tiền bị từ chối" |
| User BANNED | type: SYSTEM |

## Tasks Phase 3
- [ ] Verify AdminUserActions: ban/unban/role/balance đều ghi audit log
- [ ] Verify SellerApproveForm: approve ghi SELLER_APPROVE + gửi notification
- [ ] Verify SellerApproveForm: reject ghi SELLER_REJECT + gửi notification
- [ ] Verify OrderStatusForm: update status ghi ORDER_STATUS_UPDATE
- [ ] Verify WithdrawalProcessForm: complete ghi audit + notification
- [ ] Thêm email notification qua Resend khi seller approved/rejected
- [ ] Admin dashboard: stats realtime (orders hôm nay, doanh thu, pending sellers)
