@AGENTS.md

# Web App — Next.js 16 (App Router)

Tài liệu đầy đủ ở `../.claude/`. File này chỉ ghi các lưu ý đặc thù cho `web/`.

## Lưu ý Next.js 16 App Router

- `params` / `searchParams` là `Promise<...>` → phải `await params` trước khi dùng
- Server Components mặc định — chỉ thêm `"use client"` khi cần state/event
- Route Handlers: `export async function GET/POST/PATCH/DELETE(req: Request)`

## Prisma 7 trong web/

- `Decimal` type cho balance/price/amount → `Number(x)` khi tính JS
- Nullable fields (`string | null`) → `?? undefined` khi truyền vào props `string | undefined`
- Money operations: `prisma.$transaction(async (tx) => { ... })` bắt buộc

## Thư mục quan trọng

```
web/src/
├── app/api/          ← Route Handlers (xem phase-2c-api.md)
├── lib/services/     ← Business logic (xem phase-2b-services.md)
├── lib/security/     ← encryption, hmac, sanitize, rate-limit, audit
├── lib/auth/         ← Auth.js config, RBAC, password, 2FA
└── components/       ← UI components (shared/, layout/, providers/)
```

## Commands

```bash
pnpm dev              # dev server
pnpm build            # production build
pnpm tsc --noEmit     # type check (chạy sau mọi thay đổi)
pnpm lint             # ESLint
pnpm test             # Vitest
```
# 1. Mở thư mục dự án trong VS Code
code C:\Hethongmmo

# 2. Vào thư mục web và chạy dev server
cd C:\Hethongmmo\web
pnpm dev
Sau khi terminal hiện ✓ Ready in ...ms thì mở trình duyệt tại http://localhost:3000

Các lệnh hay dùng kèm:


# TypeScript check (chạy sau mỗi lần sửa code)
cd C:\Hethongmmo\web
node node_modules/typescript/bin/tsc --noEmit

# Prisma Studio (xem/sửa DB trực tiếp)
pnpm db:studio
# Xóa toàn bộ dữ liệu database 
pnpm prisma migrate reset
# Build production
pnpm build