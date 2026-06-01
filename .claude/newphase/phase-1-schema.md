# PHASE 1 — CẤU TRÚC DỮ LIỆU (Schema Design)

## Mục tiêu
Đảm bảo Prisma schema đầy đủ, đúng ràng buộc, migration sạch và môi trường env chuẩn.

## Stack
- PostgreSQL (Prisma 7, adapter-pg)
- Enums: Role, AccountStatus, SellerStatus, Platform, LearningFormat, CourseBadge, OrderType, OrderStatus, TxType, WithdrawalStatus, OtpPurpose, NotificationType, ComplaintStatus, StockItemStatus

## Models và trạng thái

| Model | File | Trạng thái |
|---|---|---|
| User | schema.prisma | ✅ Đầy đủ (bankEnc, 2FA, lockout, softDelete) |
| Session / RefreshToken / LoginAttempt | schema.prisma | ✅ |
| Service | schema.prisma | ✅ (warrantyOptions, productList JSON) |
| Course | schema.prisma | ✅ (saleDeadline Date, contentList JSON, softDelete) |
| TutTrick | schema.prisma | ✅ contentUrlEnc = Bytes (AES-256-GCM) |
| MmoProduct / MmoProductItem | schema.prisma | ✅ valueEnc = Bytes |
| Order | schema.prisma | ✅ idempotencyKey unique |
| Transaction | schema.prisma | ✅ referenceCode unique |
| Notification | schema.prisma | ✅ |
| SellerRequest | schema.prisma | ✅ reviewedByUserId |
| SellerProduct / SellerProductStock | schema.prisma | ✅ contentEnc = Bytes |
| SellerWithdrawal | schema.prisma | ✅ bank fields encrypted |
| SystemConfig | schema.prisma | ✅ |
| TickerNotification / TickerText | schema.prisma | ✅ |
| OtpCode / PendingRegistration | schema.prisma | ✅ |
| UnmatchedTransfer | schema.prisma | ✅ |
| Review / Complaint / AuditLog | schema.prisma | ✅ |

## Indexes kiểm tra

| Table | Fields | Mục đích |
|---|---|---|
| users | email, uidPrefix, status, role, sellerStatus | Login, filter, SePay match |
| courses | slug, category, isActive+displayOrder | Public list, filter |
| services | slug, platform, isActive+isFeatured | Public list |
| tut_tricks | slug, platform, isActive+isFeatured | Public list |
| orders | userId+createdAt, status, orderType, sellerId, orderCode | History, admin |
| transactions | userId+createdAt, type, referenceCode | Wallet, webhook |
| otp_codes | email+purpose, expiresAt | Verify flow |

## Security fields

| Field | Model | Kỹ thuật |
|---|---|---|
| contentUrlEnc | TutTrick | AES-256-GCM (Bytes) |
| valueEnc | MmoProductItem | AES-256-GCM (Bytes) |
| contentEnc | SellerProductStock | AES-256-GCM (Bytes) |
| bankNameEnc, bankAccountNumberEnc, bankAccountHolderEnc | User, SellerWithdrawal | AES-256-GCM (Bytes) |
| twoFactorSecretEnc | User | AES-256-GCM (Bytes) |
| passwordHash | User | Argon2id |
| tokenHash | RefreshToken | SHA-256 |
| codeHash | OtpCode | bcrypt |

## Env variables bắt buộc

```
DATABASE_URL=postgresql://user:pass@localhost:5432/hethongmmo
ENCRYPTION_KEY=<64-char hex>
AUTH_SECRET=<32-char random>
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
SEPAY_WEBHOOK_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

## Tasks Phase 1 đã hoàn thành
- [x] Thêm `url env("DATABASE_URL")` vào datasource db
- [x] Tạo `.env.example` với tất cả biến môi trường
- [x] Chạy `prisma generate` thành công
- [x] Tạo initial migration `0001_init`
- [x] Typecheck pass

## Checklist bảo mật Schema
- [x] Không lưu plaintext password (Argon2id hash)
- [x] Không lưu plaintext bank info (AES-256-GCM)
- [x] Không lưu plaintext contentUrl (AES-256-GCM)
- [x] Soft delete trên tất cả resource models (deletedAt)
- [x] Decimal(18,2) cho money — không dùng Float
- [x] idempotencyKey UNIQUE trên orders
- [x] referenceCode UNIQUE trên transactions
- [x] Audit log table đầy đủ
