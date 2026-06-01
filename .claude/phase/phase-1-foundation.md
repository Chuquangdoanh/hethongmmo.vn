<!-- COMPLETED: 2026-05 — Phase 1 Foundation hoàn thành toàn bộ -->
<!-- Tất cả infrastructure, config, schema, security libs đã có. -->

# Phase 1 — Foundation (Nền tảng)

**Status: ✅ HOÀN THÀNH**

## Mục tiêu
Chuẩn bị toàn bộ tầng nền trước khi viết business logic.

## Đã hoàn thành

### Project skeleton
- [x] Next.js 16.2.6 App Router, TypeScript strict, noUncheckedIndexedAccess
- [x] Cấu trúc thư mục 80+ folders (`src/app/`, `src/lib/`, `src/components/`)
- [x] Tailwind CSS v4 với `@theme {}` custom colors
- [x] ESLint config

### Database
- [x] `web/prisma/schema.prisma` — 20 models: User, Session, RefreshToken, LoginAttempt, OtpCode, PendingRegistration, Service, Course, TutTrick, MmoProduct, MmoProductItem, SellerRequest, SellerProduct, SellerProductStock, SellerWithdrawal, Order, Transaction, Notification, Review, Complaint, AuditLog, SystemConfig, TickerNotification, TickerText, UnmatchedTransfer
- [x] `infra/postgres/init.sql` — Extensions (pgcrypto, uuid-ossp), stored procedures (sp_process_deposit, sp_process_purchase), triggers, RLS, VIEWs, seed data

### Infrastructure
- [x] `docker-compose.yml` — Postgres 16 + Redis 7 + Nginx + Next.js container
- [x] `Dockerfile` — Multi-stage build
- [x] `.env.example` — Tất cả secrets cần thiết
- [x] `infra/nginx/nginx.conf` — Rate limit zones + security headers

### Security libs (`web/src/lib/security/`)
- [x] `encryption.ts` — AES-256-GCM encrypt/decrypt
- [x] `hmac.ts` — HMAC-SHA256 với timing-safe compare
- [x] `sanitize.ts` — DOMPurify server-side
- [x] `rate-limit.ts` — Upstash Redis sliding window
- [x] `audit.ts` — writeAuditLog() helper

### Validation schemas (`web/src/lib/`)
- [x] `user.schema.ts` — Zod schemas cho user operations
- [x] `order.schema.ts` — Zod schemas cho orders
- [x] `seller.schema.ts` — Zod schemas cho seller
- [x] `webhook.schema.ts` — Zod schema cho SePay webhook

### Middleware
- [x] `web/src/middleware.ts` — Auth guard + CSRF + IP whitelist webhook
