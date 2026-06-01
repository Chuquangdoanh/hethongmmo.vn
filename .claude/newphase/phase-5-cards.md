# PHASE 5 — CẤU TRÚC CARD HIỂN THỊ (UI Components)

## Mục tiêu
Mỗi module có card list và detail page đúng layout, hiển thị đúng trường, responsive chuẩn.

## Shared Components đã có
- `ProductCard` — shared/ProductCard.tsx
- `SimpleOrderButton` — props: itemId, orderType, itemName, price, isLoggedIn
- `Pagination` — shared/Pagination.tsx
- `EmptyState` — shared/EmptyState.tsx
- `SafeHtml` — shared/SafeHtml.tsx (wrap DOMPurify)
- `CopyButton` — shared/CopyButton.tsx
- `Skeleton` — shared/Skeleton.tsx

## Module 1: Courses

### List Card (ProductCard hoặc CourseCard)
```
┌─────────────────────────────────┐
│ [THUMBNAIL 16:9]                │
│       ⭐ rating  [badge pill]   │
├─────────────────────────────────┤
│ [category pill] [format pill]   │
│ Tên khóa học (font-bold)        │
│ 👥 studentCount  ⏱ duration     │
│ ─────────────────────────────── │
│ salePrice  ~~originalPrice~~    │
│            [-XX%]               │
│ [      Xem chi tiết      ]      │
└─────────────────────────────────┘
```

### Detail Page (/khoa-hoc/[slug])
```
[Breadcrumb]
[HERO: 2 col desktop / stack mobile]
  LEFT:  category, format, rating, studentCount tags
         H1 name
         description (SafeHtml)
         meta: duration, instructor, format

  RIGHT: thumbnail / youtube embed

[BODY: 2 col desktop]
  LEFT:
    Box "Nội dung đào tạo" — contentList[]
    Box "Cam kết" — seoTitle + seoDescription (SafeHtml)
    [SimpleOrderButton] orderType=COURSE

  RIGHT (sticky):
    salePrice, originalPrice, saving badge
    Features: duration, format, students, instructor
    Benefits list (cố định)
```

**Trường ẩn khỏi public:** id UUID → dùng slug

## Module 2: Services

### List Card
```
┌─────────────────────────────────┐
│ [THUMBNAIL 16:9]                │
│ [HOT badge]  ⭐ rating          │
├─────────────────────────────────┤
│ [platform pill] [category pill] │
│ Tên dịch vụ                     │
│ ⚡ XX% thành công  ⏱ XY ngày   │
│ 👁 views  🛒 orders             │
│ Mô tả ngắn                      │
│ [=====successRate bar======]    │
│ Bảo hành: [pill][pill]          │
│ ─────────────────────────────── │
│ Từ: price                       │
│ [SimpleOrderButton]             │
└─────────────────────────────────┘
```

**iCloud special:** Hiển thị productList table (model | giá)

### Detail Page (/dich-vu/[slug])
- ServiceOrderForm.tsx xử lý chọn warrantyVariant + submit order

## Module 3: Tut & Trick

### List Card
```
┌─────────────────────────────────┐
│ [THUMBNAIL 16:9]                │
│ [HOT]  [platform icon]          │
│ [Có phí / Miễn phí]            │
├─────────────────────────────────┤
│ Tên tut/trick                   │
│ ⭐ rating  📅 publishedDate     │
│ Mô tả ngắn                      │
│ [====successRate====]           │
│ 💰 price                        │
│ [SimpleOrderButton]             │
└─────────────────────────────────┘
```

### Detail (/tut-tricks/[slug])
- Xem metadata, docs preview (SafeHtml)
- Sau mua: /don-hang/[id] → DeliveredContentLoader.tsx → decrypt + hiển thị contentUrl + docs đầy đủ

## Module 4: User Profile (/thong-tin-ca-nhan)

### Hero Section
```
[avatar chữ cái] Tên user
                 email
                 [role badge]
─────────────────────────────────
💰 Balance  🛒 Tổng đơn  💎 Tổng chi
```

### Tabs
```
[Thông tin] | [Hồ sơ] | [Đơn hàng] | [Giao dịch]
```

**Tab Thông tin:**
- ProfileForm: fullName, phone [Lưu]
- ChangePasswordForm: current + new + confirm

**Tab Hồ sơ:**
- Stats cards
- Seller registration card (state-aware)

**Tab Đơn hàng:**
- Table: orderCode, itemName, orderType, finalPrice, status, createdAt
- Click → /don-hang/[id]

**Tab Giao dịch:**
- Table: type, amount, description, balanceBefore, balanceAfter, createdAt

## Module 5: Seller (/ban-hang)

### Dashboard
```
Sản phẩm: X/3 slot [+ Thêm]
┌────┐ ┌────┐ ┌────┐
│ P1 │ │ P2 │ │ P3 │
└────┘ └────┘ └────┘

Đơn hàng nhận được:
[Table: orderCode, buyerMasked, itemName, price, status, date]

Doanh thu: revenue tổng
[Yêu cầu rút tiền]
```

## Responsive Breakpoints

| Component | Mobile | Desktop |
|---|---|---|
| Course list | 1 col | 3 col |
| Service list | 1 col | 3 col |
| TutTrick list | 1 col | 3 col |
| Course detail hero | stack | 2 col |
| Course detail body | stack (sidebar trên) | 2 col |
| User profile tabs | scroll-x | full |
| Admin table | scroll-x | full |

## Tasks Phase 5
- [x] Kiểm tra ProductCard render đúng theo orderType
- [x] Kiểm tra SimpleOrderButton props (itemId, orderType, itemName, price, isLoggedIn)
- [x] Verify DeliveredContentLoader.tsx decrypt và hiển thị đúng
- [x] SafeHtml wrap tất cả `docs`, `description` render từ Firestore/DB
- [x] Course detail: YouTube embed lazy load
- [x] Service detail: warrantyVariant selection trước khi order
- [x] Seller product card: show stock count từ VIEW
- [x] Mobile: filter bar scroll-x thay vì wrap
