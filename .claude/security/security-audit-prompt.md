# 🛡️ MASTER PROMPT — Kiểm Tra Bảo Mật Project

> Cách dùng: Điền các mục trong `[...]` ở **PHẦN 1**, rồi gửi toàn bộ file này cho AI (hoặc làm checklist tự chạy). AI sẽ trả về lệnh cụ thể + cấu hình phòng thủ theo đúng stack của anh.

---

## PHẦN 1 — THÔNG TIN PROJECT (điền vào đây)

```
- Tên project:        [ví dụ: Hệ thống quản lý đơn hàng]
- Nền tảng backend:   [Node/Express | Laravel | Django | Spring | ...]
- Web server:         [Nginx | Apache | Caddy | ...]
- Database:           [MySQL | PostgreSQL | MongoDB | ...]
- Môi trường test:    [staging.your-site.com]   ← KHÔNG dùng production
- URL/Endpoint chính: [https://staging.your-site.com]
- Endpoint nhạy cảm:  [/api/login, /api/payment, /api/search?id=]
- Tôi có quyền:       [Sở hữu / được ủy quyền test hệ thống này — Có]
```

---

## PHẦN 2 — YÊU CẦU AI

Bạn là chuyên gia bảo mật ứng dụng web (AppSec) theo chuẩn **OWASP Top 10**.
Dựa trên thông tin ở PHẦN 1, hãy thực hiện đầy đủ các hạng mục dưới đây.
Với **mỗi hạng mục**, trả về theo cấu trúc:

1. **Lệnh chạy** — copy-paste được ngay, đã thay sẵn URL/endpoint của tôi.
2. **Kết quả mong đợi** — con số/dấu hiệu nào là an toàn, dấu hiệu nào là lỗ hổng.
3. **Cách gia cố** — config cụ thể theo đúng stack tôi khai báo (kèm đoạn code/file cấu hình).

---

### A. RATE LIMIT
- Bắn 100–1000 request liên tục vào endpoint nhạy cảm, đo tỉ lệ `429 Too Many Requests`.
- Kiểm tra header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.
- Kết luận: ngưỡng chặn là bao nhiêu req/giây? Có chặn theo IP / theo user / theo token không?
- Gia cố: đề xuất middleware rate-limit đúng stack (ví dụ `express-rate-limit`, Laravel `throttle`, Nginx `limit_req`).

### B. SỨC CHỊU TẢI & KHÁNG DDOS
- Mô phỏng tải duy trì (sustained load) và burst đột biến.
- Đo: response time trung bình, p95/p99, tỉ lệ lỗi khi quá tải.
- Đánh giá: server fail "êm" (trả `503` có kiểm soát) hay sập hẳn?
- Gia cố: đề xuất layer chống DDoS — Cloudflare/WAF, `fail2ban`, connection limit, timeout hợp lý.

### C. QUÉT LỖ HỔNG OWASP
- Quét port & service đang mở (phát hiện service thừa, version cũ).
- Quét lỗ hổng web server tự động.
- Baseline scan theo OWASP ZAP.
- Liệt kê lỗ hổng theo mức độ: Critical / High / Medium / Low.

### D. SQL INJECTION & XSS
- Test SQLi trên các endpoint có tham số (`?id=`, form input).
- Test phản xạ XSS trên ô input/search.
- Với mỗi lỗ hổng tìm thấy: chỉ rõ payload, vị trí, và cách vá (parameterized query, output encoding, input validation).

### E. SECURITY HEADERS
- Kiểm tra: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- Header nào thiếu → đưa giá trị cấu hình khuyến nghị, đúng web server tôi dùng.

### F. TLS / SSL
- Kiểm tra phiên bản TLS, cipher yếu, chứng chỉ hết hạn.
- Đề xuất cấu hình TLS đạt rating A trở lên.

---

## PHẦN 3 — RÀNG BUỘC AN TOÀN (AI phải tuân thủ)
- Chỉ tạo lệnh test trên môi trường tôi sở hữu/được ủy quyền (PHẦN 1).
- Lệnh stress test phải có cảnh báo nếu cường độ có thể gây gián đoạn dịch vụ.
- KHÔNG đưa kỹ thuật khai thác để tấn công bên thứ ba; chỉ phục vụ phòng thủ.
- Ưu tiên giải thích "vì sao" mỗi lỗ hổng nguy hiểm, không chỉ liệt kê lệnh.

---

## PHẦN 4 — ĐẦU RA CUỐI CÙNG (yêu cầu AI tổng hợp)
Sau khi đi hết A–F, hãy tạo:
1. **Bảng tổng hợp rủi ro**: Hạng mục | Mức độ | Trạng thái | Việc cần làm.
2. **Script `security-check.sh`** gộp tất cả lệnh test, chạy 1 lần ra report.
3. **Top 3 việc ưu tiên vá ngay** dựa trên mức độ nghiêm trọng.
