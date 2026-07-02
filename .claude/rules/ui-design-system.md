# DJ MEDIA — Global UI Design Rules

> **Áp dụng khi:** sửa / thêm giao diện thuộc phạm vi **Seller và User** (KHÔNG áp dụng Admin).
> Mục tiêu: giao diện Seller/User thống nhất, hiện đại, tuân thủ Design System.
> Ưu tiên tái sử dụng Component, Design Token và Clean Code trong mọi thay đổi UI.

---

## 1. Phạm vi áp dụng

Các quy tắc này **CHỈ áp dụng cho giao diện Seller và User**.

Bao gồm nhưng không giới hạn:

- Trang chủ
- Marketplace
- Dashboard Seller
- Dashboard User
- Seller Center
- User Center
- Product
- Category
- Affiliate
- Wallet
- Orders
- Courses
- Landing Page
- Các Component dùng chung của Seller/User

### KHÔNG áp dụng cho

- Admin Dashboard
- CMS Admin
- Back Office
- Hệ thống quản trị nội bộ
- Các Component dành riêng cho Admin

Nếu Component được dùng chung giữa Admin và Seller/User:

- Không sửa trực tiếp Component dùng chung.
- Tạo Variant hoặc Style riêng.
- Không làm thay đổi giao diện của Admin.

---

## 2. Quy tắc lựa chọn UI

Trước khi thay đổi giao diện các Component tương tác, phải xác định quy tắc cần áp dụng.

Nếu người dùng chưa chỉ định rõ, phải hỏi:

> Bạn muốn áp dụng Quy tắc 1 hay Quy tắc 2?

Không được tự động lựa chọn.

---

## 3. Quy tắc 1 — Interactive Style

Áp dụng cho các Component cần có trạng thái tương tác.

Ví dụ: Sidebar, Navigation, Menu, Button, Product Card, Category Card, Service Card, Dashboard Card, Feature Card, Table Row, Dropdown, List Item, Toolbar, Action Button, Quick Action, các Card có thể Click.

### Default

- Background: White (`#FFFFFF`) — card **không hiện viền**
- Border: KHÔNG có viền (dùng `1px solid transparent` để giữ layout ổn định)
- Icon: glyph **màu đen** (`#1F2937`), chip nền `#EFF6FF`
- Text: `#374151` (đồng bộ màu chữ mục footer "Dịch vụ / Hỗ trợ")

### Hover

Khi người dùng di chuột — **chỉ đổi màu chữ** sang Footer Accent Blue. Icon **giữ nguyên màu đen**. **KHÔNG nền, KHÔNG viền**:

- Text: Footer Accent Blue (`#0066FF`)
- Icon: giữ đen (`#1F2937`)
- Không nền, không viền
- Không đổi kích thước / layout
- Transition mượt

### Active (Click)

Sau khi click, item được chọn đổi nền + màu chữ/icon (KHÔNG viền):

- Card background: Footer Hover Blue (`#EFF6FF`)
- Text: Footer Accent Blue (`#0066FF`), chữ đậm
- Icon: Footer Accent Blue (`#0066FF`)
- Không viền

Giữ trạng thái Active cho đến khi người dùng chọn Component khác.

### Priority

```
Active  ↓  Hover  ↓  Default
```

Hover không được ghi đè Active.

---

## 4. Quy tắc 2 — Static Icon Style

Áp dụng cho các Component chỉ mang tính hiển thị.

Ví dụ: Feature Icon, Statistics Card, Information Card, Summary Card, Service Icon, Badge Icon, Dashboard Summary, Icon minh họa.

### Quy tắc

Dùng cùng bộ màu với trạng thái hover/active của Quy tắc 1:

- Icon background: Footer Hover Blue (`#EFF6FF`)
- Icon (glyph): Footer Accent Blue (`#0066FF`)
- Background của Component: không thay đổi
- Hover: không có
- Click: không có

Không đổi màu khi người dùng tương tác.

---

## 5. Design Tokens

| Token | Giá trị |
|-------|---------|
| Primary Blue | `#3B82F6` |
| Light Blue | `#F0F6FE` |
| Hover Border | `#B7D0F8` |
| Footer Accent Blue (màu chữ hover/active) | `#0066FF` |
| Footer Hover Blue (nền chip icon) | `#EFF6FF` |
| Default Border | `#E5E7EB` |
| White | `#FFFFFF` |
| Text Primary | `#1F2937` |
| Text Secondary | `#6B7280` |
| Disabled | `#9CA3AF` |

---

## 6. Quy tắc UI chung

- Tất cả Component mới phải tuân thủ Design System.
- Không tạo màu mới nếu chưa có trong Design Token.
- Không sử dụng nhiều kiểu Hover khác nhau.
- Không sử dụng nhiều kiểu Border khác nhau.
- Không sử dụng nhiều màu Primary khác nhau.
- Toàn bộ Website phải có trải nghiệm thống nhất.

---

## 7. Clean Code

- Không Hard-code màu.
- Sử dụng CSS Variables hoặc Design Tokens.
- Không Duplicate CSS.
- Tái sử dụng Component.
- Tái sử dụng Style.
- Không sửa Business Logic.
- Không sửa API.
- Không sửa Database.
- Không xóa chức năng hiện có.
- Không phá vỡ Codebase.
- Chỉ cập nhật UI theo đúng quy tắc đã chọn.

---

## 8. Quy trình thực hiện

**Bước 1 — Xác định phạm vi:** Seller / User / Admin.
- Nếu là Admin → KHÔNG áp dụng các quy tắc trong tài liệu này.
- Nếu là Seller/User → tiếp tục.

**Bước 2 — Xác định loại Component:**
- Component có tương tác → áp dụng Quy tắc 1.
- Component chỉ hiển thị → áp dụng Quy tắc 2.
- Chưa xác định được → hỏi người dùng trước khi thực hiện.

**Bước 3 — Sau khi hoàn thành, kiểm tra toàn bộ UI:**
- Không làm thay đổi Layout.
- Không làm thay đổi Spacing.
- Không làm thay đổi Logic.
- Không ảnh hưởng tới Admin.
- Đảm bảo UI đồng nhất trên toàn hệ thống.
