# CLAUDE.md — hethongmmo.vn

Hướng dẫn cho AI assistant khi làm việc với dự án này.
Đọc tài liệu trong `.claude/` trước khi bắt đầu bất kỳ task nào.

---

## ⚠️ ĐỌC TRƯỚC TIÊN — BẮT BUỘC MỌI PHIÊN

> **[Freeze & Precision Rules](.claude/rules/freeze-and-precision.md) — ĐỌC FILE NÀY TRƯỚC KHI LÀM BẤT KỲ VIỆC GÌ**
>
> Tóm tắt bắt buộc ghi nhớ:
> 1. **KHÔNG sửa chức năng đang hoạt động** — trừ khi có bug xác nhận hoặc lỗ hổng bảo mật
> 2. **KHÔNG xóa code cũ** khi thêm chức năng mới — chỉ được thêm, không được thay thế
> 3. **ĐỌC TOÀN BỘ file** trước khi sửa — không đoán mò, không sửa ngoài phạm vi yêu cầu

---

## Tài liệu tham khảo

### Architecture
- [System Overview](.claude/architecture/system-overview.md) — Kiến trúc tổng quan, luồng tiền, auth flow, cấu trúc thư mục
- [Tech Stack](.claude/architecture/stack.md) — Tất cả công nghệ, versions, và lưu ý quan trọng

### Rules
- [**Freeze & Precision**](.claude/rules/freeze-and-precision.md) — **ĐỌC TRƯỚC TIÊN** — Đóng băng chức năng, không xóa code cũ, đọc kỹ trước khi sửa
- [**Clean Code & Tree Structure**](.claude/rules/clean-code.md) — **ĐỌC KHI TẠO / SỬA BẤT KỲ FILE NÀO** — Đặt tên, cấu trúc file, thứ tự code, tree thư mục chuẩn
- [Coding Conventions](.claude/rules/coding-conventions.md) — TypeScript, naming, comments policy
- [No Duplication](.claude/rules/no-duplication.md) — DRY rules, list abstractions đã có
- [Test Policy](.claude/rules/test-policy.md) — Test ngay sau khi fix/update, checklist theo loại thay đổi
- [Feature Workflow](.claude/rules/feature-workflow.md) — **ĐỌC KHI: thêm DB field, thêm chức năng, thêm API, thêm UI page, sửa giao diện**
- [UI Animation Rules](.claude/rules/ui-animation-rules.md) — **ĐỌC KHI: sửa giao diện, thêm hiệu ứng, animation, UI** — 12 nguyên tắc bất biến

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
1. **ĐỌC `.claude/rules/freeze-and-precision.md`** — bắt buộc, mọi phiên, mọi task
2. **ĐỌC `.claude/rules/clean-code.md`** — bắt buộc khi tạo mới hoặc sửa bất kỳ file nào
3. Đọc phase file tương ứng để hiểu trạng thái hiện tại
4. Đọc `.claude/security/security-rules.md` nếu task liên quan đến auth/money/data
5. Đọc `.claude/rules/no-duplication.md` trước khi tạo component/service mới
6. Đọc `.claude/rules/feature-workflow.md` nếu task liên quan đến **thêm trường DB, thêm chức năng, thêm API, thêm UI, sửa giao diện**
