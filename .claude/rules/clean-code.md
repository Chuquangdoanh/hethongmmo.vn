# Clean Code & Cấu trúc Tree

> **Áp dụng cho mọi file được tạo mới hoặc sửa.**
> Mục tiêu: code dễ đọc, dễ bảo trì, dễ tìm kiếm — không cần giải thích thêm.

---

## PHẦN 1 — CLEAN CODE

### 1.1 Đặt tên nói lên ý nghĩa

```typescript
// ❌ Tối nghĩa
const d = new Date();
const x = users.filter(u => u.s === 1);
function proc(data: any) { ... }

// ✅ Rõ ràng
const createdAt = new Date();
const activeUsers = users.filter(u => u.status === "ACTIVE");
function processWithdrawalRequest(input: WithdrawalInput) { ... }
```

**Quy tắc đặt tên:**

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Boolean | `is`, `has`, `can`, `should` | `isVerified`, `hasBalance`, `canWithdraw` |
| Hàm lấy data | `get`, `fetch`, `find` | `getUserById`, `findActiveOrders` |
| Hàm kiểm tra | `check`, `verify`, `validate` | `checkRateLimit`, `verifyHmac` |
| Hàm tạo mới | `create`, `build`, `make` | `createOrder`, `buildAuditEntry` |
| Hàm cập nhật | `update`, `set`, `apply` | `updateUserBalance`, `setOrderStatus` |
| Handler async | tên + `Async` hoặc `await` rõ | `fetchUserAsync` hoặc dùng `await` tường minh |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `OTP_EXPIRE_SECONDS` |

---

### 1.2 Hàm ngắn, một nhiệm vụ

```typescript
// ❌ Một hàm làm quá nhiều việc
async function handleOrder(userId: string, itemId: string) {
  const user = await prisma.user.findUnique(...);
  if (!user) throw new Error("...");
  const item = await prisma.item.findUnique(...);
  if (!item) throw new Error("...");
  if (item.stock < 1) throw new Error("...");
  const balance = Number(user.balance);
  if (balance < Number(item.price)) throw new Error("...");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { balance: balance - Number(item.price) } });
    await tx.item.update({ where: { id: itemId }, data: { stock: item.stock - 1 } });
    await tx.order.create({ ... });
    await tx.auditLog.create({ ... });
  });
  await sendEmail(user.email, "...");
  return { success: true };
}

// ✅ Tách nhỏ, mỗi hàm một việc
async function handleOrder(userId: string, itemId: string) {
  const { user, item } = await fetchOrderDependencies(userId, itemId);
  validateOrderEligibility(user, item);
  const order = await executeOrderTransaction(user, item);
  await sendOrderConfirmationEmail(user.email, order);
  return order;
}
```

**Giới hạn:**
- Mỗi hàm tối đa **30 dòng** (không tính blank lines và comments)
- Nếu vượt quá: tách ra hàm con có tên rõ ràng
- Độ sâu lồng nhau tối đa **3 cấp** — quá 3 cấp thì extract function

---

### 1.3 Early return — không lồng if

```typescript
// ❌ Lồng nhiều cấp
async function withdraw(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    if (user.isVerified) {
      if (Number(user.balance) >= amount) {
        // ... logic thực sự
      } else {
        throw new InsufficientBalanceError(...);
      }
    } else {
      throw new ValidationError("Chưa xác minh danh tính");
    }
  } else {
    throw new NotFoundError("User");
  }
}

// ✅ Early return — đọc thẳng từ trên xuống
async function withdraw(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  if (!user.isVerified) throw new ValidationError("Chưa xác minh danh tính");
  if (Number(user.balance) < amount) throw new InsufficientBalanceError(Number(user.balance), amount);

  // logic thực sự ở đây — không lồng
}
```

---

### 1.4 Không dùng magic numbers / magic strings

```typescript
// ❌ Magic values
if (user.role === 3) { ... }
if (otp.length !== 6) { ... }
setTimeout(fn, 86400000);

// ✅ Named constants
const ADMIN_ROLE_LEVEL = 3;
const OTP_LENGTH = 6;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
```

Đặt constants tại đầu file hoặc trong `src/lib/constants/`.

---

### 1.5 Không comment lại những gì code đã nói

```typescript
// ❌ Comment thừa
// Lấy user theo id
const user = await getUserById(id);

// Kiểm tra balance
if (balance < amount) { ... }

// ✅ Chỉ comment khi WHY không hiển nhiên
// OTP hash dùng bcrypt thay vì argon2 — argon2 quá chậm cho high-frequency verify
const isValid = await bcrypt.compare(otp, stored.hash);

// SELECT FOR UPDATE để tránh race condition khi nhiều request cùng lúc
const user = await tx.user.findUnique({ where: { id }, ...selectForUpdate });
```

---

### 1.6 Xử lý lỗi nhất quán

```typescript
// ❌ Throw string, throw generic Error
throw "Không tìm thấy";
throw new Error("balance not enough");

// ✅ Dùng AppError subclass đã có
throw new NotFoundError("Sản phẩm");
throw new InsufficientBalanceError(current, required);
throw new ValidationError("Số tiền phải lớn hơn 0");
```

Trong route handler: luôn dùng `apiCatch(err)` trong catch block — không tự format lỗi.

---

## PHẦN 2 — CẤU TRÚC FILE DẠNG TREE

### 2.1 Thứ tự trong mỗi file TypeScript/TSX

```typescript
// 1. Directives ("use client" nếu cần)
"use client";

// 2. Imports — theo nhóm, cách nhau 1 blank line
//    Group A: Framework / thư viện ngoài
import { useState } from "react";
import { z } from "zod";

//    Group B: Aliases nội bộ (@/...)
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch } from "@/lib/api-response";

//    Group C: Relative imports (./... hoặc ../...)
import { OrderCard } from "./_components/OrderCard";

// 3. Constants / config
const PAGE_SIZE = 20;

// 4. Types / Interfaces (nếu chỉ dùng trong file này)
type Props = { userId: string };

// 5. Main export (function / component / class)
export default function Page({ userId }: Props) { ... }
export async function GET(req: NextRequest) { ... }

// 6. Helper functions (private, không export)
function buildWhereClause(filter: string) { ... }
```

---

### 2.2 Cấu trúc thư mục — tree chuẩn

```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       └── <tên-trang>/
│   │           ├── page.tsx              ← Server Component, fetch data
│   │           ├── layout.tsx            ← nếu có layout riêng
│   │           └── _components/          ← components chỉ dùng cho trang này
│   │               ├── <TênComponent>.tsx
│   │               └── <TênForm>.tsx
│   ├── (user)/
│   │   └── <tên-trang>/
│   │       ├── page.tsx
│   │       └── _components/
│   ├── (public)/
│   │   └── <tên-trang>/
│   │       └── page.tsx
│   └── api/
│       ├── admin/<tên>/route.ts
│       ├── user/<tên>/route.ts
│       ├── seller/<tên>/route.ts
│       └── webhooks/<tên>/route.ts
│
├── components/
│   ├── layout/                           ← Header, Footer, Sidebar
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── shared/                           ← Components dùng nhiều nơi
│       ├── Pagination.tsx
│       ├── CopyButton.tsx
│       └── SafeHtml.tsx
│
├── lib/
│   ├── auth/                             ← Auth helpers, RBAC
│   ├── db/                               ← Prisma client
│   ├── errors.ts                         ← AppError subclasses
│   ├── api-response.ts                   ← Response helpers
│   ├── services/                         ← Business logic
│   │   └── <tên>.service.ts
│   ├── validation/                       ← Zod schemas
│   │   └── <tên>.schema.ts
│   ├── security/                         ← Encryption, HMAC, audit
│   ├── constants/                        ← App-wide constants
│   └── utils/                            ← Pure utility functions
│       ├── format.ts
│       └── date.ts
│
└── types/                                ← Shared TypeScript types
    └── index.ts
```

---

### 2.3 Quy tắc đặt file

| Tình huống | Đặt ở đâu |
|-----------|----------|
| Component dùng ≥ 2 trang | `src/components/shared/` |
| Component chỉ 1 trang | `src/app/.../<trang>/_components/` |
| Business logic | `src/lib/services/<tên>.service.ts` |
| Input validation | `src/lib/validation/<tên>.schema.ts` |
| App-wide constant | `src/lib/constants/<nhóm>.ts` |
| Utility function thuần | `src/lib/utils/<nhóm>.ts` |
| Type dùng nhiều file | `src/types/index.ts` |
| Type chỉ 1 file | Khai báo ngay trong file đó |

---

### 2.4 Cấu trúc bên trong component

```tsx
// ✅ Chuẩn — đọc từ trên xuống như outline
export default function UserOrdersPage({ userId }: Props) {
  // 1. Hooks (state, ref, context)
  const [page, setPage] = useState(1);
  const router = useRouter();

  // 2. Derived values (useMemo, computed)
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 3. Effects
  useEffect(() => { ... }, [page]);

  // 4. Event handlers
  function handlePageChange(newPage: number) { ... }
  function handleCancel(orderId: string) { ... }

  // 5. Early returns (loading, error, empty states)
  if (isLoading) return <Skeleton />;
  if (!orders.length) return <EmptyState message="Chưa có đơn hàng" />;

  // 6. Main render
  return (
    <div className="...">
      <h1>Đơn hàng của tôi</h1>
      <OrderList orders={orders} onCancel={handleCancel} />
      <Pagination currentPage={page} totalPages={totalPages} ... />
    </div>
  );
}
```

---

### 2.5 JSX — mỗi prop một dòng khi ≥ 3 props

```tsx
// ❌ Khó đọc khi nhiều props
<Button variant="primary" size="lg" onClick={handleSubmit} disabled={isLoading} className="w-full mt-4">

// ✅ Dễ scan, dễ diff
<Button
  variant="primary"
  size="lg"
  onClick={handleSubmit}
  disabled={isLoading}
  className="w-full mt-4"
>
  Xác nhận
</Button>
```

---

### 2.6 Import — không import cả module khi chỉ cần 1 thứ

```typescript
// ❌ Import toàn bộ
import * as _ from "lodash";
import React from "react";  // không cần trong Next.js 13+

// ✅ Named import
import { debounce } from "lodash";
import { useState, useEffect } from "react";
```

---

## PHẦN 3 — CHECKLIST TRƯỚC KHI SUBMIT CODE

```
[ ] Tên biến/hàm nói lên được chức năng mà không cần comment giải thích?
[ ] Không có magic number / magic string nào?
[ ] Hàm nào vượt 30 dòng? → tách ra
[ ] Có đoạn nào lồng if quá 3 cấp? → early return
[ ] File mới đặt đúng vị trí trong tree chưa?
[ ] Thứ tự import: framework → @/ aliases → relative?
[ ] JSX có ≥ 3 props trên 1 dòng? → xuống dòng từng prop
[ ] Không có console.log nào sót lại?
```
