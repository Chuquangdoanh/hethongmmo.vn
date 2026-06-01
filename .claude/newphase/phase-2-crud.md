# PHASE 2 — LUỒNG CRUD CHI TIẾT

## Mục tiêu
Mỗi module có đủ API routes (GET/POST/PATCH/DELETE), Zod validation, idempotency, và pagination server-side.

## Endpoints cần kiểm tra / implement

### Module 1: Khóa học (Courses)
| Method | Route | Auth | Status |
|---|---|---|---|
| GET | /api/products/courses | Public | ✅ (list + slug detail) |
| POST | /api/products/courses | Staff+ | ✅ (Zod, sanitize, audit) |
| PATCH | /api/products/courses/[id] | Staff+ | ✅ |
| DELETE | /api/products/courses/[id] | Admin | ✅ (soft delete) |
| POST | /api/orders | User | ✅ (purchase + idempotency) |
| GET | /api/orders/[id] | User (own) | ✅ |

### Module 2: Dịch vụ (Services)
| Method | Route | Auth | Status |
|---|---|---|---|
| GET | /api/products/services | Public | ✅ |
| POST | /api/products/services | Staff+ | ✅ |
| PATCH | /api/products/services/[id] | Staff+ | ✅ |
| DELETE | /api/products/services/[id] | Admin | ✅ (soft delete) |

### Module 3: Tut & Trick
| Method | Route | Auth | Status |
|---|---|---|---|
| GET | /api/products/tut-tricks | Public | ✅ (KHÔNG trả contentUrlEnc) |
| POST | /api/products/tut-tricks | Staff+ | ✅ (encrypt contentUrl → Bytes) |
| PATCH | /api/products/tut-tricks/[id] | Staff+ | ✅ |
| DELETE | /api/products/tut-tricks/[id] | Admin | ✅ (soft delete) |

### Module 4: Hồ sơ cá nhân (User)
| Method | Route | Auth | Status |
|---|---|---|---|
| GET | /api/user/profile | User (own) | ✅ |
| PATCH | /api/user/profile | User (own) | ✅ (chỉ name, phone) |
| PATCH | /api/user/change-password | User (own) | ✅ (Argon2id verify + hash) |
| GET | /api/orders | User (own) | ✅ |
| GET | /api/user/notifications | User (own) | ✅ |

### Module 5: Đăng ký bán hàng (Seller)
| Method | Route | Auth | Status |
|---|---|---|---|
| POST | /api/seller/register | User | ✅ (atomic: deduct 50k, create request) |
| GET | /api/admin/sellers | Staff+ | ✅ |
| PATCH | /api/admin/sellers/[id] | Admin | ✅ (approve/reject) |
| GET | /api/seller/products | Seller | ✅ |
| POST | /api/seller/products | Seller | ✅ (enforce max 3 server-side) |
| PATCH | /api/seller/products/[id] | Seller (own) | ✅ |
| DELETE | /api/seller/products/[id] | Seller (own) | ✅ (soft delete) |

## Business Rules quan trọng

### Purchase Flow (purchase.service.ts)
```
1. Idempotency check (idempotencyKey) — chặn duplicate
2. BEGIN TRANSACTION
3.   SELECT ... FOR UPDATE (lock balance)
4.   Check balance >= price
5.   SELECT ... FOR UPDATE SKIP LOCKED (lock stock item)
6.   UPDATE mmo_product_items/seller_product_stock status = SOLD
7.   UPDATE users balance, total_spent
8.   INSERT orders
9.   INSERT transactions
10.  INSERT notifications
11. COMMIT
12. Decrypt và trả content
```

### Content Delivery (TutTrick / MMO / SellerProduct)
```
GET /api/orders/[id]
  → Verify order.userId == session.userId
  → If order.status == DONE and order.deliveredItemId != null
    → Decrypt contentUrlEnc / valueEnc / contentEnc
    → Return decrypted content (KHÔNG cache)
```

## Validation Rules (Zod)

| Field | Rule |
|---|---|
| name | min(3), max(255) |
| slug | regex(/^[a-z0-9-]+$/), min(3), max(200) |
| price / originalPrice | positive(), max(100_000_000) |
| salePrice | min(0), max(100_000_000), ≤ originalPrice |
| successRate | int(), min(0), max(100) |
| rating | min(0), max(5) |
| contentList | array(string(max 500)), max(100) |
| contentUrl | url() → encrypt trước khi lưu |
| docs | max(50_000), sanitizeHtml() |
| description | max(10_000), sanitizeHtml() |

## Pagination
- Server-side: `?page=1&limit=20`
- Max limit: 50
- Response: `{ data, meta: { total, page, limit, totalPages } }`

## Tasks Phase 2
- [ ] Verify tất cả routes trả đúng response shape
- [ ] Đảm bảo DELETE là soft-delete (deletedAt = now()) không phải hard delete
- [ ] Thêm rate limit cho /api/orders (5 req/phút per user)
- [ ] Thêm idempotency cho seller register (chặn gửi 2 lần)
- [ ] Test purchase flow với concurrent requests
