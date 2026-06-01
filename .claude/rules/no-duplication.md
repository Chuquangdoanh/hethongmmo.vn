# Quy tắc không lặp code (DRY)

## Nguyên tắc cốt lõi

**Trước khi viết bất kỳ logic mới nào, tìm kiếm xem đã có chưa.**

```bash
# Tìm theo tên hàm
grep -r "functionName" web/src/

# Tìm theo pattern
grep -r "prisma.user.findUnique" web/src/app/api/
```

---

## Các abstraction đã có — PHẢI dùng, không viết lại

### Auth & RBAC (`web/src/lib/auth/rbac.ts`)
```typescript
requireUser(session)    // throw 401 nếu không có session
requireSeller(session)  // throw 403 nếu role < SELLER
requireStaff(session)   // throw 403 nếu role < STAFF
requireAdmin(session)   // throw 403 nếu role !== ADMIN
```

### Error classes (`web/src/lib/errors.ts`)
```typescript
// Business errors (tất cả extend AppError)
throw new NotFoundError("Sản phẩm")           // 404
throw new ValidationError("Email không hợp lệ") // 400
throw new InsufficientBalanceError(current, required) // 402
throw new DuplicateError("email")              // 409
throw new OutOfStockError()                    // 409
throw new ItemInactiveError()                  // 400

// Auth errors (web/src/lib/auth/rbac.ts — extend AppError)
// AppAuthError: throw tự động từ requireUser/Admin/...

// Trong catch block của route handler:
const e = toApiError(err); // xử lý MỌI loại AppError + generic Error
return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
```

> **Quy tắc:** `AppAuthError` extends `AppError` — `toApiError()` xử lý cả hai.
> KHÔNG tạo thêm class Error mới nếu không cần code/statusCode riêng.

### API Response helpers (`web/src/lib/api-response.ts`)
```typescript
// Dùng trong MỌI route handler — không return NextResponse.json() trực tiếp
apiOk(data)                        // { data } — GET single / POST create
apiList(data, { total, page, limit, totalPages }) // { data, meta } — GET list
apiSuccess("message")              // { success: true, message } — PATCH/DELETE no data
apiError("message", "CODE", 400)   // { error, code }
apiCatch(err)                      // catch block: tự convert AppError/Error → response
apiValidationError(issues)         // Zod safeParse failure
```

**Ví dụ route handler chuẩn:**
```typescript
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) return apiValidationError(query.error.issues);

    const data = await prisma.something.findMany({ where: { userId: me.id } });
    return apiList(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}
```

### Audit log (`web/src/lib/security/audit.ts`)
```typescript
writeAuditLog({ actorId, action, targetType, targetId, before, after })
// Bắt buộc sau MỌI admin action
```

### Encryption (`web/src/lib/security/encryption.ts`)
```typescript
encrypt(plaintext)  // → Buffer (AES-256-GCM)
decrypt(buffer)     // → string
```

### HMAC (`web/src/lib/security/hmac.ts`)
```typescript
signHmac(secret, payload)                  // webhook signing
verifyHmac(secret, payload, signature)     // timing-safe verify
```

### Rate limit (`web/src/lib/security/rate-limit.ts`)
```typescript
// Dùng các limiter đã định nghĩa sẵn:
loginRatelimit, otpRatelimit, apiRatelimit, tickerRatelimit, resendOtpEmailRatelimit

checkRateLimit(limiter, identifier) // → { success, remaining }
```

### Format tiền / ngày (`web/src/lib/utils/`)
```typescript
formatVnd(amount)    // 50000 → "50.000đ"
formatDate(date)     // ISO → "22/05/2026 14:30"
```

### Shared UI components
- `SafeHtml` — hiển thị HTML user-generated (bắt buộc thay `dangerouslySetInnerHTML`)
- `CopyButton` — copy to clipboard
- `Skeleton` — loading states
- `Pagination` — props: `currentPage`, `totalPages`, `basePath`, `searchParams`
- `SimpleOrderButton` — props: `itemId`, `orderType`, `itemName`, `price`, `isLoggedIn`

---

## Bản đồ routes — phân biệt public vs private

| Route prefix | Mục đích | Auth |
|-------------|---------|------|
| `api/products/*` | Public marketplace data | Public GET / Staff POST/PATCH/DELETE |
| `api/products/seller` | Public seller marketplace listing | Public |
| `api/seller/*` | Seller quản lý sản phẩm của mình | SELLER role |
| `api/admin/*` | Admin management | ADMIN/STAFF role |
| `api/user/*` | User self-service | USER role |
| `api/orders/*` | Order flow | USER role |
| `api/webhooks/*` | External webhooks (SePay) | HMAC verify, no session |

> **`api/products/seller`** ≠ **`api/seller/products`**:
> - `/api/products/seller` = khách hàng duyệt marketplace (public, read-only)
> - `/api/seller/products` = người bán quản lý sản phẩm (CRUD, cần SELLER role)

---

## Dependencies — chỉ dùng thư viện đã có

| Mục đích | Dùng cái này | KHÔNG dùng |
|---------|-------------|-----------|
| Password hash | `argon2` | bcrypt cho password |
| OTP hash | `bcryptjs` | argon2 cho OTP |
| AES encryption | Node.js `crypto` | `@noble/ciphers` (đã xóa) |
| TOTP 2FA | `otpauth` | — |
| Rate limit | `@upstash/ratelimit` + `@upstash/redis` | `ioredis` (đã xóa) |
| JWT | Auth.js v5 tự handle | `jose` (đã xóa) |
| HTTP security headers | `nginx.conf` | `helmet` (đã xóa) |
| Validation | `zod` (luôn dùng `safeParse`, không dùng `parse`) | `yup`, `joi` |

---

## Khi nào được duplicate

1. **Test fixtures** — mock data trong tests không cần extract
2. **Tailwind classes** — lặp class string là OK, không cần extract component cho < 3 lần dùng
3. **Type definitions** trong cùng 1 file — OK nếu chỉ dùng locally

## Quy trình kiểm tra trước khi tạo component/function mới

1. Đã có abstraction trong bảng trên chưa?
2. Có thể tham số hóa component hiện tại không (`variant`, `size`, `children`)?
3. Có thể dùng composition (`children` prop) thay vì duplicate không?

Nếu cả 3 đều "không" → mới tạo mới.
