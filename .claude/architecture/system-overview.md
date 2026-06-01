# System Overview — hethongmmo.vn

## Mục tiêu hệ thống

Nền tảng MMO (Make Money Online) tại Việt Nam gồm:
- **Dịch vụ MXH**: tăng follow, view, like (Facebook, TikTok, YouTube, ...)
- **Khóa học**: video/offline về MMO, ads, affiliate
- **Tut & Tricks**: hướng dẫn kỹ thuật (tải về sau mua)
- **Tài nguyên MMO**: tài khoản số, tool, niche site (giao hàng tự động)
- **Marketplace Seller**: người bán tự đăng sản phẩm, admin duyệt

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare CDN                     │
│              (DDoS protect, WAF, cache)               │
└─────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌─────────────────────▼───────────────────────────────┐
│                    Nginx                             │
│         (rate limit, SSL termination, proxy)         │
└─────────────────────┬───────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────┐
│              Next.js 16 (App Router)                 │
│   ┌──────────────────────────────────────────────┐   │
│   │  Route Groups                                │   │
│   │  (public) → (auth) → (user) → (seller)      │   │
│   │  (admin) → api/                              │   │
│   └──────────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────┐   │
│   │  Services Layer (lib/services/)              │   │
│   │  deposit · purchase · otp · email            │   │
│   │  seller · withdrawal · notification          │   │
│   └──────────────────────────────────────────────┘   │
└────────┬──────────────┬────────────────────────────┘
         │              │
┌────────▼──────┐  ┌────▼────────────────────────────┐
│  PostgreSQL 16 │  │  Redis (Upstash)                │
│  (Prisma ORM)  │  │  session cache, rate limit,     │
│  20+ models    │  │  idempotency, ticker cache      │
└───────────────┘  └────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────┐
│  External Services                                 │
│  SePay Webhook ← thanh toán tự động               │
│  Resend        → email OTP, notification          │
│  Cloudflare R2 → image/file storage               │
│  Cloudflare Turnstile → CAPTCHA                   │
└────────────────────────────────────────────────────┘
```

## Luồng tiền

```
User nạp tiền
  → SePay phát hiện giao dịch ngân hàng
  → POST /api/webhooks/sepay (HMAC verify)
  → processDeposit() → UPDATE users.balance + INSERT transactions
  → SSE ticker hiển thị real-time

User mua hàng
  → POST /api/orders (idempotency key)
  → purchaseProduct() → $transaction(deduct balance + deliver content)
  → Email xác nhận

Seller rút tiền
  → POST /api/seller/withdrawal (OTP verify)
  → requestWithdrawal() → INSERT seller_withdrawals
  → Admin duyệt thủ công → processWithdrawal()
  → Email thông báo
```

## Auth flow

```
Đăng ký:
  POST /register → OTP email → POST /verify-otp → tạo User

Đăng nhập:
  POST /login → verify hash (Argon2id) → tạo Session (opaque token)
  → SET __Host-session cookie (HttpOnly, Secure, SameSite=Strict)

2FA (tùy chọn):
  Setup TOTP → QR code → verify code → lưu secretEnc
  Các admin action nhạy cảm yêu cầu TOTP step-up
```

## Route Groups & Auth Guards

| Group | Guard | Redirect |
|-------|-------|---------|
| `(public)` | Không | — |
| `(auth)` | Không (chỉ layout tối giản) | — |
| `(user)` | `auth()` → redirect login | `/dang-nhap` |
| `(seller)` | `role: SELLER\|STAFF\|ADMIN` | `/` |
| `(admin)` | `role: ADMIN\|STAFF` | `/` |

## Cấu trúc thư mục `web/src/`

```
app/
├── (public)/   ← public pages, no auth
├── (auth)/     ← login, register, OTP
├── (user)/     ← user dashboard
├── (seller)/   ← seller management
├── (admin)/    ← admin panel
├── api/        ← route handlers
├── layout.tsx  ← root layout (Providers, nonce, font)
└── page.tsx    ← homepage

lib/
├── auth/       ← Auth.js config, RBAC, password, 2FA
├── db/         ← Prisma client singleton
├── errors.ts   ← custom error classes
├── security/   ← encryption, HMAC, sanitize, rate-limit, audit
├── services/   ← business logic (deposit, purchase, otp, ...)
├── storage/    ← S3/R2 presigned URL
└── utils/      ← format, logger

components/
├── layout/     ← Header, Footer, Ticker, UserMenu, MobileMenu
├── providers/  ← SessionProvider, QueryClientProvider
└── shared/     ← Pagination, SafeHtml, CopyButton, Skeleton, ...
```

## Database: 20 Prisma models

| Nhóm | Models |
|------|--------|
| Auth | User, Session, RefreshToken, LoginAttempt, OtpCode, PendingRegistration |
| Products | Service, Course, TutTrick, MmoProduct, MmoProductItem |
| Seller | SellerRequest, SellerProduct, SellerProductStock, SellerWithdrawal |
| Commerce | Order, Transaction |
| System | Notification, Review, Complaint, AuditLog, SystemConfig, TickerNotification, TickerText, UnmatchedTransfer |

## Deployment

| Layer | Tech | Notes |
|-------|------|-------|
| Server | VPS Ubuntu 22.04 | Hetzner/DigitalOcean |
| Container | Docker Compose | next + postgres + redis + nginx |
| CI/CD | GitHub Actions | ci.yml, deploy-staging.yml, deploy-production.yml |
| DNS/CDN | Cloudflare | DDoS protect, SSL, cache |
| Storage | Cloudflare R2 | S3-compatible, thumbnails |
| Email | Resend | Transactional email |
| Payment | SePay | Webhook auto-deposit |
