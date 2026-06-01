# CLAUDE.md — hethongmmo.vn

Hướng dẫn cho AI assistant khi làm việc với dự án này.
Đọc tài liệu trong `.claude/` trước khi bắt đầu bất kỳ task nào.

## Tài liệu tham khảo

### Architecture
- [System Overview](.claude/architecture/system-overview.md) — Kiến trúc tổng quan, luồng tiền, auth flow, cấu trúc thư mục
- [Tech Stack](.claude/architecture/stack.md) — Tất cả công nghệ, versions, và lưu ý quan trọng

### Rules
- [Coding Conventions](.claude/rules/coding-conventions.md) — TypeScript, naming, comments policy
- [No Duplication](.claude/rules/no-duplication.md) — DRY rules, list abstractions đã có
- [Test Policy](.claude/rules/test-policy.md) — Test ngay sau khi fix/update, checklist theo loại thay đổi
- [Feature Workflow](.claude/rules/feature-workflow.md) — **ĐỌC KHI: thêm DB field, thêm chức năng, thêm API, thêm UI page, sửa giao diện**

### Logs
- [Completed Tasks](.claude/logs/completed-tasks.md) — **GHI SAU MỖI TASK HOÀN THÀNH** (không sửa mục cũ)

### Workflow
- [Development Flow](.claude/workflow/development-flow.md) — Feature/bug/dependency workflow
- [Git Conventions](.claude/workflow/git-conventions.md) — Branch naming, commit format, PR checklist

### Security
- [Security Rules](.claude/security/security-rules.md) — **ĐỌC TRƯỚC KHI VIẾT BẤT KỲ CODE NÀO**

### Phase Tracking
- [Phase 1 — Foundation](.claude/phase/phase-1-foundation.md) ✅
- [Phase 2A — Auth Core](.claude/phase/phase-2a-auth.md) ✅
- [Phase 2B — Business Services](.claude/phase/phase-2b-services.md) ✅
- [Phase 2C — API Route Handlers](.claude/phase/phase-2c-api.md) ✅
- [Phase 2D — UI Pages](.claude/phase/phase-2d-ui.md) ✅
- [Phase 2E — Storage & Email](.claude/phase/phase-2e-storage.md) ✅
- [Phase 2F — Migration, Tests & CI/CD](.claude/phase/phase-2f-migration.md) ✅

## Quy tắc nhanh

1. **Security first** — Xem `.claude/security/security-rules.md`
2. **Không lặp code** — Kiểm tra abstractions đã có trước khi tạo mới
3. **Test ngay** — Sau mỗi fix/update, chạy `pnpm tsc --noEmit` tối thiểu
4. **Tiền → `$transaction`** — Mọi thao tác balance/transaction dùng `Prisma.$transaction`
5. **Response format** — `{ success: true, data }` / `{ success: false, error, code }`

## Cấu trúc dự án

```
Hethongmmo/
├── web/          ← Next.js app (source code chính)
├── infra/        ← Nginx config, Postgres init.sql
├── scripts/      ← Migration và utility scripts
├── .claude/      ← Tài liệu AI collaboration (đang đọc)
└── docker-compose.yml
```

## Phiên làm việc mới

Khi bắt đầu task mới, AI nên:
1. Đọc phase file tương ứng để hiểu trạng thái hiện tại
2. Đọc `.claude/security/security-rules.md` nếu task liên quan đến auth/money/data
3. Đọc `.claude/rules/no-duplication.md` trước khi tạo component/service mới
4. Đọc `.claude/rules/feature-workflow.md` nếu task liên quan đến **thêm trường DB, thêm chức năng, thêm API, thêm UI, sửa giao diện**
