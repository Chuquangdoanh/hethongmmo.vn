<!-- COMPLETED: 2026-05 — UI Pages hoàn thành toàn bộ -->
<!-- Tất cả pages trong (public), (auth), (user), (seller), (admin) đã có. -->

# Phase 2D — UI Pages

**Status: ✅ HOÀN THÀNH**

## Kiến trúc UI

- Server Components mặc định — fetch data trực tiếp với Prisma
- `"use client"` chỉ cho forms, interactive state, event handlers
- `params` / `searchParams` phải `await` (Next.js 16 App Router)
- `Decimal` → `Number()` trước khi format/hiển thị
- Nullable Prisma fields → `?? undefined` trước khi truyền vào props interface

## Đã hoàn thành

### 2D-0 — Layout & Shared Components (`components/`)

- [x] `layout/Header.tsx` — nav với auth state, balance display, notification bell
- [x] `layout/Footer.tsx` — links, branding
- [x] `layout/Ticker.tsx` — SSE deposit ticker (client component, `EventSource`)
- [x] `layout/UserMenu.tsx` — dropdown avatar menu
- [x] `layout/MobileMenu.tsx` — hamburger mobile nav
- [x] `providers/SessionProvider.tsx` — wraps `<SessionProvider>` từ next-auth
- [x] `providers/QueryClientProvider.tsx` — TanStack Query setup
- [x] `shared/Pagination.tsx` — server-side pagination links
- [x] `shared/SafeHtml.tsx` — DOMPurify wrapper (KHÔNG dùng `dangerouslySetInnerHTML` trực tiếp)
- [x] `shared/CopyButton.tsx` — clipboard copy với feedback
- [x] `shared/Skeleton.tsx` — loading skeleton
- [x] `shared/SimpleOrderButton.tsx` — props: `itemId`, `orderType`, `itemName`, `price`, `isLoggedIn`

### 2D-1 — Public Pages (`(public)/`)

- [x] `page.tsx` — Homepage: hero, featured services, latest tut-tricks, ticker
- [x] `dich-vu/page.tsx` — Service list với platform filter
- [x] `dich-vu/[slug]/page.tsx` — Service detail + pricing table
- [x] `khoa-hoc/page.tsx` — Course grid với category filter
- [x] `khoa-hoc/[slug]/page.tsx` — Course detail + SimpleOrderButton
- [x] `tut-tricks/page.tsx` — Tut & Trick list
- [x] `tut-tricks/[slug]/page.tsx` — Detail + purchase sidebar
- [x] `tai-nguyen-mmo/page.tsx` — MMO resources grid + category filter
- [x] `tai-nguyen-mmo/[slug]/page.tsx` — Detail + stock indicator + SimpleOrderButton
- [x] `quang-cao/page.tsx` — Static advertising packages page
- [x] `lien-he/page.tsx` — Contact form

### 2D-2 — Auth Pages (`(auth)/`)

- [x] `dang-nhap/page.tsx` — Login form (email + password + TOTP field if 2FA)
- [x] `dang-ky/page.tsx` — Register form + Turnstile CAPTCHA
- [x] `xac-thuc-otp/page.tsx` — OTP input (6 digits), resend button
- [x] `quen-mat-khau/page.tsx` — Forgot password (email input)
- [x] `dat-lai-mat-khau/page.tsx` — Reset password (OTP + new password)

### 2D-3 — User Pages (`(user)/`)

- [x] `dashboard/page.tsx` — Balance, recent orders, notifications
- [x] `don-hang/page.tsx` — Paginated order history
- [x] `don-hang/[id]/page.tsx` — Order detail với decrypted content (owner only)
- [x] `nap-tien/page.tsx` — Deposit instructions (bank info, QR)
- [x] `lich-su-giao-dich/page.tsx` — Transaction history
- [x] `thong-bao/page.tsx` — Notifications list
- [x] `cai-dat/page.tsx` — Profile settings (name, avatar)
- [x] `doi-mat-khau/page.tsx` — Change password form
- [x] `bao-mat/page.tsx` — 2FA setup/disable, backup codes

### 2D-4 — Seller Pages (`(seller)/`)

- [x] `tong-quan/page.tsx` — Seller dashboard: revenue, orders, withdrawable
- [x] `san-pham/page.tsx` — Product list with stock counts
- [x] `san-pham/tao-moi/page.tsx` — Create product form
- [x] `san-pham/[id]/sua/page.tsx` — Edit product form
- [x] `san-pham/[id]/stock/page.tsx` — Stock upload + stats
- [x] `rut-tien/page.tsx` — Withdrawal request form (OTP verify)
- [x] `lich-su-rut-tien/page.tsx` — Withdrawal history
- [x] `dang-ky-ban-hang/page.tsx` — Seller registration (pay 50k)

### 2D-5 — Admin Pages (`(admin)/`)

- [x] `dashboard/page.tsx` — Stats: revenue today/month, new users, pending withdrawals
- [x] `users/page.tsx` — User list với search + role filter
- [x] `users/[id]/page.tsx` — User detail + `AdminUserActions.tsx` (ban/role/balance)
- [x] `orders/page.tsx` — Order list với status filter
- [x] `orders/[id]/page.tsx` — Order detail + `OrderStatusForm.tsx`
- [x] `withdrawals/page.tsx` — Withdrawal queue
- [x] `withdrawals/[id]/page.tsx` — Withdrawal detail + `WithdrawalProcessForm.tsx`
- [x] `seller-requests/page.tsx` — Pending seller requests
- [x] `seller-requests/[id]/page.tsx` — Request detail + approve/reject form
- [x] `deposits/page.tsx` — Deposit history + unmatched transfers section
- [x] `services/page.tsx` — Service CRUD list
- [x] `services/tao-moi/page.tsx` — Create service
- [x] `services/[id]/sua/page.tsx` — Edit service (uses `ServiceForm.tsx`)
- [x] `courses/page.tsx` — Course CRUD list
- [x] `courses/tao-moi/page.tsx` — Create course
- [x] `courses/[id]/sua/page.tsx` — Edit course
- [x] `tut-tricks/page.tsx` — Tut-Trick CRUD list
- [x] `tut-tricks/tao-moi/page.tsx` — Create tut-trick
- [x] `tut-tricks/[id]/sua/page.tsx` — Edit tut-trick
- [x] `mmo-products/page.tsx` — MMO product list với available stock count
- [x] `mmo-products/tao-moi/page.tsx` — Create MMO product
- [x] `mmo-products/[id]/sua/page.tsx` — Edit MMO product
- [x] `mmo-products/[id]/stock/page.tsx` — Stock management + `StockUploadForm.tsx`
- [x] `reviews/page.tsx` — Review moderation list
- [x] `complaints/page.tsx` — Complaint management
- [x] `he-thong/page.tsx` — System config (orderHoldDays, fees, maintenance mode)
- [x] `ticker/page.tsx` — Ticker text management

## Gotchas

- `await params` trong mọi `page.tsx` nhận `{ params: Promise<{ id: string }> }`
- `SimpleOrderButton` props: `itemId` (không phải `productId`), `itemName`, `price`, `isLoggedIn`
- Prisma `string | null` → `?? undefined` khi truyền vào component prop `string | undefined`
- Admin user PATCH dùng `action` discriminated union, không phải field trực tiếp
- Withdrawal PATCH dùng `approve: boolean`, không phải `action: string`
