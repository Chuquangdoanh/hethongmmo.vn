# Quy luật bất biến khi chỉnh sửa giao diện

> **Áp dụng khi:** user nói "sửa giao diện", "chỉnh giao diện", "thêm hiệu ứng", "animation", "UI", hoặc bất kỳ thứ gì liên quan đến giao diện.
>
> **Checklist bắt buộc trước khi thực hiện (12 nguyên tắc):**
> 1. Có sửa code cũ không? → KHÔNG được
> 2. Có ghi đè CSS không? → KHÔNG được
> 3. Có làm lệch giao diện không? → KHÔNG được
> 4. Có ảnh hưởng chức năng không? → KHÔNG được
> 5. Có ảnh hưởng responsive không? → KHÔNG được

---

## Nguyên tắc 1 — Không sửa code cũ

- Không sửa HTML, CSS, JS hiện có
- Không thay đổi cấu trúc component / section
- Không thay đổi ID, class, route, API, database
- **Chỉ được tạo file mới hoặc thêm đoạn code độc lập**

## Nguyên tắc 2 — Không xóa bất kỳ code nào

Cấm xóa: CSS, JS, Component, Hook, Function, Animation, Section.
Mọi code cũ phải giữ nguyên 100%.

## Nguyên tắc 3 — Không ghi đè code

Cấm override: CSS toàn cục, biến hệ thống, font, màu sắc, layout, responsive.
Mọi hiệu ứng mới phải hoạt động **độc lập**.

## Nguyên tắc 4 — Không thay đổi font chữ

Giữ nguyên: Font Family, Weight, Size, Letter Spacing, Line Height.

## Nguyên tắc 5 — Không làm lệch giao diện

Sau khi thêm hiệu ứng: khoảng cách, kích thước, bố cục, responsive phải giữ nguyên. Không tràn, không nhảy layout.

## Nguyên tắc 6 — Chỉ được thêm hiệu ứng

Được phép: Fade In/Up/Left/Right, Zoom In, Hover Card/Button, Parallax nhẹ, Scroll Reveal, Floating nhẹ, Gradient Animation, Loading Animation, Smooth Scroll, Section Transition, Micro Interaction.

## Nguyên tắc 7 — Hiệu ứng phải nhẹ

- Mượt, tự nhiên, không giật lag
- Thời gian: **0.2s → 0.8s**
- Không dùng animation quá mạnh gây khó chịu

## Nguyên tắc 8 — Không tác động đến chức năng

Sau khi thêm hiệu ứng: nút bấm, popup, form, API, thanh toán, đăng nhập phải hoạt động bình thường.

## Nguyên tắc 9 — Mọi hiệu ứng phải có namespace riêng

```
.cqd-animation
.cqd-fade-up
.cqd-hover-card
.cqd-scroll-reveal
```

Không dùng class chung dễ xung đột.

## Nguyên tắc 10 — Ưu tiên tạo file riêng

```
animations.css
animations.js
motion.ts
effects.ts
```

Không chèn trực tiếp vào code hệ thống nếu không cần thiết.

## Nguyên tắc 11 — Responsive 100%

Hiệu ứng mới phải hoạt động trên Desktop, Laptop, Tablet, Android, iPhone.

## Nguyên tắc 12 — Kiểm tra trước khi thực hiện

AI phải tự hỏi 5 câu (xem đầu file). Nếu bất kỳ câu nào là CÓ → không được thực hiện.

---

## Kết quả cuối cùng mọi lần

✓ Không sửa code cũ · Không xóa code cũ · Không ghi đè code cũ
✓ Không làm lệch giao diện · Không đổi font · Không ảnh hưởng chức năng
✓ Không ảnh hưởng responsive · Chỉ bổ sung hiệu ứng mới độc lập
✓ Có thể gỡ bỏ dễ dàng · Website hoạt động ổn định 100%

---

## Thêm nguyên tắc mới

Khi user nói "thêm nguyên tắc mới" hoặc "sửa giao diện" kèm yêu cầu mới → append vào cuối file này, đánh số tiếp theo (Nguyên tắc 13, 14...).
