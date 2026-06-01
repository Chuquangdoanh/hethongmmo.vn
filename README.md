# hethongmmo.vn

Nền tảng dịch vụ MMO (Make Money Online) dành cho thị trường Việt Nam. Hỗ trợ tăng tương tác mạng xã hội, khóa học online, tài nguyên MMO và marketplace người bán — với hệ thống ví tích hợp nạp tiền tự động qua SePay.

---

## Tech Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 16.x |
| Language | TypeScript strict | 5.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | 16 |
| Auth | Auth.js v5 + Argon2id | 5.x |
| Cache / Rate-limit | Redis (Upstash) | — |
| Storage | Cloudflare R2 (S3-compatible) | — |
| Email | Resend | — |
| Payment webhook | SePay | — |
| CAPTCHA | Cloudflare Turnstile | — |
| Testing | Vitest + Playwright | — |
| Package manager | pnpm | 9.x |

---

## Khởi động nhanh (Docker Compose)

```bash
# 1. Clone repo và cấu hình biến môi trường
git clone <repo-url>
cd Hethongmmo
cp web/.env.example web/.env
# Chỉnh sửa web/.env với giá trị thực

# 2. Khởi động tất cả services
docker-compose up -d

# 3. Chạy database migrations
docker-compose exec web pnpm prisma migrate deploy

# 4. Truy cập ứng dụng
open http://localhost:3000
```

Services khởi động:

| Service | Port | Ghi chú |
|---------|------|---------|
| Next.js | 3000 | ứng dụng chính |
| Nginx | 80 | reverse proxy |
| PostgreSQL 16 | 5432 | database |
| Redis 7 | 6379 | cache & rate-limit |

---

## Phát triển local

```bash
cd web

# Cài dependencies
pnpm install

# Generate Prisma Client
pnpm prisma generate

# Chạy migrations (cần DATABASE_URL trong .env)
pnpm prisma migrate dev

# Khởi động dev server
pnpm dev
```

Truy cập tại `http://localhost:3000`.

---

## Biến môi trường

Tạo file `web/.env` với các biến sau:

```env
# Database
DATABASE_URL="postgresql://app_user:password@localhost:5432/hethongmmo"

# Auth.js
AUTH_SECRET="<random 32+ bytes>"
NEXTAUTH_URL="https://hethongmmo.vn"

# Mã hóa dữ liệu nhạy cảm (AES-256-GCM)
ENCRYPTION_KEY="<64-char hex string — 32 bytes>"

# SePay webhook nạp tiền tự động
SEPAY_WEBHOOK_SECRET="<webhook secret>"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM="noreply@hethongmmo.vn"

# Cloudflare R2 Storage
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="<access key>"
S3_SECRET_ACCESS_KEY="<secret key>"
S3_BUCKET="hethongmmo"
S3_PUBLIC_URL="https://cdn.hethongmmo.vn"

# Redis (Upstash)
REDIS_URL="rediss://:<password>@<host>:6380"

# Cloudflare Turnstile CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY="<public key>"
TURNSTILE_SECRET_KEY="<secret key>"
```

---

## Cấu trúc project

```
Hethongmmo/
├── web/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/         # Trang công khai (không cần đăng nhập)
│   │   │   │   ├── dich-vu/      # Dịch vụ MXH (tăng follow/like/view)
│   │   │   │   ├── khoa-hoc/     # Khóa học MMO
│   │   │   │   ├── tut-tricks/   # Tut & Tricks
│   │   │   │   └── tai-nguyen-mmo/ # Tài nguyên MMO
│   │   │   ├── (auth)/           # Trang xác thực
│   │   │   │   ├── dang-nhap/    # Đăng nhập
│   │   │   │   ├── dang-ky/      # Đăng ký
│   │   │   │   └── quen-mat-khau/ # Quên mật khẩu
│   │   │   ├── (user)/           # Trang người dùng (cần đăng nhập)
│   │   │   │   ├── thong-tin-ca-nhan/ # Hồ sơ
│   │   │   │   ├── nap-tien/     # Nạp tiền
│   │   │   │   └── don-hang/     # Đơn hàng
│   │   │   ├── (seller)/         # Trang người bán
│   │   │   │   ├── ban-hang/     # Dashboard bán hàng
│   │   │   │   ├── san-pham/     # Quản lý sản phẩm
│   │   │   │   └── rut-tien/     # Rút tiền
│   │   │   ├── (admin)/          # Trang quản trị
│   │   │   │   ├── users/        # Quản lý người dùng
│   │   │   │   ├── sellers/      # Duyệt đơn đăng ký seller
│   │   │   │   ├── withdrawals/  # Xử lý rút tiền
│   │   │   │   ├── audit-log/    # Nhật ký hành động
│   │   │   │   └── ...           # Orders, deposits, products, reviews
│   │   │   └── api/              # API route handlers
│   │   ├── lib/
│   │   │   ├── auth/             # Auth.js config, RBAC, password, 2FA
│   │   │   ├── db/               # Prisma client singleton, Redis client
│   │   │   ├── security/         # AES-256-GCM, HMAC, rate-limit, audit
│   │   │   ├── services/         # Business logic (deposit, purchase, withdrawal...)
│   │   │   ├── validation/       # Zod schemas
│   │   │   └── utils/            # format, logger, money helpers
│   │   ├── components/           # React components (shared, layout, providers)
│   │   └── test/                 # Unit + integration tests
│   ├── prisma/
│   │   └── schema.prisma         # 20+ Prisma models
│   └── package.json
├── infra/
│   ├── nginx/nginx.conf          # Nginx reverse proxy config
│   └── postgres/init.sql         # PostgreSQL init script
├── scripts/
│   └── migrate-from-firestore.ts # Migration script Firestore → PostgreSQL
├── .github/
│   └── workflows/                # CI/CD (ci.yml, deploy-staging.yml, deploy-production.yml)
└── docker-compose.yml
```

---

## Scripts

Chạy trong thư mục `web/`:

```bash
pnpm dev              # Dev server (hot reload)
pnpm build            # Production build
pnpm start            # Production server
pnpm typecheck        # TypeScript strict check (tsc --noEmit)
pnpm lint             # ESLint check
pnpm test             # Chạy tất cả tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report

# Prisma
pnpm prisma generate          # Generate Prisma Client
pnpm prisma migrate dev       # Tạo + áp dụng migration (dev)
pnpm prisma migrate deploy    # Áp dụng migration (production)
pnpm prisma studio            # Web UI quản lý database
```

---
#TẠO ADMIN
node scripts/create-admin.mjs

## API Routes

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/register` | Đăng ký — gửi OTP email |
| POST | `/api/auth/verify-otp` | Xác minh OTP + tạo tài khoản |
| POST | `/api/auth/forgot-password` | Yêu cầu reset mật khẩu |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |

### User
| Method | Path | Mô tả |
|--------|------|-------|
| GET/PATCH | `/api/user/profile` | Hồ sơ người dùng |
| POST | `/api/user/change-password` | Đổi mật khẩu |

### Orders & Purchases
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/orders` | Danh sách đơn hàng (phân trang) |
| POST | `/api/orders` | Mua sản phẩm (idempotency key) |

### Products (Public read / Staff write)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/products/services` | Danh sách dịch vụ |
| GET | `/api/products/courses` | Danh sách khóa học |
| GET | `/api/products/tut-tricks` | Danh sách tut & tricks |
| GET | `/api/products/mmo` | Danh sách sản phẩm MMO |

### Seller
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/seller/register` | Đăng ký làm seller |
| GET/POST | `/api/seller/products` | Quản lý sản phẩm của seller |
| POST | `/api/seller/withdrawal` | Yêu cầu rút tiền |

### Admin
| Method | Path | Mô tả |
|--------|------|-------|
| GET/PATCH | `/api/admin/users/[id]` | Quản lý user (ban, đổi role, điều chỉnh số dư) |
| GET/PATCH | `/api/admin/sellers/[id]` | Duyệt/từ chối seller |
| PATCH | `/api/admin/withdrawals/[id]` | Xử lý rút tiền |

### Webhooks & System
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/webhooks/sepay` | SePay auto-deposit (HMAC verify) |
| GET | `/api/ticker` | SSE stream — cập nhật số dư realtime |
| GET | `/api/health` | Health check |

---

## Testing

```bash
cd web

# Chạy toàn bộ test suite (82 tests)
pnpm test

# Xem coverage
pnpm test:coverage

# Test cụ thể
pnpm test -- --testPathPattern="deposit.service"
```

### Cấu trúc tests

```
web/src/test/
├── unit/
│   ├── security/
│   │   ├── encryption.test.ts   # AES-256-GCM round-trip, auth tag tamper
│   │   └── hmac.test.ts         # Sign/verify, timing-safe compare
│   ├── auth/
│   │   └── password.test.ts     # Argon2id hash/verify, strength validation
│   └── services/
│       ├── otp.service.test.ts
│       ├── deposit.service.test.ts
│       ├── purchase.service.test.ts
│       └── withdrawal.service.test.ts
└── integration/
    ├── orders/orders.test.ts
    ├── admin/users.test.ts
    └── webhooks/sepay.test.ts
```

---

## CI/CD

### GitHub Actions Workflows

**`ci.yml`** — Chạy trên mọi push và pull request:
1. `lint` — ESLint check
2. `typecheck` — TypeScript strict check
3. `test` — Vitest (82 tests, cần PostgreSQL + Redis service)
4. `build` — Next.js production build (sau khi 3 job trên pass)

**`deploy-staging.yml`** — Tự động deploy khi push vào nhánh `develop`:
- Docker build + push → SSH vào staging → `docker compose up -d` → `prisma migrate deploy` → health check

**`deploy-production.yml`** — Tự động deploy khi push vào nhánh `main`:
- Giống staging nhưng rolling update (scale 2 → 1)
- Health check sau deploy
- **Tự động rollback** nếu health check thất bại
- Tag git với version sau khi thành công

### GitHub Secrets cần cài đặt

```
DATABASE_URL          AUTH_SECRET           ENCRYPTION_KEY
SEPAY_WEBHOOK_SECRET  RESEND_API_KEY
S3_ENDPOINT           S3_ACCESS_KEY_ID      S3_SECRET_ACCESS_KEY
REDIS_URL             TURNSTILE_SECRET_KEY
DEPLOY_SSH_KEY        STAGING_HOST          PRODUCTION_HOST
DOCKER_REGISTRY       DOCKER_USERNAME       DOCKER_PASSWORD
```

---

## Security

- **Mật khẩu**: Argon2id (memoryCost=64MB, timeCost=3, parallelism=4) — không dùng bcrypt
- **Mã hóa dữ liệu nhạy cảm**: AES-256-GCM (thông tin ngân hàng, nội dung sản phẩm)
- **Webhook**: HMAC-SHA256 timing-safe verify (SePay)
- **2FA**: TOTP RFC 6238, 30s window (tuỳ chọn)
- **Rate limiting**: Upstash Redis sliding window trên mọi endpoint quan trọng
- **Audit log**: Ghi lại mọi hành động admin (ban, đổi role, điều chỉnh số dư, xử lý rút tiền)
- **CAPTCHA**: Cloudflare Turnstile khi đăng ký
- **Password strength**: Tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường, số, ký tự đặc biệt
- **Không bao giờ leak**: `password_hash`, `*_enc` (dữ liệu mã hóa), `two_factor_secret_enc`

---

## Database Models

20+ models chính:

| Model | Mô tả |
|-------|-------|
| `User` | Tài khoản người dùng (role, balance, seller_status) |
| `Session` | Auth.js sessions (opaque token) |
| `OtpCode` | OTP codes (đăng ký, 2FA, reset password) |
| `PendingRegistration` | Đăng ký chờ xác minh OTP |
| `Service` | Dịch vụ MXH |
| `Course` | Khóa học |
| `TutTrick` | Tut & Tricks |
| `MmoProduct` + `MmoProductItem` | Sản phẩm MMO + từng item |
| `SellerProduct` + `SellerProductStock` | Sản phẩm người bán + kho |
| `Order` | Đơn hàng |
| `Transaction` | Giao dịch tài chính |
| `SellerWithdrawal` | Yêu cầu rút tiền |
| `Notification` | Thông báo người dùng |
| `AuditLog` | Nhật ký hành động hệ thống |
| `SystemConfig` | Cấu hình platform |
| `UnmatchedTransfer` | Giao dịch ngân hàng chưa khớp |

---

## Luồng tiền

```
SePay bank webhook
  → HMAC verify
  → match uid_prefix trong nội dung CK
  → processDeposit() trong Prisma.$transaction
  → cộng balance + tạo Transaction record
  → SSE ticker thông báo realtime
```

```
User mua sản phẩm
  → POST /api/orders (idempotency key)
  → kiểm tra balance
  → Prisma.$transaction: trừ balance + giao hàng + tạo Order
  → trả về content (URL/text đã decrypt)
```

---

## Migration từ Firestore

```bash
cd scripts

# Dry-run (không INSERT)
pnpm tsx migrate-from-firestore.ts --dry-run

# Migrate toàn bộ
pnpm tsx migrate-from-firestore.ts

# Migrate 1 collection, batch nhỏ
pnpm tsx migrate-from-firestore.ts --collection=users --batch=100

# Resume từ checkpoint
pnpm tsx migrate-from-firestore.ts --resume
```

Script hỗ trợ: checkpoint/resume, dry-run, batch 500, error log, progress bar, idempotent upsert.

---

## Tài liệu cho AI

Thư mục `.claude/` chứa tài liệu để AI assistant hiểu context khi làm việc với repo:

- `.claude/architecture/` — Kiến trúc hệ thống, tech stack
- `.claude/rules/` — Coding conventions, DRY rules, test policy
- `.claude/security/` — Security rules (đọc trước khi viết code)
- `.claude/workflow/` — Development flow, git conventions
- `.claude/phase/` — Tracking tiến độ các phases

Xem [CLAUDE.md](CLAUDE.md) để biết thêm chi tiết.
