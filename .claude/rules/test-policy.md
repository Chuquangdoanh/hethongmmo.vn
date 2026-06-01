# Chính sách test — Test ngay sau fix/update

## Quy tắc bắt buộc

**Sau MỌI thay đổi code, chạy kiểm tra trước khi báo xong:**

```bash
# 1. TypeScript check (bắt buộc, nhanh nhất)
node node_modules/typescript/bin/tsc --noEmit

# 2. Lint check
pnpm lint

# 3. Unit tests liên quan (nếu có)
pnpm test -- --testPathPattern="<pattern>"

# 4. Build check nếu thay đổi cấu hình
pnpm build
```

## Phân loại theo mức độ thay đổi

### Sửa bug / thêm logic nhỏ
- [ ] `tsc --noEmit` → phải exit 0
- [ ] Chạy test file liên quan trực tiếp
- [ ] Smoke test thủ công: curl hoặc browser check

### Thêm API route mới
- [ ] `tsc --noEmit`
- [ ] Test với curl: happy path + invalid input + unauthorized
- [ ] Kiểm tra response format đúng `{ success, data }` / `{ success, error, code }`
- [ ] Kiểm tra audit_log được ghi nếu là admin action

### Thêm UI page / component
- [ ] `tsc --noEmit`
- [ ] Kiểm tra không có lỗi hydration trong console
- [ ] Kiểm tra mobile responsive (< 768px)
- [ ] Kiểm tra auth guard redirect đúng

### Thay đổi Prisma schema
- [ ] `pnpm prisma generate`
- [ ] `pnpm prisma migrate dev` (dev) hoặc `pnpm prisma migrate deploy` (prod)
- [ ] `tsc --noEmit` lại sau generate
- [ ] Test tất cả queries liên quan đến model đã đổi

### Thay đổi business service (tiền, order, withdrawal)
- [ ] `tsc --noEmit`
- [ ] Chạy unit tests liên quan
- [ ] Test edge cases: số dư âm, concurrent requests, idempotency key

## Checklist bảo mật (cho mọi thay đổi)

- [ ] Không có `password_hash` / `*_enc` nào lọt ra response?
- [ ] Không có `Math.random()` nào dùng cho token/OTP?
- [ ] Không có `dangerouslySetInnerHTML`?
- [ ] Mọi query có `WHERE userId = session.userId` (IDOR protection)?
- [ ] Mọi thao tác tiền có trong `prisma.$transaction`?

## Khi test thất bại

1. **Không commit code lỗi** — sửa ngay trước khi tiếp tục
2. **Không workaround bằng `// @ts-ignore`** — tìm nguyên nhân thực sự
3. Nếu test flaky (fail không ổn định): ghi issue + tag `[FLAKY]` trong test name
4. Nếu tsc có lỗi `null` vs `undefined`: dùng `?? undefined` để convert

## Lệnh test nhanh tham khảo

```bash
# Typecheck toàn bộ project
cd C:\Hethongmmo\web && node node_modules/typescript/bin/tsc --noEmit

# Test 1 service cụ thể
pnpm test -- --testPathPattern="deposit.service"

# E2E test auth flow
pnpm playwright test tests/e2e/auth.spec.ts

# Test webhook (cần server chạy)
curl -X POST http://localhost:3000/api/webhooks/sepay \
  -H "Content-Type: application/json" \
  -H "X-SePay-Hmac: <hmac>" \
  -d '{"transferType":"in","amount":100000,...}'
```
