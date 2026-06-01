# Tech Stack — chuquangdoanh.net

## Core

| Layer | Technology | Version | Ghi chú |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.2.6 | App Router, không Pages Router |
| Runtime | React | 19 | Server Components mặc định |
| Language | TypeScript | strict + noUncheckedIndexedAccess | |
| Styling | Tailwind CSS | v4 | `@import "tailwindcss"`, không config file |
| ORM | Prisma | 7 | Adapter v7 |
| Database | PostgreSQL | 16 | Extensions: pgcrypto, uuid-ossp |
| Cache/Queue | Redis | 7 (Upstash) | Rate limit, session, idempotency |

## Auth

| Component | Technology | Ghi chú |
|-----------|-----------|---------|
| Session | Auth.js v5 (`@auth/prisma-adapter`) | Database strategy, opaque token |
| Password | Argon2id | memoryCost: 65536, timeCost: 3, parallelism: 4 |
| 2FA | TOTP (`otpauth`) | RFC 6238, 30s window |
| Captcha | Cloudflare Turnstile | Anti-bot cho register |

## Security libs (`web/src/lib/security/`)

| File | Mục đích |
|------|---------|
| `encryption.ts` | AES-256-GCM encrypt/decrypt (bank info, stock content) |
| `hmac.ts` | HMAC-SHA256 verify webhook, timing-safe compare |
| `sanitize.ts` | DOMPurify server-side cho user HTML input |
| `rate-limit.ts` | Upstash Redis sliding window |
| `audit.ts` | writeAuditLog() helper |

## External Services

| Service | Mục đích | Env var |
|---------|---------|---------|
| SePay | Webhook thanh toán tự động | `SEPAY_WEBHOOK_SECRET`, `SEPAY_IP_WHITELIST` |
| Resend | Email OTP, xác nhận, thông báo | `RESEND_API_KEY` |
| Cloudflare R2 | Image/file storage (S3-compatible) | `S3_*` |
| Cloudflare Turnstile | CAPTCHA | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |

## UI Libraries

| Library | Dùng cho |
|---------|---------|
| (custom components) | Tất cả UI dùng custom Tailwind components |
| TanStack Query | Client-side data fetching (nếu cần) |
| Recharts | Charts trong admin/seller dashboard |

## Dev Tools

| Tool | Mục đích |
|------|---------|
| Vitest | Unit + integration tests |
| Playwright | E2E tests |
| ESLint | Linting |
| Pino | Structured logging |
| tsx | TypeScript script runner |

## Tailwind v4 — Lưu ý quan trọng

```css
/* globals.css — Tailwind v4 syntax */
@import "tailwindcss";

@theme {
  --color-brand: #7C3AED;
  /* ... */
}
```

- Không có `tailwind.config.js` — config trong CSS
- Dùng arbitrary values: `text-[#F4F4F5]`, `bg-[#14141F]`
- Không có `purge` config — Tailwind v4 tự tree-shake

## Prisma 7 — Lưu ý quan trọng

- `Decimal` type cho tất cả fields tiền → phải `Number(x)` khi tính JS
- Không có `prisma.config.ts` adapter setup riêng — dùng `prisma.config.ts` nếu cần
- `onDelete: Cascade` cho user-owned data (orders, notifications, ...)
- Migrations: `pnpm prisma migrate dev` (dev), `pnpm prisma migrate deploy` (prod)

## Environment Variables (`.env.example`)

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=                    # random 32 bytes
NEXTAUTH_URL=https://...

# Encryption
DATA_ENCRYPTION_KEY=            # hex 32 bytes AES key

# SePay
SEPAY_WEBHOOK_SECRET=
SEPAY_IP_WHITELIST=             # comma-separated IPs

# Resend
RESEND_API_KEY=
RESEND_FROM=noreply@chuquangdoanh.net

# Storage (Cloudflare R2)
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_PUBLIC_URL=

# Redis
REDIS_URL=                      # Upstash Redis URL

# Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```
