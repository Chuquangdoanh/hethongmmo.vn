# Quy trình thêm / sửa tính năng — Feature Workflow

> **Đọc file này trước khi:**
> - Thêm trường dữ liệu mới vào database
> - Thêm chức năng mới (API + UI)
> - Sửa chức năng hiện có
> - Sửa giao diện (UI / layout / component)

> **Sau khi hoàn thành:** Ghi kết quả vào `.claude/logs/completed-tasks.md`

---

## PHẦN 1 — Thêm trường dữ liệu mới (DB field)

### Bước 1: Sửa Prisma schema
File: `web/prisma/schema.prisma`

```prisma
model User {
  // Thêm field mới vào đúng model
  avatarUrl   String?   @map("avatar_url")  // optional field
  points      Int       @default(0)          // required với default
  tier        UserTier  @default(FREE)       // enum field

  @@map("users")
}

// Nếu cần enum mới — thêm ở khu vực ENUMS đầu file
enum UserTier {
  FREE
  SILVER
  GOLD
  VIP
}
```

**Quy tắc đặt tên:**
- TypeScript field: `camelCase` (e.g. `avatarUrl`)
- DB column: `snake_case` qua `@map("avatar_url")`
- Tiền/số thập phân: dùng `Decimal` + `@db.Decimal(20,2)`
- Dữ liệu nhạy cảm (bank, phone): lưu encrypted dạng `Bytes` + hậu tố `Enc`

### Bước 2: Tạo migration
```bash
cd web
pnpm prisma migrate dev --name <mô-tả-ngắn>
# Ví dụ: pnpm prisma migrate dev --name add-avatar-url-to-users
```

> **KHÔNG** dùng `migrate dev` trên production. Dùng `migrate deploy`.

### Bước 3: Regenerate Prisma Client
```bash
pnpm prisma generate
```

### Bước 4: TypeScript check
```bash
node node_modules/typescript/bin/tsc --noEmit
```
Sửa hết lỗi trước khi tiếp tục.

### Bước 5: Cập nhật code liên quan
Sau khi thêm field, kiểm tra và cập nhật:
- `src/lib/validation/<model>.schema.ts` — thêm field vào Zod schema nếu user được phép gửi
- `src/app/api/user/profile/route.ts` — thêm vào `select` nếu cần trả ra client
- `src/app/api/admin/users/[id]/route.ts` — nếu admin cần đọc/ghi
- `src/components/` — UI hiển thị field mới

---

## PHẦN 2 — Thêm chức năng mới (Full Stack)

### Luồng chuẩn: Validation → Service → API → UI

```
schema.ts  →  *.service.ts  →  route.ts  →  page.tsx / components
```

---

### Bước 1: Zod Schema (Input validation)
File: `src/lib/validation/<tên>.schema.ts`

```typescript
import { z } from "zod";

export const createCouponSchema = z.object({
  code:       z.string().min(3).max(20).toUpperCase().trim(),
  discount:   z.number().min(1).max(100),
  expiresAt:  z.string().datetime().optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
```

**Quy tắc:**
- Luôn dùng `safeParse`, KHÔNG dùng `parse`
- Trim string inputs
- Export cả type `z.infer<typeof schema>`

---

### Bước 2: Service (Business logic)
File: `src/lib/services/<tên>.service.ts`

```typescript
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CreateCouponInput } from "@/lib/validation/coupon.schema";

export async function createCoupon(input: CreateCouponInput, actorId: string) {
  // Kiểm tra duplicate
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new ValidationError("Mã coupon đã tồn tại");

  const coupon = await prisma.coupon.create({ data: { ...input, createdBy: actorId } });

  // Audit log nếu là admin action
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE_COUPON",
      targetType: "Coupon",
      targetId: coupon.id,
      after: { code: coupon.code },
    },
  });

  return coupon;
}
```

**Quy tắc:**
- Service KHÔNG biết về `req`, `session`, HTTP status
- Mọi thao tác tiền/balance: dùng `prisma.$transaction` với `SELECT FOR UPDATE`
- Throw `AppError` subclass, không throw string
- Admin actions: luôn ghi `auditLog`

---

### Bước 3: API Route Handler
Vị trí theo role:

| Role | Đường dẫn |
|------|-----------|
| User | `src/app/api/user/<tên>/route.ts` |
| Admin | `src/app/api/admin/<tên>/route.ts` |
| Seller | `src/app/api/seller/<tên>/route.ts` |
| Public | `src/app/api/products/<tên>/route.ts` |

```typescript
// src/app/api/admin/coupons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { createCouponSchema } from "@/lib/validation/coupon.schema";
import { createCoupon } from "@/lib/services/coupon.service";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET danh sách
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);  // hoặc requireUser / requireSeller / requireStaff

    const page  = Number(req.nextUrl.searchParams.get("page")  ?? 1);
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);

    const [data, total] = await Promise.all([
      prisma.coupon.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.coupon.count(),
    ]);

    return apiList(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

// POST tạo mới
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const coupon = await createCoupon(parsed.data, me.id);
    return apiOk(coupon);
  } catch (err) {
    return apiCatch(err);
  }
}
```

**Thứ tự bắt buộc trong mọi handler:**
1. `const session = await auth()`
2. `requireUser/Seller/Staff/Admin(session)` — throw nếu không đủ quyền
3. `schema.safeParse(body)` — validate input
4. Gọi service
5. Return `apiOk` / `apiList` / `apiSuccess`
6. `catch (err) { return apiCatch(err) }`

**KHÔNG BAO GIỜ:**
- Return `password_hash`, `*_enc` fields ra client
- Dùng `NextResponse.json()` trực tiếp (dùng helpers trong `api-response.ts`)
- Leak stack trace

---

### Bước 4: Frontend Page

#### 4a. UI Page (Server Component mặc định)
```
src/app/(admin)/admin/<tên>/page.tsx       ← admin
src/app/(user)/<tên>/page.tsx              ← user
src/app/(public)/<tên>/page.tsx            ← public
```

```tsx
// Server Component — fetch data trực tiếp, không cần useEffect
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

export default async function CouponsPage() {
  const session = await auth();
  requireAdmin(session);

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1>Quản lý Coupon</h1>
      {/* ... */}
    </div>
  );
}
```

#### 4b. Components riêng của trang
```
src/app/(admin)/admin/<tên>/_components/<TênComponent>.tsx
```

Chỉ thêm `"use client"` khi cần: `useState`, `useEffect`, event handler, browser API.

#### 4c. Shared components (dùng nhiều nơi)
```
src/components/shared/<TênComponent>.tsx
```

---

## PHẦN 3 — Thêm chức năng vào tính năng đã có

### Thêm field vào API response đã có
1. Thêm field vào `select: { ... }` trong route handler
2. Nếu field là `*_enc`: decrypt rồi trả ra, KHÔNG trả raw bytes
3. TypeScript check: `tsc --noEmit`

### Thêm endpoint mới vào resource đã có
Ví dụ đã có `api/admin/users/[id]/route.ts`, muốn thêm "reset password" cho admin:
```
src/app/api/admin/users/[id]/reset-password/route.ts
```

### Sửa business logic
1. Sửa trong `lib/services/<tên>.service.ts`
2. Chạy `tsc --noEmit`
3. Chạy tests liên quan: `pnpm test -- --testPathPattern="<tên>.service"`

---

## PHẦN 4 — Checklist trước khi báo xong

### Bắt buộc
- [ ] `tsc --noEmit` — exit 0
- [ ] Không có `password_hash` / `*_enc` lọt ra response
- [ ] Không có `Math.random()` cho token/OTP
- [ ] Mọi query có `WHERE userId = me.id` (IDOR protection)
- [ ] Mọi thao tác tiền trong `prisma.$transaction`
- [ ] Admin actions có `auditLog`

### Theo loại thay đổi
| Thay đổi | Thêm checklist |
|---------|---------------|
| Prisma schema | `prisma migrate dev` → `prisma generate` → `tsc` |
| API mới | Test curl: happy path + invalid input + unauthorized |
| UI page mới | Không có lỗi hydration, mobile responsive |
| Business service | Test edge cases: số dư âm, concurrent, idempotency |

---

## PHẦN 5 — Ví dụ nhanh

### Thêm trường `bio` vào User
```
1. schema.prisma: thêm bio String? @map("bio")
2. pnpm prisma migrate dev --name add-bio-to-users
3. pnpm prisma generate
4. user.schema.ts: thêm bio: z.string().max(500).optional() vào updateProfileSchema
5. api/user/profile/route.ts: thêm bio vào select{} và updateData
6. (user)/thong-tin-ca-nhan/page.tsx: thêm input field bio
```

### Thêm tính năng "Xem lịch sử đăng nhập"
```
1. KHÔNG cần thêm DB field (đã có lastLoginAt, lastLoginIp)
2. Tạo: src/app/api/user/login-history/route.ts
3. Tạo: src/app/(user)/lich-su-dang-nhap/page.tsx
```

### Thêm tính năng admin "Gửi thông báo hàng loạt"
```
1. schema.prisma: không cần (đã có Notification model)
2. src/lib/services/broadcast.service.ts — business logic
3. src/lib/validation/broadcast.schema.ts — Zod schema
4. src/app/api/admin/broadcast/route.ts — POST handler
5. src/app/(admin)/admin/broadcast/page.tsx — UI form
```

---

## PHẦN 6 — Sửa giao diện (UI / Layout / Component)

### Nguyên tắc trước khi sửa UI

1. **Đọc file cần sửa** — hiểu component đang làm gì trước khi chỉnh
2. **Xác định loại component** — Server Component hay Client Component?
3. **KHÔNG thêm `"use client"` vô tội vạ** — chỉ thêm khi thực sự cần

---

### Phân biệt Server vs Client Component

| Dấu hiệu cần `"use client"` | Không cần `"use client"` |
|-----------------------------|--------------------------|
| `useState`, `useEffect`, `useRef` | Chỉ render HTML tĩnh |
| Event handler: `onClick`, `onMouseEnter` | Fetch data từ DB/API |
| Browser API: `window`, `document` | `async/await` trong component |
| Hook của thư viện client | Nhận props từ Server Component |

---

### Quy tắc import — QUAN TRỌNG

**Server Component KHÔNG được import vào Client Component.**

```
❌ SAI — Client Component import Server Component có prisma/auth:
"use client"
import Header from "@/components/layout/Header"  // Header dùng prisma → lỗi dns/pg

✅ ĐÚNG — Server Component import Client Component:
// page.tsx (Server Component, không có "use client")
import ClientButton from "./_components/ClientButton"  // ClientButton có "use client"
```

**Nếu page cần cả server data lẫn client interaction:**
```tsx
// page.tsx — Server Component, fetch data
export default async function Page() {
  const data = await prisma.something.findMany();  // server-side
  return <ClientTable data={data} />;              // truyền data xuống client
}

// _components/ClientTable.tsx — Client Component, xử lý interaction
"use client";
export function ClientTable({ data }) {
  const [filter, setFilter] = useState("");
  // ...
}
```

---

### Vị trí file khi sửa UI

| Muốn sửa | File cần tìm |
|----------|-------------|
| Layout chung (Header, Footer) | `src/components/layout/` |
| Trang user | `src/app/(user)/<tên>/page.tsx` |
| Trang admin | `src/app/(admin)/admin/<tên>/page.tsx` |
| Trang public | `src/app/(public)/<tên>/page.tsx` |
| Component dùng chung | `src/components/shared/` |
| Component chỉ 1 trang | `src/app/.../<tên>/_components/` |
| Styles global | `src/app/globals.css` |
| Font, metadata | `src/app/layout.tsx` |

---

### Quy trình sửa giao diện

**Bước 1: Đọc file** — xác định đây là Server hay Client Component

**Bước 2: Tìm component con** — nếu UI phức tạp, tìm đúng component cần sửa

**Bước 3: Sửa** — tuân thủ các quy tắc sau:
- Không dùng `dangerouslySetInnerHTML` — dùng `SafeHtml` component
- Không hardcode màu/font nếu đã có Tailwind token
- Không duplicate style — dùng `clsx` hoặc Tailwind classes
- Responsive: luôn kiểm tra mobile (`< 768px`)

**Bước 4: Kiểm tra**
```bash
# TypeScript check
node node_modules/typescript/bin/tsc --noEmit

# Mở trình duyệt xem kết quả thực tế
# Kiểm tra: desktop + mobile, không có lỗi console
```

---

### Các lỗi UI phổ biến và cách tránh

| Lỗi | Nguyên nhân | Fix |
|-----|------------|-----|
| `Module not found: Can't resolve 'dns'` | Client Component import server module (prisma/pg) | Chuyển page vào route group có layout, hoặc tách server/client |
| Hydration mismatch | Server render khác client render | Không dùng `Date.now()`, `Math.random()` trong render |
| `params` is not awaited | Next.js 16: params là Promise | `const { id } = await params` |
| Lỗi trắng trang | `"use client"` import server component | Tách thành 2 component riêng |

---

### Ví dụ sửa giao diện

**Sửa màu nút trong trang user:**
```
1. Tìm file: src/app/(user)/nap-tien/page.tsx
2. Tìm component Button liên quan
3. Sửa Tailwind class hoặc inline style
4. tsc --noEmit → OK
5. Xem browser
```

**Thêm cột mới vào bảng admin:**
```
1. Tìm file: src/app/(admin)/admin/users/page.tsx
2. Thêm <th> vào header và <td> vào row
3. Nếu cần data mới: thêm field vào prisma select{} trong page
4. tsc --noEmit → OK
```

**Sửa Header (hiển thị thêm thông tin):**
```
1. File: src/components/layout/Header.tsx (Server Component)
2. Thêm field vào prisma.user.findUnique select{}
3. Truyền xuống UserMenu hoặc component con
4. tsc --noEmit → OK
```

---

## PHẦN 7 — Ghi nhật ký sau khi hoàn thành

### Bắt buộc ghi vào `.claude/logs/completed-tasks.md` sau mỗi task

**Áp dụng khi hoàn thành:**
- Sửa giao diện (UI / layout / component)
- Thêm chức năng mới
- Thêm DB field
- Sửa API
- Fix bug

### Format ghi log

```markdown
## YYYY-MM-DD

### ✅ <Tên nhiệm vụ ngắn gọn>
**Việc đã làm:** Mô tả 1-2 câu những gì đã thực hiện.
**File đã thay đổi:**
- `đường/dẫn/file.tsx` — mô tả thay đổi (tạo mới / sửa / xóa)
- `đường/dẫn/file2.ts` — mô tả thay đổi
```

### Quy tắc bất di bất dịch

- **KHÔNG sửa lại** mục đã có ✅ và ngày tháng
- **CHỈ thêm** mục mới xuống dưới cùng
- Nếu nhiều task trong cùng 1 ngày: gộp dưới cùng 1 `## YYYY-MM-DD`
- Nếu sửa lại task cũ (do bug): thêm mục mới với tên `✅ Fix lại: <tên task cũ>`, KHÔNG xóa mục cũ

### Ví dụ

```markdown
## 2026-05-24

### ✅ Sửa giao diện trang nạp tiền
**Việc đã làm:** Đổi màu nút "Nạp ngay" sang xanh, thêm icon, fix responsive mobile.
**File đã thay đổi:**
- `src/app/(user)/nap-tien/page.tsx` — sửa style nút, thêm responsive class

### ✅ Thêm trường `bio` vào User
**Việc đã làm:** Thêm field bio vào DB, API profile, và UI trang thông tin cá nhân.
**File đã thay đổi:**
- `web/prisma/schema.prisma` — thêm bio String?
- `src/lib/validation/user.schema.ts` — thêm bio vào updateProfileSchema
- `src/app/api/user/profile/route.ts` — thêm bio vào select và updateData
- `src/app/(user)/thong-tin-ca-nhan/page.tsx` — thêm input field bio
```
