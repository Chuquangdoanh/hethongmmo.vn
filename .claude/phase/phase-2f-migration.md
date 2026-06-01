<!-- COMPLETED: 2026-05-23 — Phase 2F hoàn thành -->
<!-- Migration script, 82 unit+integration tests, 3 GitHub Actions workflows đã có. -->

# Phase 2F — Migration, Tests & CI/CD

**Status: ❌ CHƯA BẮT ĐẦU**

## Mục tiêu
1. Script migrate dữ liệu từ Firebase/Firestore sang PostgreSQL
2. Vitest unit + integration tests
3. Playwright E2E tests
4. GitHub Actions CI/CD workflows

---

## 2F-1 — Migration Script

**File:** `scripts/migrate-from-firestore.ts`

### Yêu cầu

- [x] Đọc từ Firestore Admin SDK
- [ ] Checkpoint/resume — lưu offset vào file `.migration-checkpoint.json`
- [ ] Dry-run mode (`--dry-run` flag) — log nhưng không INSERT
- [ ] Batch size 500 records/batch
- [ ] Error log → `migration-errors.log` (skip và tiếp tục thay vì crash)
- [ ] Progress bar (bao nhiêu records đã xử lý / tổng)
- [ ] Idempotent — chạy lại không tạo duplicate (dùng `upsert` với `conflictPaths`)

### Collections cần migrate

| Firestore collection | PostgreSQL table | Ghi chú |
|---------------------|-----------------|---------|
| `users` | `User` | Hash lại password nếu Firebase Auth, set `passwordHash = '$RESET_REQUIRED$'` |
| `orders` | `Order` + `Transaction` | Tạo cả transaction tương ứng |
| `products` | `MmoProduct` + `MmoProductItem` | Decrypt content từ Firestore nếu đã encrypt |
| `seller_products` | `SellerProduct` + `SellerProductStock` | |
| `transactions` | `Transaction` | |
| `notifications` | `Notification` | |

### Command

```bash
pnpm tsx scripts/migrate-from-firestore.ts
pnpm tsx scripts/migrate-from-firestore.ts --dry-run
pnpm tsx scripts/migrate-from-firestore.ts --collection=users --batch=100
```

---

## 2F-2 — Tests

### Unit Tests (`web/src/lib/`)

- [ ] `security/encryption.test.ts` — encrypt → decrypt round trip, wrong key throws
- [ ] `security/hmac.test.ts` — sign + verify, tampered payload fails
- [ ] `auth/password.test.ts` — hash + verify, strength validation
- [ ] `services/otp.service.test.ts` — generate → verify, expired OTP fails, max attempts
- [ ] `services/purchase.service.test.ts` — mock prisma, insufficient balance, sold out
- [ ] `services/deposit.service.test.ts` — duplicate reference_code throws `DuplicateError`
- [ ] `services/withdrawal.service.test.ts` — fee calculation, config-based hold days

### Integration Tests

- [ ] `api/orders.test.ts` — POST order, idempotency (same key → same response)
- [ ] `api/admin/users.test.ts` — ban/unban, role change, balance adjust
- [ ] `api/webhooks/sepay.test.ts` — valid HMAC succeeds, invalid HMAC 401, duplicate ref 200 skip

### Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { reporter: ['text', 'lcov'] },
  },
})
```

---

## 2F-3 — CI/CD Workflows

### `ci.yml` — chạy trên mọi PR và push

```yaml
on: [push, pull_request]
jobs:
  lint: pnpm lint
  typecheck: pnpm tsc --noEmit
  test: pnpm vitest run --coverage
  build: pnpm build
```

### `deploy-staging.yml` — push vào `develop`

```yaml
on:
  push:
    branches: [develop]
jobs:
  deploy:
    - docker build + push to registry
    - SSH vào staging server
    - docker compose pull + up -d
    - pnpm prisma migrate deploy
```

### `deploy-production.yml` — push vào `main`

```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    - Tương tự staging nhưng production server
    - Thêm health check sau deploy
    - Rollback tự động nếu health check fail
```

### Secrets cần set trong GitHub

```
DATABASE_URL, AUTH_SECRET, DATA_ENCRYPTION_KEY,
SEPAY_WEBHOOK_SECRET, RESEND_API_KEY,
S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
REDIS_URL, TURNSTILE_SECRET_KEY,
DEPLOY_SSH_KEY, STAGING_HOST, PRODUCTION_HOST
```

---

## Thứ tự thực hiện

1. `scripts/migrate-from-firestore.ts` — test với dry-run trước
2. Unit tests cho security libs + services
3. Integration tests cho critical API routes
4. CI workflow (`ci.yml`) — unblock PRs
5. Deploy workflows sau khi staging server sẵn sàng
