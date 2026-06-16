# SECURITY.md — hethongmmo.vn
# Tài liệu Bảo mật Kiến trúc — Đọc trước khi code, review, hoặc deploy

> **Phiên bản:** 2.0 | **Cập nhật:** 2026-06-16
> **Áp dụng cho:** Toàn bộ stack — Next.js 16, PostgreSQL 16, Redis 7, Nginx, Docker, Cloudflare

---

## PHẦN 1 — KIẾN TRÚC HỆ THỐNG

### 1.1 Sơ đồ luồng request

```
Internet
   │
   ▼
Cloudflare (CDN + DDoS + WAF + Bot Fight Mode)
   │  ← chỉ nhận HTTPS; IP VPS không public
   ▼
Nginx (SSL termination, rate limit, security headers, proxy cache)
   │  ← bind port 80/443; chặn scanner, bad UA
   ▼
Next.js 16 App Router (middleware.ts → route handlers → services)
   │
   ├── PostgreSQL 16 (Prisma ORM, port 5433 chỉ bind 127.0.0.1)
   ├── Redis 7 / Upstash (rate limit, session cache)
   ├── Cloudflare R2 (object storage — presigned URL)
   ├── Resend (email OTP, notification)
   └── SePay Webhook (HMAC-SHA256, IP whitelist)
```

### 1.2 Trust Boundaries

| Zone | Mức tin tưởng | Ghi chú |
|------|--------------|---------|
| Internet | Không tin | Mọi input đều validate, sanitize |
| Cloudflare | Tin (partially) | Kiểm tra CF-Connecting-IP header chỉ từ CF IP range |
| Nginx container | Tin | Nội bộ Docker network |
| Next.js container | Tin | Không expose port ra ngoài |
| PostgreSQL container | Tin cao | Chỉ Next.js truy cập |
| Redis container | Tin cao | Chỉ Next.js truy cập |
| SePay webhook | Verify HMAC | Không tin header, chỉ tin HMAC |

### 1.3 Attack Surface

| Surface | Exposed | Kiểm soát |
|---------|---------|-----------|
| Port 80/443 | Public (qua CF) | Nginx + CF WAF |
| Port 5433 (PG) | Chỉ 127.0.0.1 | Không expose |
| Port 6379 (Redis) | Chỉ Docker network | Không expose |
| Port 19999 (Netdata) | Chỉ 127.0.0.1 | SSH tunnel |
| `/api/webhooks/sepay` | Public | HMAC + IP whitelist |
| `/api/auth/*` | Public | Rate limit nghiêm |
| `/api/admin/*` | Yêu cầu ADMIN role | RBAC guard |
| GHCR images | Private repo | Token auth |
| GitHub Actions secrets | Encrypted | Không expose trong logs |

### 1.4 Critical Assets

| Asset | Vị trí | Bảo vệ |
|-------|--------|--------|
| `passwordHash` | PostgreSQL `users.password_hash` | Argon2id, không select bình thường |
| `ENCRYPTION_KEY` | `.env` → Docker env | AES-256-GCM key, rotate 90 ngày |
| `AUTH_SECRET` | `.env` → Docker env | Auth.js session signing |
| Bank info (`*Enc`) | PostgreSQL bytes | AES-256-GCM encrypted |
| Content URLs (`contentUrlEnc`) | PostgreSQL bytes | AES-256-GCM, decrypt sau mua |
| SePay HMAC secret | `.env` | 64-char hex |
| SSL private key | `/opt/hethongmmo/infra/nginx/ssl/privkey.pem` | chmod 600 |
| User balance | PostgreSQL `users.balance` | `$transaction` + `SELECT FOR UPDATE` |

---

## PHẦN 2 — THREAT MODEL

### 2.1 OWASP Top 10 — Hiện trạng

| # | Threat | Trạng thái | Biện pháp |
|---|--------|-----------|-----------|
| A01 | Broken Access Control | ✅ Mitigated | `requireUser/Seller/Staff/Admin()`, IDOR check `userId=me.id` |
| A02 | Cryptographic Failures | ✅ Mitigated | Argon2id (password), AES-256-GCM (data), bcrypt (OTP), SHA-256 (token) |
| A03 | Injection (SQL/XSS) | ✅ Mitigated | Prisma parameterized query; DOMPurify; `SafeHtml` component |
| A04 | Insecure Design | ✅ Mitigated | Idempotency key, atomic `$transaction`, soft delete, Decimal money |
| A05 | Security Misconfiguration | ✅ Mitigated | `.env` không commit, security headers, `server_tokens off` |
| A06 | Vulnerable Components | ⚠️ Partial | `pnpm audit` chưa tự động trong CI |
| A07 | Auth Failures | ✅ Mitigated | Rate limit, lockout 15 phút, 2FA TOTP, session rotation |
| A08 | Integrity Failures | ✅ Mitigated | HMAC webhook, Zod validate mọi input |
| A09 | Security Logging | ✅ Mitigated | AuditLog table, Pino logger, retention 90 ngày |
| A10 | SSRF | ⚠️ Partial | Không có SSRF filter cho URL inputs; cần thêm |

### 2.2 Infrastructure Threats

| Threat | Nguy cơ | Biện pháp |
|--------|---------|-----------|
| L3/L4 DDoS | Cao | Cloudflare DDoS Protection (magic transit) |
| L7 Flood | Cao | CF Rate Limit + Nginx `limit_req_zone` |
| Bot / Credential Stuffing | Cao | CF Bot Fight Mode + loginRatelimit (10/phút) + account lockout |
| Brute Force Login | Cao | `loginRatelimit` + `lockedUntil` sau 5 lần sai |
| Brute Force OTP | Trung | `otpRatelimit` (3/5 phút) + maxAttempts=5 per OTP |
| API Abuse | Trung | `apiRatelimit` (100/phút) + `orderRatelimit` |
| Cache Poisoning | Thấp | `proxy_no_cache $http_cookie` — user có cookie không hit cache |
| Port Scan | Thấp | CF proxy ẩn VPS IP; ufw chặn mọi port trừ 22/80/443 |
| SePay Replay | Thấp | Timestamp check ±5 phút + `referenceCode` idempotency |

### 2.3 Internal Risks

| Risk | Nguy cơ | Biện pháp |
|------|---------|-----------|
| Secret leak qua git | Cao | `.env` trong `.gitignore`; CI scan (chưa có Gitleaks) |
| Container escape | Thấp | Non-root user (`nextjs:1001`), `no-new-privileges` |
| Supply chain attack | Trung | `pnpm install --frozen-lockfile`; cần Dependabot |
| CI/CD secret leak | Thấp | GitHub encrypted secrets; không print trong logs |
| Developer mistake (IDOR) | Trung | Code review checklist; `userId` bắt buộc trong query |
| Docker volume data leak | Thấp | `pg_data` volume không expose; backup encrypt |

---

## PHẦN 3 — AUTHENTICATION & SESSION

### 3.1 Auth Flow

```
Đăng ký:
  POST /dang-ky → Turnstile verify → Zod validate → bcrypt OTP hash
  → INSERT pending_registrations (TTL 10 phút)
  → Resend email OTP
  → POST /api/auth/verify-otp → verify bcrypt hash → INSERT users

Đăng nhập:
  POST /api/auth/signin (Auth.js v5)
  → Argon2id verify password
  → Check lockedUntil, status=ACTIVE
  → INSERT sessions (opaque token, HttpOnly Secure SameSite=Strict)
  → SET __Host-session cookie

2FA (tùy chọn):
  Setup: generate TOTP secret → encrypt(secret) → lưu twoFactorSecretEnc
  Verify: decrypt → otpauth.TOTP.validate() (RFC 6238, 30s window ±1)
```

### 3.2 Session Policy

- **Lưu trữ**: Database strategy (Auth.js v5) — không JWT stateless
- **Cookie**: `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Strict`
- **Expiry**: Session expire → force re-login
- **Revoke**: Logout xóa session khỏi DB ngay lập tức
- **Rotation**: RefreshToken rotation sau mỗi lần dùng

### 3.3 Password Policy

```
Minimum: 8 ký tự
Hash: Argon2id (memoryCost=65536, timeCost=3, parallelism=4)
Reset: OTP email → verify → set new hash
Lockout: 5 lần sai liên tiếp → lockedUntil = now + 15 phút
```

---

## PHẦN 4 — ENCRYPTION DETAILS

### 4.1 Encryption Matrix

| Data | Algorithm | Key Source | Lưu trữ |
|------|-----------|-----------|---------|
| Password | Argon2id | Derived from input | `users.password_hash` (string) |
| OTP code | bcrypt | Derived from code | `otp_codes.code_hash` (string) |
| Refresh token | SHA-256 | Token bytes | `refresh_tokens.token_hash` (string) |
| Bank info | AES-256-GCM | `ENCRYPTION_KEY` | `users.*_enc` (Bytes) |
| TutTrick URL | AES-256-GCM | `ENCRYPTION_KEY` | `tut_tricks.content_url_enc` (Bytes) |
| MMO item value | AES-256-GCM | `ENCRYPTION_KEY` | `mmo_product_items.value_enc` (Bytes) |
| Seller stock | AES-256-GCM | `ENCRYPTION_KEY` | `seller_product_stock.content_enc` (Bytes) |
| 2FA secret | AES-256-GCM | `ENCRYPTION_KEY` | `users.two_factor_secret_enc` (Bytes) |

### 4.2 AES-256-GCM Format

```
Buffer layout: [12-byte IV][ciphertext][16-byte auth tag]
- IV: randomBytes(12) — mỗi lần encrypt khác nhau
- Auth tag: 128-bit GCM authentication tag — chống tamper
```

### 4.3 Key Rotation

- `ENCRYPTION_KEY` rotate tối thiểu mỗi 90 ngày
- Khi rotate: re-encrypt tất cả `*_enc` fields trong `$transaction`
- Không có automated rotation hiện tại → **cần cải thiện**

---

## PHẦN 5 — RBAC MATRIX (đầy đủ)

| Action | Guest | User | Seller | Staff | Admin |
|--------|:-----:|:----:|:------:|:-----:|:-----:|
| Xem sản phẩm public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mua hàng | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem đơn hàng (own) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem profile (own) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Đăng ký seller | ❌ | ✅ | ❌ | ❌ | ✅ |
| Quản lý sản phẩm seller | ❌ | ❌ | ✅ (own) | ❌ | ✅ |
| Tạo/sửa sản phẩm hệ thống | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xóa sản phẩm | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem tất cả users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ban/Unban user | ❌ | ❌ | ❌ | ❌ | ✅ |
| Đổi role user | ❌ | ❌ | ❌ | ❌ | ✅ |
| Điều chỉnh balance | ❌ | ❌ | ❌ | ❌ | ✅ |
| Duyệt seller | ❌ | ❌ | ❌ | ❌ | ✅ |
| Duyệt rút tiền | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem audit log | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem tất cả đơn hàng | ❌ | ❌ | ❌ | ✅ | ✅ |
| System config | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## PHẦN 6 — SECURITY MATURITY ASSESSMENT

### 6.1 OWASP ASVS Level

| Category | Level đạt được | Ghi chú |
|----------|---------------|---------|
| Authentication | **Level 2** | Argon2id, lockout, 2FA; thiếu step-up auth toàn diện |
| Session | **Level 2** | Database session, secure cookie |
| Access Control | **Level 2** | RBAC đầy đủ, IDOR protection |
| Input Validation | **Level 2** | Zod + DOMPurify |
| Cryptography | **Level 2** | AES-256-GCM, không custom crypto |
| Error Handling | **Level 2** | toApiError(), không leak stack trace |
| Data Protection | **Level 2** | Encrypt sensitive fields |
| Communications | **Level 2** | TLS 1.2/1.3, HSTS preload |
| Logging | **Level 1** | AuditLog 90 ngày; thiếu centralized SIEM |
| Malicious Code | **Level 1** | Thiếu SAST/dependency scan tự động |

**Tổng điểm: ASVS Level 2** (phù hợp production, cần nâng Level 3 cho financial data)

### 6.2 Điểm yếu cần cải thiện (ưu tiên cao)

1. **SSRF protection** — Chưa validate URL khi user nhập URL thumbnail/link
2. **Dependency scan** — Chưa có `pnpm audit` trong CI
3. **Secret scan** — Chưa có Gitleaks/truffleHog trong CI
4. **ENCRYPTION_KEY rotation** — Manual, không có tooling
5. **Centralized logging** — Chưa có SIEM; logs phân tán trong containers
6. **Content-Security-Policy** — Hiện dùng `unsafe-inline` cho scripts (cần nonce đúng)

---

## PHẦN 7 — FUTURE SCALE SECURITY

### 7.1 Tại 10.000 user/ngày

**Bottleneck dự kiến:**
- PostgreSQL: ~500 concurrent connections → cần PgBouncer (có sẵn config `infra/pgbouncer/`)
- Upstash rate limit: latency tăng nếu ở region xa

**Security risk:**
- Brute force phân tán (distributed) có thể bypass per-IP rate limit → cần CF Bot Management
- AuditLog table tăng nhanh → cần partition by month

### 7.2 Tại 100.000 user/ngày

**Bottleneck dự kiến:**
- Single VPS không đủ → cần horizontal scale
- Session DB trở thành bottleneck

**Security risk:**
- Shared `ENCRYPTION_KEY` trên multiple instances → cần KMS (HashiCorp Vault / AWS KMS)
- Race condition khi scale horizontal → cần distributed lock (Redlock)
- Log volume lớn → cần ELK Stack hoặc Loki

**Đề xuất kiến trúc:**
```
CF CDN → CF Load Balancer
  → VPS #1 (Next.js) ─┐
  → VPS #2 (Next.js) ─┼→ PgBouncer → PostgreSQL Primary
  → VPS #3 (Next.js) ─┘          └→ PostgreSQL Replica (read)
                                  └→ Redis Cluster (rate limit)
                                  └→ HashiCorp Vault (secrets)
```

### 7.3 Tại 1.000.000 user/ngày

**Cần thiết kế lại:**
- Microservices: tách Auth, Payment, Product services
- Event-driven: Kafka/RabbitMQ cho async processing
- Database sharding hoặc CockroachDB
- WAF: Cloudflare Enterprise với custom WAF rules
- Zero Trust: mTLS giữa internal services
- HSM (Hardware Security Module) cho key management
