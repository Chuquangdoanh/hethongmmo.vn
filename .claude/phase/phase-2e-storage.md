<!-- COMPLETED: 2026-05 — Storage + Email hoàn thành -->
<!-- R2 presigned URL, avatar upload, email templates với Resend đều đã có. -->

# Phase 2E — Storage & Email

**Status: ✅ HOÀN THÀNH**

## Mục tiêu
File storage (Cloudflare R2) và transactional email (Resend).

## Đã hoàn thành

### Storage (`web/src/lib/storage/`)

- [x] `r2.ts` — S3Client init với Cloudflare R2 endpoint
- [x] `presigned.ts`
  - `getUploadPresignedUrl(key, contentType, maxSizeMB)` → `PutObjectCommand` URL, 5 phút TTL
  - `getDownloadPresignedUrl(key)` → `GetObjectCommand` URL, 1 giờ TTL
  - Key pattern: `avatars/{userId}/{uuid}.{ext}`, `products/{type}/{id}/{uuid}.{ext}`
  - Max upload size enforced server-side via `ContentLengthRange` condition

### Avatar Upload Flow

```
Client → POST /api/user/upload-avatar (filename, contentType)
       ← { uploadUrl, key, publicUrl }
Client → PUT uploadUrl (raw file, direct to R2)
Client → PATCH /api/user/profile { avatarUrl: publicUrl }
```

- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Max size: 2MB
- Old avatar key cleanup: DELETE old object khi user đổi avatar

### Email Service (`web/src/lib/services/email.service.ts`)

Tất cả dùng **Resend SDK** — không template engine ngoài.

| Function | Khi gửi |
|----------|---------|
| `sendOtpEmail({ to, code, purpose })` | Register, forgot password |
| `sendOrderConfirmation({ to, order })` | Sau khi mua thành công |
| `sendDepositEmail({ to, amount, balance })` | Sau khi nạp tiền thành công |
| `sendSellerApprovedEmail({ to, category, maxProducts })` | Admin duyệt seller |
| `sendWithdrawalEmail({ to, netAmount, status, rejectReason? })` | Withdrawal processed |
| `sendPasswordResetEmail({ to, resetToken })` | Forgot password flow |

### Email Design

- Inline CSS, dark theme `#14141F` background, `#7C3AED` brand color
- Plain HTML string (không dùng React Email hay MJML)
- Footer: "Không reply email này", unsubscribe note
- `from`: `noreply@hethongmmo.vn` (cấu hình `RESEND_FROM`)

## Env vars cần thiết

```bash
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=chuquangdoanh
S3_PUBLIC_URL=https://cdn.hethongmmo.vn

RESEND_API_KEY=
RESEND_FROM=noreply@hethongmmo.vn
```
