-- Giảm giá "Đại lý" — chỉ áp dụng Tài nguyên MMO / Kho nguyên liệu / Khương FB
-- 0 = không phải đại lý; > 0 = % cố định, admin gán tay, không phụ thuộc totalDeposited
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift/lỗi như các migration trước)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "agent_discount_percent" INTEGER NOT NULL DEFAULT 0;
