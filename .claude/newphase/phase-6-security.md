# PHASE 6 — BẢO MẬT & PHÂN QUYỀN (Security & RBAC)

## Mục tiêu
OWASP Top 10 được xử lý, rate limit đầy đủ, không lộ data nhạy cảm, audit trail đầy đủ.

## OWASP Top 10 Coverage

### A01 — Broken Access Control
| Biện pháp | Triển khai |
|---|---|
| RBAC server-side | rbac.ts: requireUser/Seller/Staff/Admin |
| Own-resource check | `if (resource.userId !== user.id) throw ForbiddenError` |
| Seller category enforce | Server: `sellerCategory === user.sellerCategory` |
| Max products enforce | Server: `count >= maxSellerProducts` throw |
| Admin-only routes | `(admin)` layout + middleware guard |

### A02 — Cryptographic Failures
| Biện pháp | Triển khai |
|---|---|
| Password | Argon2id (argon2 lib) |
| OTP | bcrypt hash (codeHash) |
| Refresh token | SHA-256 hash (tokenHash) |
| Sensitive data | AES-256-GCM (ENCRYPTION_KEY 32 bytes) |
| Bank info | Bytes columns, never selected in normal queries |
| contentUrlEnc | Never returned in GET — chỉ decrypt trong order delivery |
| HTTPS | Next.js + deployment layer |

### A03 — Injection
| Biện pháp | Triển khai |
|---|---|
| SQL Injection | Prisma parameterized queries; $queryRaw dùng template literals |
| XSS Output | SafeHtml component (DOMPurify), sanitizeHtml() trước khi lưu |
| XSS Input | sanitizeText() / sanitizeHtml() tất cả user text |
| NoSQL | Không dùng NoSQL |

### A04 — Insecure Design
| Biện pháp | Triển khai |
|---|---|
| Idempotency | idempotencyKey UNIQUE trên orders |
| Atomic transaction | prisma.$transaction + SELECT FOR UPDATE |
| Decimal money | Decimal.js + db.Decimal(18,2) |
| Soft delete | deletedAt field |

### A05 — Security Misconfiguration
| Biện pháp | Triển khai |
|---|---|
| Env secrets | .env không commit, .env.example không có giá trị |
| ENCRYPTION_KEY validation | getKey() throw nếu không đúng 64 hex |
| Error messages | toApiError() — không lộ stack trace |
| Headers | Next.js security headers (next.config.ts) |

### A07 — Authentication Failures
| Biện pháp | Triển khai |
|---|---|
| Login rate limit | 10 req/phút per IP (loginRatelimit) |
| OTP rate limit | 3 gửi/5 phút per email (otpRatelimit) |
| Account lockout | failedLoginCount >= 5 → lockedUntil = now + 15 phút |
| 2FA | TOTP (otpauth), twoFactorSecretEnc |
| Session | Auth.js v5 + RefreshToken rotation |
| OTP expire | 10 phút, maxAttempts=5, usedAt timestamp |

### A08 — Software Integrity
| Biện pháp | Triển khai |
|---|---|
| Webhook HMAC | hmac.ts: verifyWebhookSignature (SePay) |
| Zod validation | Mọi API POST/PATCH đều parse + validate |

### A09 — Security Logging
| Biện pháp | Triển khai |
|---|---|
| Audit log | writeAuditLog() ghi before/after/ip/ua |
| Login attempts | LoginAttempt table |
| Pino logger | logger.ts — structured JSON logs |

## Rate Limit Matrix

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| POST /api/auth/[...] login | 10 | 1 phút | IP |
| POST /api/auth/verify-otp | 5 | 5 phút | email |
| POST /api/auth/resend-otp | 3 | 10 phút | email + IP |
| POST /api/orders | 5 | 1 phút | userId |
| POST /api/seller/register | 3 | 1 giờ | userId |
| GET /api/ticker | 20 | 1 phút | IP (SSE) |
| General API | 100 | 1 phút | IP |

## Sensitive Data — Never Expose

| Field | Biện pháp |
|---|---|
| passwordHash | Không select trong bất kỳ query nào |
| bankNameEnc, bankAccountNumberEnc | Select chỉ khi cần xử lý withdrawal |
| twoFactorSecretEnc | Select chỉ trong 2FA verify flow |
| contentUrlEnc | Decrypt chỉ trong /api/orders/[id] sau verify ownership |
| valueEnc (MmoProductItem) | Decrypt chỉ trong purchase.service.ts |
| contentEnc (SellerProductStock) | Decrypt chỉ trong purchase.service.ts |

## RBAC Matrix (full)

| Action | Guest | User | Seller | Staff | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Read public content | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase items | ❌ | ✅ | ✅ | ✅ | ✅ |
| View own orders | ❌ | ✅ | ✅ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| Seller register | ❌ | ✅ | ❌ | ❌ | ✅ |
| Manage seller products | ❌ | ❌ | ✅ (own) | ❌ | ✅ |
| View seller orders | ❌ | ❌ | ✅ (own) | ❌ | ✅ |
| Request withdrawal | ❌ | ❌ | ✅ | ❌ | ✅ |
| Create/Edit products | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete products | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ban/Unban user | ❌ | ❌ | ❌ | ❌ | ✅ |
| Change user role | ❌ | ❌ | ❌ | ❌ | ✅ |
| Adjust balance | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve sellers | ❌ | ❌ | ❌ | ❌ | ✅ |
| Process withdrawals | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage system config | ❌ | ❌ | ❌ | ❌ | ✅ |

## Security Headers (next.config.ts)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
Content-Security-Policy: (strict)
Strict-Transport-Security: max-age=31536000
```

## Tasks Phase 6
- [x] Verify next.config.ts có đủ security headers
- [x] Verify mọi $queryRaw dùng template literals (không string concat)
- [x] Kiểm tra contentUrlEnc không bao giờ xuất hiện trong GET response
- [x] Thêm order rate limit: 5 req/phút per userId
- [x] Verify HMAC webhook SePay đúng timing-safe compare
- [x] Kiểm tra lockedUntil được check trước login
- [x] Test 2FA flow: enable → verify → disable
- [x] Verify AuditLog ghi đủ before/after cho mọi admin action
- [x] Penetration test IDOR: orders, seller products
- [x] CSP header không chặn Tailwind CDN (nếu dùng)
