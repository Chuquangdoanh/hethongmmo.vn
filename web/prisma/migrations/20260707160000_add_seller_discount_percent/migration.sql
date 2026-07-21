-- Giảm giá cho sản phẩm Seller — hệ thống chịu 100% chi phí, seller vẫn nhận đủ giá gốc
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift/lỗi như các migration trước)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_discount_percent" INTEGER NOT NULL DEFAULT 0;
