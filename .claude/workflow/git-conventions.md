# Git Conventions

## Branch naming

```
main           → production (protected, chỉ merge từ release/hotfix)
develop        → staging (protected, merge từ feature/fix)
feature/<slug> → tính năng mới    vd: feature/seller-withdrawal
fix/<slug>     → bug fix          vd: fix/webhook-duplicate-tx
hotfix/<slug>  → hotfix production vd: hotfix/sepay-hmac-verify
release/<ver>  → release branch   vd: release/v1.2.0
```

## Commit message format

```
<type>(<scope>): <mô tả ngắn tiếng Việt hoặc Anh>

[body tùy chọn — giải thích WHY, không phải WHAT]
[footer: BREAKING CHANGE: / Closes #123]
```

### Types
| Type | Khi nào |
|------|---------|
| `feat` | Tính năng mới |
| `fix` | Bug fix |
| `refactor` | Refactor không thêm tính năng / không fix bug |
| `perf` | Cải thiện performance |
| `test` | Thêm/sửa test |
| `docs` | Tài liệu |
| `deps` | Update dependency |
| `chore` | Build, config, tooling |
| `security` | Vá lỗ hổng bảo mật |

### Scope (tùy chọn)
`auth`, `order`, `deposit`, `withdrawal`, `seller`, `admin`, `webhook`, `ui`, `api`, `db`

### Ví dụ tốt
```
feat(seller): thêm form rút tiền với OTP verify
fix(webhook): xử lý duplicate referenceCode khi SePay retry
security(api): thêm timing-safe compare cho HMAC verify
deps: update prisma 7.0.0 → 7.1.0
```

### Ví dụ xấu (tránh)
```
fix bug           ← quá chung chung
update code       ← không nói gì
WIP               ← không commit WIP vào develop/main
```

## Pull Request

### Title format
```
[type] Mô tả ngắn (≤ 72 ký tự)
```

### PR checklist
- [ ] Đã tự review code (không để lại debug log, TODO, unused imports)
- [ ] `tsc --noEmit` pass
- [ ] Tests pass
- [ ] Không có secret bị hardcode
- [ ] Mô tả "Why" trong PR description nếu logic phức tạp

## Quy tắc merge

| Branch | Chiến lược merge |
|--------|----------------|
| feature → develop | Squash merge (1 commit gọn) |
| develop → main | Merge commit (giữ history) |
| hotfix → main | Cherry-pick + tag |

## Tagging

```bash
# Release mới
git tag -a v1.2.3 -m "Release v1.2.3 — mô tả ngắn"
git push origin v1.2.3
```

Semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: breaking change API / DB migration không tương thích
- MINOR: tính năng mới tương thích ngược
- PATCH: bug fix, hotfix
