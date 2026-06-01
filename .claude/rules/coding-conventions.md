# Quy ước code — chuquangdoanh.net

## TypeScript

- `strict: true` + `noUncheckedIndexedAccess: true` — không tắt bất kỳ rule nào
- Không dùng `any`. Dùng `unknown` + type-guard hoặc generic nếu cần.
- Không dùng `!` (non-null assertion) trừ khi đã kiểm tra tường minh phía trên
- Prisma trả `Decimal` cho tiền — phải dùng `Number(x)` khi tính toán, `.toString()` khi hiển thị
- Prisma trả `string | null` cho optional fields — phải `?? undefined` trước khi truyền vào interface với `string | undefined`

## File & module

- Mỗi file chỉ làm 1 việc — service, component, util, hoặc type (không trộn)
- Không export default + named export cùng 1 file (chọn một)
- Server-only code (`lib/services/`, `lib/auth/`) → không bao giờ import vào client component
- `"use client"` chỉ dùng khi cần: useState, useEffect, event handler, browser API

## Next.js App Router

- Server Component mặc định — chỉ thêm `"use client"` khi thực sự cần
- `params` và `searchParams` là `Promise<...>` trong Next.js 16 — luôn `await` trước khi dùng
- Không dùng `dangerouslySetInnerHTML` — luôn qua `SafeHtml` component (DOMPurify)
- Không trả `password_hash`, `bank_*_enc`, `two_factor_secret_enc` ra client bất kỳ hoàn cảnh nào
- Mọi route group layout phải có auth guard phù hợp với role

## Prisma / Database

- Không dùng `prisma.$queryRawUnsafe` — chỉ `$queryRaw` với tagged template literal
- Mọi thao tác liên quan tiền dùng `prisma.$transaction` với `SELECT FOR UPDATE`
- Soft delete: set `deletedAt = new Date()`, không hard delete trừ admin với confirm
- Không query `password_hash`, `*_enc` fields trong select bình thường — luôn explicit

## API Route Handlers

Mọi route handler theo thứ tự:
1. `const session = await auth()` — verify session
2. `requireUser(session)` / `requireSeller(session)` / `requireAdmin(session)`
3. `schema.safeParse(body)` — Zod validate input
4. Business logic
5. Return `{ success: true, data: ... }` hoặc `{ success: false, error: string, code: string }`

Không bao giờ leak stack trace. Luôn dùng `toApiError(err)` để format lỗi.

## Naming

| Thứ | Convention | Ví dụ |
|-----|-----------|-------|
| Component file | PascalCase | `ServiceForm.tsx` |
| Util/service file | camelCase | `deposit.service.ts` |
| API route | lowercase folder | `api/admin/users/[id]/route.ts` |
| DB column | snake_case (Prisma `@map`) | `created_at` |
| TS type | PascalCase | `OrderStatus` |
| Zod schema | camelCase + Schema | `createOrderSchema` |

## Comments

Không comment những gì code đã nói. Chỉ comment khi:
- Lý do không hiển nhiên (business rule ẩn, workaround cho bug cụ thể)
- Constraint quan trọng (`// MUST run inside transaction`)
- Security note (`// timing-safe compare — không dùng ===`)
