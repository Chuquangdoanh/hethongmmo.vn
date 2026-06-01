# Security Rules — Defense in Depth

## Quy tắc TUYỆT ĐỐI (vi phạm = reject PR ngay)

### 1. Không leak sensitive data
```typescript
// ❌ NEVER
select: { passwordHash: true, bankNameEnc: true, twoFactorSecretEnc: true }

// ✅ ALWAYS explicit allowlist
select: { id: true, email: true, fullName: true, role: true }
```

Danh sách fields tuyệt đối không được select/return ra API:
- `passwordHash`
- `bankNameEnc`, `bankAccountNumberEnc`, `bankAccountHolderEnc`
- `twoFactorSecretEnc`
- `contentUrlEnc` (TutTrick)
- `valueEnc` (MmoProductItem)
- `contentEnc` (SellerProductStock)

### 2. Không dùng Math.random() cho token/OTP/key
```typescript
// ❌
const otp = Math.floor(Math.random() * 1000000).toString()

// ✅
import { randomInt } from "crypto"
const otp = randomInt(100000, 999999).toString()

// ✅ cho token
import { randomBytes } from "crypto"
const token = randomBytes(32).toString("hex")
```

### 3. Không SQL injection
```typescript
// ❌
prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ tagged template (Prisma tự escape)
prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
```

### 4. Không XSS
```typescript
// ❌
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅
import SafeHtml from "@/components/shared/SafeHtml"
<SafeHtml html={userContent} />
```

### 5. Không bỏ qua auth guard
```typescript
// Mọi route handler phải có:
const session = await auth()
const user = requireUser(session) // hoặc requireSeller/Admin

// Mọi user-data query phải có IDOR protection:
where: { id: orderId, userId: user.id } // ← không bỏ userId!
```

## Thứ tự kiểm tra trong Route Handler

```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await auth()
    const actor = requireUser(session) // / requireAdmin(session)

    // 2. Rate limit (nếu cần)
    await rateLimit(`user:${actor.id}:action`, 20, 60)

    // 3. Input validation
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return error400(parsed.error)

    // 4. Business logic
    const result = await someService(parsed.data)

    // 5. Audit log (nếu là admin action)
    await writeAuditLog({ actorId: actor.id, action: "...", ... })

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode })
    }
    const e = toApiError(err)
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode })
  }
}
```

## Tiền và transaction

```typescript
// ❌ Không transaction
await prisma.user.update({ where: { id }, data: { balance: newBalance } })
await prisma.transaction.create({ ... })

// ✅ Luôn transaction + SELECT FOR UPDATE
await prisma.$transaction(async (tx) => {
  const locked = await tx.user.findUniqueOrThrow({ where: { id } }) // lock row
  const newBalance = Number(locked.balance) + amount
  if (newBalance < 0) throw new InsufficientBalanceError()
  await tx.user.update({ where: { id }, data: { balance: newBalance } })
  await tx.transaction.create({ ... })
})
```

## Mật khẩu

```typescript
// Hash: Argon2id với params bảo mật cao
import argon2 from "argon2"
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 4,
})

// Verify: selalu pakai argon2.verify — không tự compare
const valid = await argon2.verify(storedHash, inputPassword)
```

## Webhook security (SePay)

1. Verify IP whitelist (`SEPAY_IP_WHITELIST`)
2. Check timestamp ± 5 phút (replay attack)
3. HMAC-SHA256 verify bằng `crypto.timingSafeEqual` (không `===`)
4. Idempotency: check `reference_code` đã tồn tại
5. Luôn return 200 ngay cả khi lỗi (để SePay không retry)

## Mã hóa dữ liệu nhạy cảm

```typescript
// Tất cả bank info, stock item content → encrypt trước khi lưu DB
import { encrypt, decrypt } from "@/lib/security/encryption"

// Encrypt khi lưu
const encrypted = encrypt(plaintext) // AES-256-GCM, random nonce

// Decrypt khi đọc (chỉ server-side, không bao giờ client)
const plaintext = decrypt(encryptedBuffer)
```

## Content Security Policy

- `nonce` được tạo trong root layout từ `headers()['x-nonce']`
- Không dùng `unsafe-inline` cho scripts
- Cloudflare Turnstile captcha cho register + sensitive actions

## Các lỗi response chuẩn

```typescript
// Thành công
{ success: true, data: { ... } }                           // 200/201

// Lỗi client
{ success: false, error: "Mô tả cho user", code: "SNAKE_CASE_CODE" }  // 400/401/403/404/409/422

// Lỗi server
{ success: false, error: "Lỗi hệ thống", code: "INTERNAL_ERROR" }     // 500
```

Không bao giờ trả stack trace, tên file, hoặc chi tiết DB ra ngoài.
