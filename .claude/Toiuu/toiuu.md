# Tối ưu tốc độ tải trang — Runbook chi tiết

> **Dành cho:** Chu Quang Doanh
> **Áp dụng cho:** Storefront TMĐT (nhiều card sản phẩm, font Be Vietnam Pro)
> **Triết lý:** Đo trước → fix theo ưu tiên → đo lại. Không đoán mò.

---

## Cách dùng file này

File chia thành **6 khối tối ưu độc lập** + **1 script gộp** + **1 checklist QA**.
Làm theo đúng thứ tự ưu tiên bên dưới — riêng "Ảnh + Cache" thường đã đem lại 50–70% cải thiện.

**Thứ tự ưu tiên:**
`Đo (Bước 0)` → `Ảnh (1)` → `Nén & Cache server (3)` → `Font (2)` → `JS/CSS (4)` → `Database (5)`

> ⚠️ Một số lệnh cần thay đúng đường dẫn / domain / stack thực tế của anh. Chỗ nào cần thay em đánh dấu `# ⟵ SỬA`.

---

## Bước 0 — Đo lường (BẮT BUỘC làm đầu tiên)

Không đo thì fix mù. Chạy Lighthouse để biết nghẽn ở đâu.

```bash
# Cài Lighthouse
npm install -g lighthouse

# Đo trang sản phẩm
lighthouse https://mmostore.store/marketplace/cung-cap-account-lien-quan-gia-re \
  --output html --output-path ./report.html --view
```

**Nhìn 3 chỉ số Core Web Vitals:**

| Chỉ số | Nghĩa | Nếu đỏ thì xử lý ở |
|--------|-------|-------------------|
| **LCP** | Ảnh/tiêu đề lớn load chậm | Khối 1 (Ảnh), Khối 3 (Cache) |
| **CLS** | Layout nhảy lung tung | Khối 1 (`width/height`), Khối 2 (Font) |
| **INP** | Bấm bị delay, lag | Khối 4 (JS) |

Ghi lại điểm số ban đầu để so sánh sau khi tối ưu.

---

## Khối 1 — Tối ưu ảnh (đòn mạnh nhất cho site nhiều card)

Ảnh thường chiếm **60–70% trọng lượng trang**. Đây là nơi cải thiện nhiều nhất.

### 1.1 Nén & chuyển sang WebP

```bash
npm install -g sharp-cli

# Chuyển toàn bộ ảnh sang WebP (nhẹ hơn JPG/PNG ~30%)
sharp -i ./images/*.{jpg,png} -o ./images/webp/ -f webp -q 80   # ⟵ SỬA đường dẫn
```

### 1.2 Sửa thẻ `<img>` trong HTML

Thêm cho **mọi** ảnh sản phẩm:

```html
<img src="product.webp"
     loading="lazy"              <!-- ảnh ngoài màn hình mới tải -->
     decoding="async"
     width="200" height="200">   <!-- BẮT BUỘC: chống CLS, layout không nhảy -->
```

> **Lưu ý quan trọng:** Ảnh **trong màn hình đầu tiên** (above-the-fold) thì **KHÔNG** dùng `loading="lazy"` — để nó tải ngay, cải thiện LCP.

---

## Khối 2 — Font Be Vietnam Pro

Font tiếng Việt nặng nếu load sai cách.

### 2.1 Preconnect trong `<head>`

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 2.2 Cấu hình `font-display` trong CSS

```css
@font-face {
  font-family: 'Be Vietnam Pro';
  font-display: swap;   /* hiện chữ ngay bằng font hệ thống, đỡ "chữ trắng" */
  /* ... */
}
```

### 2.3 Chỉ tải weight cần dùng

Chỉ tải các weight thực sự dùng (vd: 400, 600, 700) — **đừng tải cả 9 weight**.

---

## Khối 3 — Nén + Cache (cấu hình server)

Làm tay trên file cấu hình server. Ví dụ cho **Nginx**:

```nginx
# --- Nén ---
gzip on;
gzip_types text/css application/javascript image/svg+xml application/json;
# (Brotli tốt hơn Gzip nếu module có sẵn)

# --- Cache file tĩnh 1 năm ---
location ~* \.(js|css|webp|woff2|png|jpg|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Sau khi sửa, kiểm tra cú pháp và reload:

```bash
sudo nginx -t && sudo nginx -s reload
```

> Nếu anh dùng **Apache**, tương đương là module `mod_deflate` (nén) + `mod_expires` (cache) trong `.htaccess`. Báo em biết để viết đúng.

---

## Khối 4 — JS / CSS (giảm và hoãn)

### 4.1 Hoãn JS không cần chạy ngay

```html
<script src="app.js" defer></script>
```

### 4.2 Build: minify + tách code

```bash
# Nếu dùng Vite (khuyên dùng cho TMĐT)
npm run build   # tự minify, tree-shaking, code-splitting
```

### 4.3 Dọn rác

- Gỡ thư viện không dùng (jQuery thừa, plugin nặng, framework không cần).
- Mỗi KB JS đều phải parse → ảnh hưởng INP (cảm giác "bấm bị lag").

---

## Khối 5 — Database (thường là thủ phạm thật sự)

Trang card load chậm thường vì **query chậm**, không phải frontend.

### 5.1 Tìm query chậm (MySQL)

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;   -- log mọi query chạy > 1 giây
```

### 5.2 Soi một query cụ thể

```sql
EXPLAIN SELECT * FROM products WHERE category_id = 5;
-- Nếu cột "type" = ALL (full scan) → thiếu index trên cột đang lọc
```

### 5.3 Nguyên tắc bắt buộc

- **Đánh index** cho cột hay dùng để lọc / join (vd `category_id`, `status`).
- **Không `SELECT *`** — chỉ lấy đúng cột cần hiển thị.
- **Phân trang** thay vì load hết 56+ card một lúc (`LIMIT` + `OFFSET` hoặc cursor).

---

## Script gộp — Chạy một lệnh là xong (phần tự động hóa)

Gộp các bước **chạy được trên máy** vào một script. Lưu thành file `toiuu.sh`:

```bash
#!/bin/bash
set -e   # gặp lỗi là dừng ngay

echo "▶ [1/5] Cài tool..."
npm i -g lighthouse sharp-cli

echo "▶ [2/5] Nén ảnh sang WebP..."
sharp -i ./images/*.{jpg,png} -o ./images/webp/ -f webp -q 80   # ⟵ SỬA đường dẫn

echo "▶ [3/5] Build & minify..."
npm run build

echo "▶ [4/5] Reload Nginx (cần đã cấu hình sẵn Khối 3)..."
sudo nginx -t && sudo nginx -s reload

echo "▶ [5/5] Đo tốc độ..."
lighthouse https://mmostore.store/marketplace/cung-cap-account-lien-quan-gia-re \
  --output html --output-path ./report.html --view

echo "✓ Xong. Mở report.html để xem kết quả."
```

**Chạy lần đầu:**

```bash
chmod +x toiuu.sh && ./toiuu.sh
```

**Các lần sau:**

```bash
./toiuu.sh
```

> **Lưu ý thẳng thắn:** Script này chỉ tự động hóa được phần **trên máy** (nén ảnh, build, reload server). Ba việc sau **vẫn phải làm tay một lần** vì chúng sửa nội dung file:
> 1. Sửa thẻ `<img>` trong HTML (Khối 1.2)
> 2. Cấu hình `<head>` + CSS font (Khối 2)
> 3. Đánh index + sửa query trong DB (Khối 5)
>
> Làm tay xong một lần thì sau đó script lo phần lặp lại.

---

## Checklist QA (kiểm tra trước khi nghiệm thu)

### Ảnh
- [ ] Toàn bộ ảnh sản phẩm đã chuyển WebP
- [ ] Ảnh ngoài màn hình có `loading="lazy"`
- [ ] Ảnh above-the-fold **KHÔNG** lazy
- [ ] Mọi `<img>` đều có `width` + `height`

### Font
- [ ] Có `preconnect` tới font server
- [ ] `font-display: swap`
- [ ] Chỉ tải weight đang dùng

### Server
- [ ] Bật Gzip/Brotli
- [ ] Cache file tĩnh (`Cache-Control: immutable`)
- [ ] `nginx -t` pass trước khi reload

### JS/CSS
- [ ] Script không thiết yếu có `defer`
- [ ] Đã build minify + code-splitting
- [ ] Gỡ thư viện thừa

### Database
- [ ] Đã đánh index cột lọc/join
- [ ] Không còn `SELECT *` ở query hiển thị card
- [ ] Có phân trang

### Nghiệm thu cuối
- [ ] Chạy lại Lighthouse, so điểm với Bước 0
- [ ] LCP, CLS, INP đều ở vùng "Good" (xanh)
- [ ] Test thật trên mobile + mạng 3G/4G mô phỏng

---

## Phần cần anh xác nhận để chính xác 100%

File này dùng ví dụ chung (Nginx + Vite). Để em viết **đúng môi trường thật** của anh, cho em biết:

1. **Backend:** PHP thuần / Laravel / Node / WordPress?
2. **Server:** Nginx hay Apache?
3. **Build tool:** Vite / Webpack / không dùng?

Có đủ 3 thông tin này, em sẽ thay phần `npm run build` và config server thành lệnh khớp 100% với hệ thống của anh.