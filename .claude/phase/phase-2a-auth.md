<!-- COMPLETED: 2026-05 — Auth Core hoàn thành -->
<!-- Auth.js v5, Argon2id, RBAC, 2FA TOTP, OTP flow đều đã có. -->

# Phase 2A — Auth Core

**Status: ✅ HOÀN THÀNH**

## Mục tiêu
Toàn bộ hệ thống xác thực — mọi tính năng khác phụ thuộc vào đây.

## Đã hoàn thành

### Auth.js v5 config (`web/src/lib/auth/`)
- [x] `config.ts` — Credentials Provider, database session strategy, session callbacks (trả id/email/fullName/role/sellerStatus/balance), NextAuth type extensions
- [x] `password.ts` — `hash()` Argon2id (memoryCost:65536, timeCost:3), `verify()`, `checkPwnedPassword()` (HaveIBeenPwned k-anonymity), `validatePasswordStrength()`
- [x] `rbac.ts` — `requireUser()` / `requireSeller()` / `requireStaff()` / `requireAdmin()` — typed, throw AppAuthError
- [x] `two-factor.ts` — `generateTotpSecret()` (otpauth), `verifyTotp()` (decrypt + validate), `generateBackupCodes()` (8×8 hex)

### API Routes (`web/src/app/api/auth/`)
- [x] `register/route.ts` — POST: captcha verify → check email → OTP → PendingRegistration → email. Rate limit 5/IP/10min
- [x] `verify-otp/route.ts` — POST: validate → match passwords → check PendingRegistration → bcrypt.compare → Argon2id hash → $transaction(INSERT User + audit_log + DELETE pending)
- [x] `forgot-password/route.ts` — POST: generate reset OTP → gửi email
- [x] `reset-password/route.ts` — POST: verify OTP → hash new password → UPDATE + revoke sessions
- [x] `resend-otp/route.ts` — POST: rate limited resend OTP
- [x] `[...nextauth]/route.ts` — Auth.js handler

## Gotchas / Quyết định thiết kế

- Session strategy: **database** (opaque token), không JWT — token bị revoke ngay khi logout
- Cookie: `__Host-session` với HttpOnly + Secure + SameSite=Strict
- Login failure: INSERT `login_attempts`, track `failedLoginCount`, lock tài khoản nếu vượt ngưỡng
- Force reset: user migrate từ Firebase có `passwordHash = '$RESET_REQUIRED$'` → detect khi login → redirect reset flow
