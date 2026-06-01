# PHASE 4 — ĐIỀU KIỆN HIỂN THỊ (Visibility Rules)

## Mục tiêu
Mỗi resource được hiển thị đúng theo trạng thái, role, và điều kiện business.

## Rules theo Module

### Courses
| Điều kiện | Logic |
|---|---|
| isActive = true AND deletedAt = null | Hiển thị public |
| isActive = false OR deletedAt ≠ null | Ẩn public, chỉ admin thấy |
| saleDeadline < NOW() | Giá còn hiển thị nhưng badge ưu đãi ẩn |
| badge = VIP | Hiển thị cho tất cả (không chặn access) |

### Services
| Điều kiện | Logic |
|---|---|
| isActive = true AND deletedAt = null | Hiển thị |
| isFeatured = true | Thêm badge HOT |
| platform = ICLOUD | Hiển thị productList JSON |

### Tut & Trick
| Điều kiện | Logic |
|---|---|
| isActive = true AND deletedAt = null | Hiển thị |
| isFeatured = true | Badge HOT, ưu tiên sort |
| price = 0 OR category = "Miễn phí" | Không cần mua để xem preview |
| contentUrlEnc ≠ null | Chỉ decrypt và trả sau khi verify order.status = DONE |

### User Profile
| Điều kiện | Logic |
|---|---|
| session.userId = userId | Xem đầy đủ hồ sơ mình |
| role = ADMIN/STAFF | Xem hồ sơ người khác |
| status = BANNED | Redirect → /tai-khoan-bi-khoa |
| status = PENDING_VERIFICATION | Redirect → /verify-otp |

### Seller Panel
| Điều kiện | Logic |
|---|---|
| sellerStatus ≠ APPROVED | Redirect khỏi /ban-hang/* |
| sellerProductCount >= maxSellerProducts | Ẩn nút "Thêm sản phẩm" |
| isHidden = true | Ẩn khỏi public (seller vẫn thấy) |
| isRestricted = true | Ẩn khỏi public (admin restrict) |
| deletedAt ≠ null | Hard remove khỏi mọi view |

## Role-based Visibility Matrix

| Nội dung | Guest | User | Seller | Staff | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Courses list (active) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Courses list (inactive) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Course detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| Services list (active) | ✅ | ✅ | ✅ | ✅ | ✅ |
| TutTrick list | ✅ | ✅ | ✅ | ✅ | ✅ |
| TutTrick contentUrl | ❌ | ✅ (sau mua) | ✅ (sau mua) | ✅ | ✅ |
| Hồ sơ cá nhân | ❌ | ✅ (own) | ✅ (own) | ✅ (all) | ✅ (all) |
| Balance | ❌ | ✅ (own) | ✅ (own) | ❌ | ✅ (all) |
| Đơn hàng | ❌ | ✅ (own) | ✅ (own+seller) | ✅ (all) | ✅ (all) |
| Seller panel | ❌ | ❌ | ✅ | ❌ | ✅ |
| Admin panel | ❌ | ❌ | ❌ | ✅ (limited) | ✅ |
| Audit log | ❌ | ❌ | ❌ | ❌ | ✅ |

## Layout Guards (Next.js)

| Group | Guard | Redirect |
|---|---|---|
| (auth) | No auth required | — |
| (public) | No auth required | — |
| (user) | Requires login | /dang-nhap |
| (seller) | Requires role=SELLER or ADMIN | /dang-nhap hoặc / |
| (admin) | Requires role=STAFF or ADMIN | /dang-nhap |

## API-level Guards

```typescript
// Middleware chain pattern:
const session = await auth()

// Public endpoint:
// không cần guard

// User endpoint:
const user = requireUser(session)
// → throws 401 nếu chưa login

// Seller endpoint:
const user = requireSeller(session)
// → throws 403 nếu role < SELLER

// Admin endpoint:
const user = requireAdmin(session)
// → throws 403 nếu role ≠ ADMIN

// Own resource:
if (resource.userId !== user.id) throw new ForbiddenError()
```

## Expired Content Handling
- `saleDeadline < now()`: vẫn hiển thị nhưng không show badge "Ưu đãi". Giá giữ nguyên salePrice.
- `deletedAt ≠ null`: lọc ra khỏi mọi GET public. Admin list filter `deletedAt: null` by default, có thể toggle.
- `status = BANNED`: auth middleware check `user.status`. Nếu BANNED → force signOut → redirect.

## Tasks Phase 4
- [x] Verify layout guards hoạt động đúng trong middleware.ts
- [x] Kiểm tra seller layout redirect khi sellerStatus ≠ APPROVED
- [x] Thêm `saleDeadline` check vào CourseCard component
- [x] Kiểm tra TutTrick content delivery route không leak contentUrlEnc
- [x] Verify banned user bị force logout
