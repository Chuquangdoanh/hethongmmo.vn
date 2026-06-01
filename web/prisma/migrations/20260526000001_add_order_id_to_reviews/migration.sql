-- Xóa dữ liệu test cũ trước khi đổi unique constraint
-- (review cũ không có order_id, không thể migrate dữ liệu)
DELETE FROM "reviews";

-- Bỏ unique constraint cũ (userId, productType, productId)
DROP INDEX IF EXISTS "reviews_user_id_product_type_product_id_key";

-- Thêm cột order_id (NOT NULL, UNIQUE)
ALTER TABLE "reviews" ADD COLUMN "order_id" UUID NOT NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_key" UNIQUE ("order_id");

-- Foreign key từ reviews → orders
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Index bổ sung
CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews"("user_id");
