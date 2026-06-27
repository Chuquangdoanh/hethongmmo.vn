---
# ⚠️ ĐỌC FILE NÀY TRƯỚC TIÊN — TRƯỚC KHI LÀM BẤT KỲ VIỆC GÌ
---

# Quy tắc bất biến: Đóng băng & Chính xác

> **Đây là xác nhận chính thức từ chủ dự án.**
> Mọi phiên làm việc đều phải tuân thủ hoàn toàn, không có ngoại lệ.

---

## PHẦN 1 — ĐÓNG BĂNG CHỨC NĂNG (Freeze)

### Quy tắc cốt lõi

**KHÔNG được sửa, thay đổi, tái cấu trúc, hay "cải thiện" bất kỳ chức năng đang hoạt động nào**, trừ hai trường hợp duy nhất:

| Trường hợp được phép sửa | Điều kiện bắt buộc |
|--------------------------|-------------------|
| **Bug đã xác nhận** | Có lỗi rõ ràng, có thể tái hiện được |
| **Lỗ hổng bảo mật** | Đã xác định CVE / attack vector cụ thể |

### Các hành động bị cấm tuyệt đối

- ❌ Refactor code "cho đẹp hơn" khi chức năng đang hoạt động
- ❌ Đổi tên biến, hàm, file mà không có lý do kỹ thuật rõ ràng
- ❌ Tối ưu hoá hiệu năng khi chưa có số liệu chứng minh bottleneck
- ❌ Thay đổi UI/UX của tính năng đã có khi không được yêu cầu
- ❌ Cập nhật dependency khi không liên quan đến task hiện tại
- ❌ Sửa logic "tiện tay" trong khi đang làm việc khác
- ❌ Xóa code "có vẻ" không dùng đến mà không xác nhận từ user

### Khi phát hiện vấn đề ngoài phạm vi task

Nếu trong quá trình làm task A, phát hiện code có vấn đề ở chức năng B:
1. **Hoàn thành task A trước**
2. **Báo cáo** cho user về vấn đề phát hiện ở B
3. **Chờ xác nhận** trước khi sửa B — không tự ý sửa

---

## PHẦN 2 — KHÔNG XÓA CHỨC NĂNG CŨ KHI THÊM MỚI

### Quy tắc

Khi thêm chức năng mới, mọi code cũ **phải được giữ nguyên 100%**:

- ❌ Không xóa function cũ dù "có vẻ" bị thay thế
- ❌ Không gộp/merge logic cũ vào logic mới mà không được yêu cầu
- ❌ Không thay đổi API response structure của endpoint đã có
- ❌ Không đổi tên / move file của chức năng cũ
- ✅ Chỉ **thêm** — file mới, endpoint mới, component mới, field mới

### Kiểm tra trước khi thêm

Trước mỗi lần thêm chức năng mới, tự hỏi:
1. Chức năng này có bị overlap với chức năng đã có không?
2. Code mới có gọi / import code cũ theo cách thay đổi behavior của code cũ không?
3. Nếu xóa code mới đi, mọi thứ cũ có hoạt động y nguyên không?

Nếu câu 2 hoặc 3 là **CÓ** → báo user trước khi tiến hành.

---

## PHẦN 3 — ĐỌC KỸ TRƯỚC KHI SỬA

### Quy trình bắt buộc trước mỗi thay đổi

```
1. ĐỌC toàn bộ file cần sửa — không chỉ đọc đoạn có vấn đề
2. ĐỌC các file import vào file đó (1 cấp)
3. HIỂU mục đích của component/function TRƯỚC khi chỉnh
4. XÁC ĐỊNH chính xác dòng nào cần thay đổi
5. CHỈ SỬA đúng những gì được yêu cầu — không sửa thêm
```

### Không được làm theo kiểu "đoán mò"

- Không assume behavior của một function mà chưa đọc implementation
- Không sửa dựa trên tên function/variable — phải đọc body
- Không copy-paste từ nơi khác mà chưa kiểm tra tương thích context

### Khi không chắc chắn

Nếu không chắc chắn 100% về tác động của thay đổi → **hỏi user** thay vì đoán.

---

## PHẦN 4 — CHECKLIST TỰ KIỂM TRA (chạy trước mỗi task)

```
[ ] Task này có yêu cầu sửa chức năng đang hoạt động không?
    → Nếu CÓ: chỉ sửa nếu có bug hoặc lỗ hổng bảo mật được xác nhận

[ ] Task này có xóa / thay thế code cũ không?
    → Nếu CÓ: báo user và chờ xác nhận

[ ] Tôi đã đọc toàn bộ file liên quan chưa?
    → Nếu CHƯA: đọc trước khi viết bất kỳ dòng code nào

[ ] Thay đổi của tôi có ảnh hưởng đến chức năng khác không?
    → Nếu CÓ: liệt kê rõ ràng cho user biết trước khi thực hiện
```

---

## Lý do tồn tại của rule này

Rule này được xác nhận trực tiếp từ chủ dự án nhằm:
- Bảo vệ các chức năng đang hoạt động ổn định
- Tránh regression do thay đổi ngoài phạm vi
- Đảm bảo mọi thay đổi đều có mục đích rõ ràng và được kiểm soát
- Giữ lịch sử code sạch và có thể audit được

**Không có AI judgement call nào được override rule này.**
